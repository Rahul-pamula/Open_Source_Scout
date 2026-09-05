import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSecret } from '../_shared/secrets.ts'
import { autonomousWorker } from '../_shared/worker.ts'

serve(async (req: Request) => {
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

    const authHeader = req.headers.get('Authorization') || undefined
    const { userId, profile, count, explicit } = await req.json()

    if (!userId || !profile) {
      return new Response(JSON.stringify({ error: 'userId and profile are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const processCount = count ? parseInt(count) : 5
    const isExplicit = explicit === true

    // Trigger the worker without awaiting its completion (fire and forget pattern)
    // In Edge Functions, Deno might terminate if we don't await, but Edge Functions support EdgeRuntime.waitUntil
    if (typeof (EdgeRuntime as any) !== 'undefined' && (EdgeRuntime as any).waitUntil) {
       (EdgeRuntime as any).waitUntil(
         autonomousWorker.runWorker(authHeader, userId, profile, processCount, isExplicit).catch(err => {
           console.error('[worker-function] Unhandled Error:', err)
         })
       )
    } else {
       // Fallback for local testing if EdgeRuntime is not fully emulated
       autonomousWorker.runWorker(authHeader, userId, profile, processCount, isExplicit).catch(err => {
           console.error('[worker-function] Unhandled Error:', err)
       })
    }

    return new Response(JSON.stringify({ message: 'Worker triggered successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[worker-function] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
