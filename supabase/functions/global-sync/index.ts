// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { syncService } from '../_shared/sync.ts'
import { getSecret } from '../_shared/secrets.ts'

const SUPABASE_URL = getSecret('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = getSecret('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Ensure this is called by an authorized service (like pg_net cron)
  // For simplicity, we check if the auth header matches the service role key
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // 1. Get all unique users who have active tracked issues
    const { data: activeIssues, error: fetchError } = await supabase
      .from('tracked_issues')
      .select('user_id')
      .in('state', ['ENGAGED', 'ASSIGNED'])
    
    if (fetchError) throw fetchError;

    if (!activeIssues || activeIssues.length === 0) {
      return new Response(JSON.stringify({ message: 'No active issues to sync' }), { status: 200 })
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(activeIssues.map((issue: any) => issue.user_id))];

    // 2. Fetch profiles for these users to get their github_handles
    const { data: profiles, error: profileError } = await supabase
      .from('users')
      .select('id, github_handle')
      .in('id', uniqueUserIds)

    if (profileError) throw profileError;

    // 3. Trigger syncs for each user
    const results = [];
    for (const profile of profiles || []) {
      if (profile.github_handle) {
         try {
            const { health } = await syncService.startSync(profile.id, profile.github_handle);
            results.push({ userId: profile.id, status: 'success', health });
         } catch (e: any) {
            results.push({ userId: profile.id, status: 'error', error: e.message });
         }
      }
    }

    return new Response(JSON.stringify({ message: 'Global sync completed', results }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('[global-sync] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
