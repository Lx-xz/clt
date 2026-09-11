import type { Collection, GameState } from '@/game/types'
import { supabase } from './supabase'

export interface SaveRemoto {
  run: GameState | null
  collection: Collection | null
}

export async function baixarSave(playerId: string): Promise<SaveRemoto> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase
    .from('saves')
    .select('run, collection')
    .eq('player_id', playerId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return { run: (data?.run as GameState) ?? null, collection: (data?.collection as Collection) ?? null }
}

export async function subirSave(playerId: string, run: GameState | null, collection: Collection | null) {
  if (!supabase) return
  const { error } = await supabase
    .from('saves')
    .upsert({ player_id: playerId, run, collection, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** O desfecho como o banco guarda: os quatro do jogo mais o abandono. */
export type DesfechoRegistrado = Exclude<GameState['outcome'], 'jogando'> | 'abandono'

/** A linha de `runs` já montada, pronta para subir (ou esperar na fila). */
export interface RunRegistravel {
  run_id: string
  player_id: string
  outcome: DesfechoRegistrado
  day: number
  money: number
  week_reached: number
  started_at: string
  max_combo: number
  cards_played: number
  warnings: number
  /** Falso na run abandonada sem permissão: conta para a análise, mas não
   *  aparece em "meus jogos" nem no ranking. */
  visivel: boolean
  details: { history: GameState['history'] }
}

export function montarRun(
  playerId: string,
  run: GameState,
  outcome: DesfechoRegistrado,
  visivel: boolean,
): RunRegistravel {
  return {
    run_id: run.runId,
    player_id: playerId,
    outcome,
    day: Math.min(20, Math.max(1, run.day)),
    money: run.money,
    week_reached: Math.min(4, Math.max(1, Math.ceil(run.day / 5))),
    started_at: run.startedAt,
    max_combo: run.maxCombo,
    cards_played: run.cardsPlayed,
    warnings: run.warnings,
    visivel,
    details: { history: run.history },
  }
}

/**
 * Registro append-only de uma run terminada, para balanceamento e para as
 * páginas de ranking/análise/meus-jogos.
 *
 * run_id identifica a run de verdade (gerado uma vez em createRun): o upsert
 * com ignoreDuplicates faz de conta que nunca houve conflito quando a mesma
 * run já foi registrada — evita duplicar a linha se duas abas terminarem a
 * mesma run, ou se a sincronização repetir por uma falha de rede.
 */
export async function enviarRun(linha: RunRegistravel) {
  if (!supabase) throw new Error('Banco não configurado.')
  const { error } = await supabase
    .from('runs')
    .upsert(linha, { onConflict: 'run_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}
