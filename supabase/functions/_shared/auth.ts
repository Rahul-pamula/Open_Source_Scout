import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2'
import { getSecret } from './secrets.ts'

export async function requireAuth(req: Request): Promise<User> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing Authorization header')
  }

  const supabaseUrl = getSecret('SUPABASE_URL')
  const supabaseAnonKey = getSecret('SUPABASE_ANON_KEY')

  // Create client with the user's token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error(`Unauthorized: ${error?.message || 'Invalid token'}`)
  }

  return user
}
