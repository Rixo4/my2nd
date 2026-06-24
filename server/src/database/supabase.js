import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey)

let supabase = null

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    console.log('🔌 Supabase Client initialized successfully.')
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message)
  }
} else {
  console.warn('⚠️ Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are not set. Database operations will use fallback modes.')
}

/**
 * Get the singleton Supabase client.
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function getSupabase() {
  return supabase
}
