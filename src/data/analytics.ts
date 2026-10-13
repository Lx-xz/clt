import { idAtual, traduzirIds } from '@/game/ids'
import type { Regras } from '@/game/regras'
import type { CartaSnapshot, DayLog, EnvelopeGanho, LinhaDoLog } from '@/game/types'
import { faltaFuncao } from './jogadores'
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
  abandonos: number
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
  /** Desde a v0.14. Banco antigo não manda, e `lerAvatar` cai no manequim. */
  avatar?: unknown
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
  id: string
  ended_at: string
  outcome: 'vitoria' | 'burnout' | 'demissao' | 'despejo' | 'abandono'
  day: number
  money: number
  week_reached: number
  /** Desde a v0.20, para o recibo resumido. Banco sem o `schema.sql` novo
   *  não manda, e o recibo deixa a linha de fora. */
  cards_played?: number | null
  estresse?: number | null
  /** Os envelopes que a partida deu (`details.envelopes`), crus. */
  envelopes?: unknown
}

export async function buscarMeusJogos(playerId: string): Promise<LinhaMeuJogo[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('meus_jogos', { p_player_id: playerId })
  if (error) throw new Error(error.message)
  // as runs gravadas antes da v0.35 falam o id antigo das cartas
  return traduzirIds((data as LinhaMeuJogo[]) ?? [])
}

export interface DetalheDoJogo extends LinhaMeuJogo {
  /** `baralho` é o retrato das cartas como elas eram naquele dia; runs
   *  gravadas antes do versionamento não o têm, e aí o replay cai nas cartas
   *  de hoje. Veja `src/data/balanceamento.ts`. */
  details: {
    history: DayLog[]
    baralho?: { versao: number; cartas: CartaSnapshot[] }
    /** As regras com que esta partida foi jogada. O replay lê daqui, e não
     *  das regras de hoje. */
    modo?: Regras
    /** As frases do histórico da mesa. Só existe nas runs gravadas a partir
     *  da v0.14; antes disso o replay mostra só as cartas. */
    log?: LinhaDoLog[]
    /** Os envelopes que a partida deu, com as cartas. Desde a v0.20. */
    envelopes?: EnvelopeGanho[]
    /** O avatar de quem jogou, como estava no fim. Desde a v0.36: antes
     *  disso o replay mostra o de hoje. */
    avatar?: unknown
  } | null
}

/** Devolve null quando a run não existe ou não é deste jogador. */
export async function buscarDetalheDoJogo(runId: string, playerId: string): Promise<DetalheDoJogo | null> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase
    .rpc('jogo_detalhe', { p_run_id: runId, p_player_id: playerId })
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? traduzirIds(data as DetalheDoJogo) : null
}

/** O replay de outra pessoa: o mesmo dia-a-dia, mais quem jogou. Null quando
 *  a run não abre (largada no meio, não guardada) ou o banco é antigo. */
export interface JogoPublico extends DetalheDoJogo {
  nick: string
  avatar: unknown
}

export async function buscarJogoPublico(runId: string): Promise<JogoPublico | null> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('jogo_publico', { p_run_id: runId }).maybeSingle()
  if (error) {
    if (faltaFuncao(error)) return null
    throw new Error(error.message)
  }
  return data ? traduzirIds(data as JogoPublico) : null
}

// ------------------------------------------------------ estatísticas nerds
// Todas saem de `runs.details`, que já guarda o dia-a-dia com as cartas na
// ordem jogada — nenhum contador novo no jogo foi preciso para elas.

export interface EstatisticasNerds {
  total_cartas_jogadas: number
  total_dias_vividos: number
  maior_embalo: number | null
  total_advertencias: number
  dinheiro_total: number
  runs_abandonadas: number
  duracao_media_min: number | null
  run_mais_rapida_min: number | null
  energia_desperdicada: number
  energia_media_sobra: number | null
  recorde_sem_descanso: number | null
}

export async function buscarEstatisticasNerds(): Promise<EstatisticasNerds> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('estatisticas_nerds').single()
  if (error) throw new Error(error.message)
  return data as EstatisticasNerds
}

/**
 * As runs de antes da v0.35 falam o id antigo da carta, e as de depois o
 * uuid: a mesma carta chega em duas linhas. Aqui elas viram uma só.
 */
function juntarPorId(linhas: CartaJogada[]): CartaJogada[] {
  const somas = new Map<string, number>()
  for (const l of linhas) {
    const id = idAtual(l.card_id)
    somas.set(id, (somas.get(id) ?? 0) + Number(l.vezes))
  }
  return [...somas].map(([card_id, vezes]) => ({ card_id, vezes })).sort((a, b) => b.vezes - a.vezes)
}

export interface CartaJogada {
  card_id: string
  vezes: number
}

export async function buscarCartasJogadas(): Promise<CartaJogada[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('cartas_jogadas')
  if (error) throw new Error(error.message)
  return juntarPorId((data as CartaJogada[]) ?? [])
}

/** As que mais ficaram na mão sem ser jogadas. Mesmo formato de CartaJogada. */
export async function buscarCartasEncalhadas(): Promise<CartaJogada[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('cartas_encalhadas')
  if (error) throw new Error(error.message)
  return juntarPorId((data as CartaJogada[]) ?? [])
}

export interface CartaFatal {
  outcome: 'burnout' | 'demissao' | 'despejo'
  card_id: string
  vezes: number
}

export async function buscarCartasFatais(): Promise<CartaFatal[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('cartas_fatais')
  if (error) throw new Error(error.message)
  const somas = new Map<string, CartaFatal>()
  for (const l of (data as CartaFatal[]) ?? []) {
    const id = idAtual(l.card_id)
    const k = `${l.outcome}|${id}`
    const antes = somas.get(k)
    somas.set(k, { ...l, card_id: id, vezes: (antes?.vezes ?? 0) + Number(l.vezes) })
  }
  return [...somas.values()].sort((a, b) => b.vezes - a.vezes)
}

export interface EscolhaDeEvento {
  event_id: string
  escolha: 0 | 1
  vezes: number
}

export async function buscarEscolhasDeEvento(): Promise<EscolhaDeEvento[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('escolhas_de_evento')
  if (error) throw new Error(error.message)
  const somas = new Map<string, EscolhaDeEvento>()
  for (const l of (data as EscolhaDeEvento[]) ?? []) {
    const id = idAtual(l.event_id)
    const k = `${l.escolha}|${id}`
    const antes = somas.get(k)
    somas.set(k, { ...l, event_id: id, vezes: (antes?.vezes ?? 0) + Number(l.vezes) })
  }
  return [...somas.values()]
}

export interface EstressePorDia {
  day: number
  estresse_medio: number
  amostras: number
}

export async function buscarEstressePorDia(): Promise<EstressePorDia[]> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('estresse_por_dia')
  if (error) throw new Error(error.message)
  return (data as EstressePorDia[]) ?? []
}
