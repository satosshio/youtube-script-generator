import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bnuqckufinxnlndsqsfq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJudXFja3VmaW54bmxuZHNxc2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3MDcyMjMsImV4cCI6MjA0MDI4MzIyM30.FtI1h0U2FeKGhb6bJzVNaHQUqOGdyOxs7V2_VH9-JhI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)