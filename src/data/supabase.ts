import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * O painel do Supabase mostra a URL do projeto em alguns lugares e a URL da
 * API (com /rest/v1) em outros. A supabase-js quer só a do projeto — ela
 * acrescenta o caminho sozinha, e passar o caminho gera /rest/v1/rest/v1.
 * Aceitar as duas formas evita esse erro.
 */
export function normalizarUrl(bruta: string): string {
  return bruta
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage|realtime|functions)\/v\d+$/, '')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? normalizarUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : undefined
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * A chave anon é pública por natureza: o build é estático, então ela vai
 * embutida no bundle. Quem protege os dados é o RLS, não o segredo da chave.
 * A chave service_role nunca pode aparecer aqui.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null

export const bancoConfigurado = Boolean(url && anonKey)
