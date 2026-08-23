import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { trackingService } from '../_shared/tracking.ts'
import type { TrackedIssueState } from '../_shared/types.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const user = await requireAuth(req)
    const userId = user.id

    const body = await req.json()
    const { action } = body
    const authHeader = req.headers.get('Authorization') || undefined

    if (action === 'list') {
        const { state, limit = 50 } = body
        const issues = await trackingService.getTrackedIssues(authHeader, userId, state, limit)
        return new Response(JSON.stringify({ data: issues }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (action === 'save') {
        const { issueData } = body
        if (!issueData) throw new Error('Missing issueData payload')
        
        const tracked = await trackingService.saveIssue(authHeader, userId, issueData)
        return new Response(JSON.stringify({ data: tracked }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (action === 'update_state') {
        const { id, state } = body
        if (!id || !state) throw new Error('Missing tracking ID or state')
        
        await trackingService.updateIssueState(authHeader, id, state)
        return new Response(JSON.stringify({ message: 'State updated successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('[tracking-function] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
