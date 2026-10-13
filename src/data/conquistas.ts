'use client'

import { faltaFuncao } from './jogadores'
import { creditarConquistas } from '@/game/tokens'
import type { Collection } from '@/game/types'
import { supabase } from './supabase'

/**
 * Conquistas. A lista e a checagem moram no banco (`conferir_conquistas()`),
 * que lê as runs e a coleção — o motor do jogo não conta nada a mais por
 * causa delas. O site só pede para conferir depois de registrar uma run, e
 * desenha o resultado.
 */
export interface Conquista {
  id: string
  nome: string
  descricao: string
  icone: string
  /** Null na que ainda não foi ganha. */
  ganha_em: string | null
  /** v0.34 (banco sem o `schema.sql` novo não manda): a oculta só tem nome
   *  depois de ganha; `tokens` é o que ela paga; `grupo` e `nivel` (1 a 3,
   *  bronze a ouro) juntam as que sobem de nível. */
  oculta?: boolean
  tokens?: number
  grupo?: string | null
  nivel?: number | null
}

/**
 * Paga os tokens das conquistas ganhas que ainda não pagaram, e devolve a
 * coleção nova (a mesma, se não havia nada a pagar). Quem chama sobe a
 * coleção. O saldo mora na coleção, e a conquista no banco: a ponte é aqui.
 */
export function pagarConquistas(colecao: Collection, lista: Conquista[]): Collection {
  return creditarConquistas(
    colecao,
    lista.filter((c) => c.ganha_em).map((c) => ({ id: c.id, tokens: c.tokens ?? 0 })),
  )
}

/**
 * Confere e grava o que faltava; devolve os ids das conquistas NOVAS. Recebe
 * o id porque o convidado não tem `auth.uid()`. Falhar aqui não é grave —
 * a próxima conferência pega o que esta perdeu —, então o erro é engolido.
 */
export async function conferirConquistas(playerId: string): Promise<string[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('conferir_conquistas', { p_player_id: playerId })
  if (error) return []
  return (data as string[] | null) ?? []
}

/** Todas, com data nas ganhas. Null quando o banco ainda não as tem. */
export async function minhasConquistas(playerId: string): Promise<Conquista[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('minhas_conquistas', { p_player_id: playerId })
  if (error) {
    if (faltaFuncao(error)) return null
    throw new Error(error.message)
  }
  return (data as Conquista[]) ?? []
}

/** As que UMA partida deu, para o recibo do replay. Vazio quando o banco
 *  ainda não tem a função: o recibo só deixa a linha de fora. */
export async function conquistasDaRun(runId: string): Promise<Conquista[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('conquistas_da_run', { p_run_id: runId })
  if (error) return []
  return (data as Conquista[]) ?? []
}

/** Só as ganhas, de outra pessoa. */
export async function conquistasPublicas(nick: string): Promise<Conquista[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('conquistas_publicas', { p_nick: nick })
  if (error) {
    if (faltaFuncao(error)) return null
    throw new Error(error.message)
  }
  return (data as Conquista[]) ?? []
}
