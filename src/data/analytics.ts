import type { DayLog } from '@/game/types'
import { supabase } from './supabase'

/**
 * Leitura das quatro funções agregadas do banco (veja supabase/schema.sql).
 * Nenhuma delas lê `players` ou `runs` direto — o site nunca ganhou select
 * nessas tabelas, só execute nas funções, que devolvem só o necessário.
 */

export interface EstatisticasGerais {
  jogadores: number
  jogadores_que_jogaram: number
  total_runs: number
  vitorias: number
  burnouts: number
  demissoes: number
  despejos: number
  dia_medio: number | null
}

export async function buscarEstatisticasGerais(): Promise<EstatisticasGerais> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('estatisticas_gerais').single()
  if (error) throw new Error(error.message)
  return data as EstatisticasGerais
}

export interface LinhaRanking {
  nick: string
  vitorias: number
  derrotas: number
  total_runs: number
  melhor_dinheiro: number
  ultima_partida: string
}

export async function buscarRanking(): Promise<LinhaRanking[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('ranking')
  if (error) throw new Error(error.message)
  return (data as LinhaRanking[]) ?? []
}

export interface LinhaMeuJogo {
  id: number
  ended_at: string
  outcome: 'vitoria' | 'burnout' | 'demissao' | 'despejo'
  day: number
  money: number
  week_reached: number
}

export async function buscarMeusJogos(playerId: string): Promise<LinhaMeuJogo[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('meus_jogos', { p_player_id: playerId })
  if (error) throw new Error(error.message)
  return (data as LinhaMeuJogo[]) ?? []
}

export interface DetalheDoJogo extends LinhaMeuJogo {
  details: { history: DayLog[] } | null
}

/** Devolve null quando a run não existe ou não é deste jogador. */
export async function buscarDetalheDoJogo(runId: number, playerId: string): Promise<DetalheDoJogo | null> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase
    .rpc('jogo_detalhe', { p_run_id: runId, p_player_id: playerId })
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as DetalheDoJogo) ?? null
}
