import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { syncService } from '../_shared/sync.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await requireAuth(req)

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Trigger the sync process
    // We pass req.headers to allow passing a JWT for authenticated syncs, or fall back to service role.
    const authHeader = req.headers.get('Authorization') || undefined
    const { profile } = await req.json()
    
    if (!profile || !profile.github_handle) {
      return new Response(JSON.stringify({ error: 'GitHub handle missing in profile' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { snapshots, health } = await syncService.startSync(user.id, profile.github_handle)

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
