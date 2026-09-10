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

/** Registro append-only de uma run terminada, para balanceamento. */
export async function registrarRun(playerId: string, run: GameState) {
  if (!supabase || run.outcome === 'jogando') return
  const { error } = await supabase.from('runs').insert({
    player_id: playerId,
    outcome: run.outcome,
    day: Math.min(20, Math.max(1, run.day)),
    money: run.money,
    week_reached: Math.min(4, Math.max(1, Math.ceil(run.day / 5))),
  })
  if (error) throw new Error(error.message)
}
