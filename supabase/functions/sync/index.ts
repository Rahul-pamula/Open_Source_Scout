import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { syncService } from '../_shared/sync.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Trigger the sync process
    // We pass req.headers to allow passing a JWT for authenticated syncs, or fall back to service role.
    const authHeader = req.headers.get('Authorization') || undefined
    
    // Similarly to worker, we run it in background for Edge compatibility if needed,
    // but sync is often cron triggered. We will await it unless it times out.
    // Given Deno timeout is usually 5-60s depending on plan, awaiting might be okay for small syncs.
    // For now we await it so the caller knows it succeeded.
    await syncService.triggerSync(authHeader)

    return new Response(JSON.stringify({ message: 'Sync completed successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[sync-function] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
