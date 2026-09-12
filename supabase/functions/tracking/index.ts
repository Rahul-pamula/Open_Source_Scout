import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { trackingService } from '../_shared/tracking.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const user = await requireAuth(req)
    const userId = user.id

    const body = await req.json()
    const { action } = body
    const authHeader = req.headers.get('Authorization') || undefined

    if (action === 'list') {
      const { state, limit = 50 } = body
      const issues = await trackingService.getTrackedIssues(authHeader, userId, state, limit)
      return new Response(
        JSON.stringify({ data: issues }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'save') {
      const { issueData } = body
      if (!issueData) throw new Error('Missing issueData payload')
      const tracked = await trackingService.saveIssue(authHeader as string, userId, issueData)
      return new Response(
        JSON.stringify({ data: tracked }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'fetch_and_save') {
      const { github_url } = body
      if (!github_url) throw new Error('Missing github_url')
      
      const urlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)$/
      const match = github_url.match(urlPattern)
      if (!match) throw new Error('Invalid GitHub issue URL format. Must be https://github.com/owner/repo/issues/number')
      
      const [, owner, repo, numStr] = match
      const number = parseInt(numStr, 10)
      
      const { githubAdapter } = await import('../_shared/github.ts')
      const rawIssue = await githubAdapter.fetchIssue(owner, repo, number)
      if (!rawIssue) throw new Error('Could not fetch issue from GitHub.')

      const existing = await trackingService.getTrackedIssues(authHeader as string, userId, undefined, 1000)
      if (existing.some((i: any) => i.github_issue_url === rawIssue.url)) {
        throw new Error('This issue is already in your Scout pipeline.')
      }

      const issueData = {
        github_issue_url: rawIssue.url,          // NormalizedIssue uses .url, not .html_url
        title: rawIssue.title,
        repo_name: rawIssue.repoName,             // NormalizedIssue uses .repoName, not repo_name
        match_score: null,
        claimed_via: 'EXTERNAL',
        initial_state: 'ENGAGED'
      }
      
      const tracked = await trackingService.saveIssue(authHeader as string, userId, issueData)
      return new Response(
        JSON.stringify({ data: tracked }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_state') {
      const { id, state } = body
      if (!id || !state) throw new Error('Missing tracking ID or state')
      await trackingService.updateIssueState(authHeader, id, state)
      return new Response(
        JSON.stringify({ message: 'State updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_checklist') {
      const { id, checklist } = body
      if (!id || !checklist) throw new Error('Missing tracking ID or checklist')
      
      await trackingService.updateIssueChecklist(authHeader as string, id, checklist)

      return new Response(
        JSON.stringify({ message: 'Checklist updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const err = error as Error
    console.error('[tracking-function] Error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
