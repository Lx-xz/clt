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
  max_dias_sem_descanso: number
  /** A versão do baralho em que a run foi jogada, numa coluna própria para a
   *  análise poder separar "antes e depois do ajuste" sem abrir o jsonb. */
  versao_baralho: number
  /** Falso na run abandonada sem permissão: conta para a análise, mas não
   *  aparece em "meus jogos" nem no ranking. */
  visivel: boolean
  /** Partida jogada sem conta. Fica na própria linha porque o perfil de
   *  convidado é descartável e a run não. */
  convidado: boolean
  /** O dia a dia da run e o retrato do baralho usado nela. O retrato é o que
   *  mantém a partida legível depois de a carta mudar de custo ou sumir —
   *  veja `src/data/balanceamento.ts`. */
  details: { history: GameState['history']; baralho?: GameState['baralho'] }
}

export function montarRun(
  playerId: string,
  run: GameState,
  outcome: DesfechoRegistrado,
  visivel: boolean,
  convidado: boolean,
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
    max_dias_sem_descanso: run.maxDaysNoRest,
    versao_baralho: run.baralho?.versao ?? 0,
    visivel,
    convidado,
    details: { history: run.history, baralho: run.baralho },
  }
}

/**
 * Registro append-only de uma run terminada, para balanceamento e para as
 * páginas de ranking/análise/meus-jogos.
 *
 * É um `insert` cru de propósito, e não um upsert: o upsert vira
 * `on conflict do nothing` no Postgres, e o Postgres cobra SELECT na tabela
 * por causa da cláusula `on conflict` — o que exigiria `grant select on runs
 * to anon` e abriria a telemetria de todo mundo para leitura. `runs` é só de
 * escrita pelo site (veja CLAUDE.md, seção Banco), então o caminho é inserir
 * direto e tratar o conflito quando ele vier.
 *
 * O índice único em run_id é quem impede a duplicata: se a mesma run for
 * enviada duas vezes (duas abas, uma retentativa depois de a resposta se
 * perder), a segunda volta com 23505 — unique_violation — e isso aqui é
 * sucesso, não erro. A run já está gravada, que é tudo que importa.
 */
export async function enviarRun(linha: RunRegistravel) {
  if (!supabase) throw new Error('Banco não configurado.')
  const { error } = await supabase.from('runs').insert(linha)
  if (!error) return
  if (error.code === '23505') return
  // o postgrest manda a causa em details/hint/code, e só a `message` costuma
  // ser vaga demais para achar o problema ("column ... does not exist" vem em
  // `message`, mas "permission denied" vem quase só no `code`)
  const partes = [error.message, error.details, error.hint, error.code].filter(Boolean)
  throw new Error(partes.join(' · '))
}
