import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bnuqckufinxnlndsqsfq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJudXFja3VmaW54bmxuZHNxc2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkyNTAsImV4cCI6MjA3MzAwNTI1MH0.18_NvNga7aTA4P4LGGuxEVt8Fl4tUEzDDaCs6Wm8eHw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)