import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { githubAdapter } from '../_shared/github.ts'
import { filterEngine } from '../_shared/filter.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require authentication (even for search, to prevent abuse of the backend)
    await requireAuth(req)

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { query, limit = 10 } = await req.json()
    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing "query" parameter in body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const rawIssues = await githubAdapter.searchIssues(query, limit)
    const eligibleIssues = filterEngine.filterEligibleIssues(rawIssues)

    return new Response(JSON.stringify({
      meta: {
        total_fetched: rawIssues.length,
        total_eligible: eligibleIssues.length,
        filtered_out: rawIssues.length - eligibleIssues.length
      },
      data: eligibleIssues
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[search-function] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
