import { ganharCopia, sortearCartas } from './colecao'
import type { CardId, Collection, Raridade, TipoEnvelope } from './types'

/**
 * Missões diárias e envelopes: o jeito de ganhar carta desde a v0.16.
 *
 * Até a v0.15 cada run terminada oferecia uma carta no recibo. Isso amarrava
 * a coleção ao NÚMERO de partidas — quem abandonava cedo e recomeçava
 * colecionava mais rápido do que quem jogava o mês inteiro —, e o recibo de
 * uma derrota virava vitrine. Agora a carta vem de envelope, e o envelope
 * vem de missão: uma por dia, conferida quando a run termina.
 *
 * As missões são uma TABELA, como as cartas e os cortes de cabelo: missão
 * nova é uma linha, não um `if` na mesa. O que uma missão pode perguntar é o
 * que `FimDeRun` traz — se um dia ela quiser saber outra coisa da partida, o
 * campo entra lá, e não um acesso ao `GameState` inteiro.
 *
 * Funções puras sobre a coleção, como `colecao.ts`: quem guarda é quem chama.
 */

/** O que a missão sabe da partida que acabou. */
export interface FimDeRun {
  venceu: boolean
}

export interface Missao {
  id: string
  nome: string
  descricao: string
  premio: TipoEnvelope
  cumpre: (fim: FimDeRun) => boolean
}

export const MISSOES: Missao[] = [
  {
    id: 'bater-o-ponto',
    nome: 'Bater o ponto',
    descricao: 'Termine uma partida, do jeito que for.',
    premio: 'pardo',
    cumpre: () => true,
  },
  {
    id: 'fechar-o-mes',
    nome: 'Fechar o mês',
    descricao: 'Vença uma partida.',
    premio: 'confidencial',
    cumpre: (fim) => fim.venceu,
  },
]

export interface Envelope {
  nome: string
  descricao: string
  /** Uma vaga por carta, na raridade pedida (cai para a de baixo quando a
   *  raridade esgota — veja `sortearCartas`). */
  raridades: Raridade[]
}

export const ENVELOPES: Record<TipoEnvelope, Envelope> = {
  pardo: {
    nome: 'Envelope pardo',
    descricao: 'Três cartas, uma delas incomum.',
    raridades: ['comum', 'comum', 'incomum'],
  },
  // o "raro": o que se ganha vencendo, e a única porta garantida para as raras
  confidencial: {
    nome: 'Envelope confidencial',
    descricao: 'Três cartas, uma delas rara.',
    raridades: ['comum', 'incomum', 'rara'],
  },
}

/** A data LOCAL, `AAAA-MM-DD`: a missão vira à meia-noite de quem joga, não
 *  à de Greenwich — senão ela renovaria às nove da noite em Brasília. */
export function hoje(agora: Date = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${d(agora.getMonth() + 1)}-${d(agora.getDate())}`
}

/** O que já foi feito HOJE. A lista gravada é de outro dia? Vale vazia. */
export function feitasHoje(c: Collection, dia: string = hoje()): string[] {
  return c.missoes.dia === dia ? c.missoes.feitas : []
}

/**
 * Confere as missões contra a partida que acabou, e entrega um envelope por
 * missão cumprida pela primeira vez no dia. Idempotente: chamar duas vezes
 * com a mesma partida não dá dois envelopes, porque a missão já está em
 * `feitas`.
 */
export function cumprirMissoes(
  c: Collection,
  fim: FimDeRun,
  dia: string = hoje(),
): { colecao: Collection; cumpridas: Missao[] } {
  const feitas = feitasHoje(c, dia)
  const cumpridas = MISSOES.filter((m) => !feitas.includes(m.id) && m.cumpre(fim))
  if (cumpridas.length === 0) return { colecao: c, cumpridas }
  return {
    colecao: {
      ...c,
      envelopes: [...c.envelopes, ...cumpridas.map((m) => m.premio)],
      missoes: { dia, feitas: [...feitas, ...cumpridas.map((m) => m.id)] },
    },
    cumpridas,
  }
}

/**
 * Abre o envelope mais antigo: sorteia as cartas e já as põe na coleção,
 * fora dos baralhos (quem decide onde entram é a pessoa, no /baralho).
 *
 * O envelope sai da fila mesmo com a coleção cheia e zero cartas: guardar um
 * envelope que nunca vai ter o que dar só acumularia um aviso eterno.
 */
export function abrirEnvelope(
  c: Collection,
  sorte: () => number = Math.random,
): { colecao: Collection; tipo: TipoEnvelope; cartas: CardId[] } | null {
  const [tipo, ...resto] = c.envelopes
  if (!tipo) return null
  const cartas = sortearCartas(c, ENVELOPES[tipo].raridades, sorte)
  let colecao: Collection = { ...c, envelopes: resto }
  for (const id of cartas) colecao = ganharCopia(colecao, id)
  return { colecao, tipo, cartas }
}
