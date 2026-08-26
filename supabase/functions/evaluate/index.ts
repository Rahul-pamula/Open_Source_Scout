import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { groqEvaluator } from '../_shared/groq.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    await requireAuth(req)

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { issue, issues, profile } = await req.json()
    
    if (!profile || (!issue && !issues)) {
      return new Response(JSON.stringify({ error: 'Either "issue" or "issues" array, plus "profile", are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Backwards compatibility for single issue evaluation
    if (issue && !issues) {
      const result = await groqEvaluator.evaluateIssue(issue, profile)
      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Batch evaluation logic
    if (issues && Array.isArray(issues)) {
      // 1. HARD COST BOUNDARY: Enforce maximum 5 evaluations
      const issuesToEvaluate = issues.slice(0, 5)

      // 2. Sequential evaluation to respect Groq burst limits securely
      const results = []
      for (const item of issuesToEvaluate) {
        try {
          const evalResult = await groqEvaluator.evaluateIssue(item, profile)
          results.push({
            success: true,
            issueId: item.id || item.url, // Identify which issue this applies to
            data: evalResult
          })
        } catch (err: any) {
          console.error(`[evaluate-function] Error evaluating issue ${item.id || item.url}:`, err)
          results.push({
            success: false,
            issueId: item.id || item.url,
            error: err.message || 'Evaluation failed'
          })
        }
      }

      return new Response(JSON.stringify({ data: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('[evaluate-function] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
