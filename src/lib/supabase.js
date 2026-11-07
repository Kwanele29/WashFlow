import { createClient } from '@supabase/supabase-js'

// Vite will read these from the .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// If it fails, this will tell us exactly why in the console
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ MISSING KEYS: Check your .env file and restart the server.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)