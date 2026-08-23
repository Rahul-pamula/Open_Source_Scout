import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { githubAdapter } from '../_shared/github.ts'
import { groqEvaluator } from '../_shared/groq.ts'
import { claimDetectorService } from '../_shared/claimDetector.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    await requireAuth(req)

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'get_issue') {
      const { owner, repo, number } = body
      if (!owner || !repo || !number) throw new Error('Missing owner, repo, or number')
      const issue = await githubAdapter.fetchIssue(owner, repo, parseInt(number))
      return new Response(JSON.stringify({ data: issue }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    if (action === 'get_comments') {
      const { owner, repo, number, page = 1 } = body
      if (!owner || !repo || !number) throw new Error('Missing owner, repo, or number')
      const comments = await githubAdapter.fetchIssueComments(owner, repo, parseInt(number), page)
      return new Response(JSON.stringify({ data: comments }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate_draft') {
      const { issue, comments, profile, intent } = body
      if (!issue || !comments || !profile || !intent) throw new Error('Missing issue, comments, profile, or intent')
      const result = await groqEvaluator.generateCommentDraft(issue, comments, profile, intent)
      return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'claim_status') {
      const { issue, comments } = body
      if (!issue || !comments) throw new Error('Missing issue or comments')
      const isClaimed = claimDetectorService.isIssueClaimed(issue, comments)
      return new Response(JSON.stringify({ data: { isClaimed } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('[dossier-function] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
