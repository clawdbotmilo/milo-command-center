import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cickewgwucqnorzkcyhw.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpY2tld2d3dWNxbm9yemtjeWh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NzgwNiwiZXhwIjoyMDg1NTUzODA2fQ.DA1OHr8lzWu4RV3szgPA--UgLzTbRKpf2fKGOkyD4Ak'

// Use service role key for server-side operations (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export interface DbProject {
  id: string
  name: string
  status: 'DRAFT' | 'FINALIZED' | 'EXECUTING' | 'COMPLETED'
  plan_content: string | null
  original_plan_content: string | null
  orchestration_state: object | null
  created_at: string
  updated_at: string
}
