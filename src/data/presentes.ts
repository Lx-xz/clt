'use client'

import { supabase } from './supabase'
import { idAtual } from '@/game/ids'
import type { CardId } from '@/game/types'

/**
 * Presentes do admin (v0.40): uma carta dada a um jogador, que aparece na
 * tela dele. O banco guarda só o RECADO (`presentes`); a carta entra na
 * coleção pelo site, num envelope que a pessoa abre — a coleção mora em
 * `saves.collection`, e é o site que a escreve. Quem decide quem pode dar é
 * o banco (`admin_enviar_presente` recusa quem não é admin).
 */

export interface Presente {
  id: string
  carta: CardId
  mensagem: string | null
}

/** Sem a função no banco (o `schema.sql` da v0.40 não rodou), nada a
 *  mostrar — em vez de um erro na cara de quem só abriu o início. */
export async function meusPresentes(): Promise<Presente[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('meus_presentes')
  if (error || !Array.isArray(data)) return []
  return (data as { id: string; carta: string; mensagem: string | null }[]).map((p) => ({
    id: p.id,
    carta: idAtual(p.carta),
    mensagem: p.mensagem,
  }))
}

/** Verdadeiro uma vez só por presente: é o que impede duas abas de porem a
 *  mesma carta duas vezes na coleção. */
export async function receberPresente(id: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('receber_presente', { p_id: id })
  return !error && data === true
}

export async function enviarPresente(nick: string, carta: CardId, mensagem: string): Promise<{ ok: boolean; erro?: string }> {
  if (!supabase) return { ok: false, erro: 'Banco não configurado.' }
  const { error } = await supabase.rpc('admin_enviar_presente', { p_nick: nick, p_carta: carta, p_mensagem: mensagem })
  if (!error) return { ok: true }
  if (error.code === 'PGRST202') return { ok: false, erro: 'Falta rodar o supabase/schema.sql (a função de presentes não existe).' }
  return { ok: false, erro: error.message }
}
