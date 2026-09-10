import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * A chave anon é pública por natureza: o build é estático, então ela vai
 * embutida no bundle. Quem protege os dados é o RLS, não o segredo da chave.
 * A chave service_role nunca pode aparecer aqui.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null

export const bancoConfigurado = Boolean(url && anonKey)
