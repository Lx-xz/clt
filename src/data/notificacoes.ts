'use client'

import { supabase } from './supabase'

/**
 * O começo das notificações. Hoje elas só aparecem no sininho da barra
 * lateral, mas o banco já registra uma linha a cada resposta do admin, a cada
 * mudança de status e a cada comentário novo nos relatos de quem é admin.
 * Guardar isso desde agora é o que vai permitir, depois, mandar e-mail ou
 * avisar no aparelho sem precisar reconstruir histórico nenhum.
 */
export interface Notificacao {
  id: number
  tipo: string
  titulo: string
  corpo: string | null
  feedback_id: number | null
  lida_em: string | null
  criado_em: string
}

export async function minhasNotificacoes(): Promise<Notificacao[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('minhas_notificacoes')
  // convidado não tem notificação, e o banco responde com erro de permissão:
  // isso aqui é silêncio de propósito, não é falha que mereça tela
  if (error) return []
  return (data as Notificacao[]) ?? []
}

export async function marcarNotificacoesLidas() {
  if (!supabase) return
  await supabase.rpc('marcar_notificacoes_lidas')
}
