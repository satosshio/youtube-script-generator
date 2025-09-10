import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bnuqckufinxnlndsqsfq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJudXFja3VmaW54bmxuZHNxc2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkyNTAsImV4cCI6MjA3MzAwNTI1MH0.18_NvNga7aTA4P4LGGuxEVt8Fl4tUEzDDaCs6Wm8eHw'

// Debug: log which key is being used
console.log('Supabase URL:', supabaseUrl)
console.log('Using environment key?', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
console.log('Key last 20 chars:', supabaseAnonKey.slice(-20))

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    console.log('=== TESTE DE CONEXÃO SUPABASE ===')
    const { data, error } = await supabase.auth.getSession()
    console.log('Teste getSession:', { data, error })
    
    // Test direct API call
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    
    if (response.ok) {
      const settings = await response.json()
      console.log('Settings API response:', settings)
    } else {
      console.error('Settings API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error body:', errorText)
    }
  } catch (err) {
    console.error('Erro no teste de conexão:', err)
  }
}

// Run test after a small delay
setTimeout(testSupabaseConnection, 1000)

// Force bundle change - BUILD v4 RADICAL
console.log('🚀 Bundle version: v4.0 - RADICAL FIX - API key issue SOLVED!')
console.log('🔧 Timestamp:', new Date().toISOString())