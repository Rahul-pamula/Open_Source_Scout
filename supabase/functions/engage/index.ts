import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { githubAdapter } from '../_shared/github.ts'
import { rateLimiterService } from '../_shared/rateLimiter.ts'
import { idempotencyService } from '../_shared/idempotency.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await requireAuth(req)
    // Always use the authenticated user's ID
    const userId = user.id

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { owner, repo, number, draft, intent } = await req.json()
    
    if (!owner || !repo || !number || !draft || !intent) {
      return new Response(JSON.stringify({ error: 'owner, repo, number, draft, and intent are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate intent
    const validIntents = ['REQUEST_ASSIGNMENT', 'PROPOSE_SOLUTION', 'ASK_CLARIFICATION', 'EXPRESS_INTEREST']
    if (!validIntents.includes(intent)) {
      return new Response(JSON.stringify({ error: 'Invalid intent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate issue exists and is open
    const issue = await githubAdapter.fetchIssue(owner, repo, parseInt(number))
    if (issue.state !== 'open') {
      return new Response(JSON.stringify({ error: 'Issue is not open' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authHeader = req.headers.get('Authorization') || undefined

    // 1. Check Rate Limits
    await rateLimiterService.checkRateLimits(authHeader, userId, `${owner}/${repo}`)

    // 2. Generate Key and Acquire Lock (Idempotency)
    const idempotencyKey = await idempotencyService.checkAndLockEngagement(
      authHeader,
      userId,
      `${owner}/${repo}`,
      parseInt(number),
      intent,
      draft
    )

    // 3. Safely post comment
    const result = await githubAdapter.postComment(owner, repo, parseInt(number), draft)
    
    // 4. Record success
    await idempotencyService.recordSuccessfulEngagement(authHeader, idempotencyKey, result.commentId)

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[engage-function] Error:', error)
    
    let status = 500
    if (error.message.includes('Rate Limiter') || error.message.includes('AUTONOMOUS_RATE_LIMIT_REACHED') || error.message.includes('DAILY_AUTONOMOUS_BUDGET_EXHAUSTED')) {
      status = 429
    } else if (error.message.includes('IDEMPOTENCY_ERROR')) {
      status = 409
    } else if (error.message.includes('Unauthorized')) {
      status = 401
    } else if (error.message.includes('GitHub API Error')) {
      status = 502
    }

    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
