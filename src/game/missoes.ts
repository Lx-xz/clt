import { cartasDoJogo } from './catalogo'
import { copiasMaximas, ganharCopia } from './colecao'
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
  /** De onde ele vem, numa frase — é o que o popup de chances diz no topo. */
  origem: string
  /** Quantas cartas: um número, ou um intervalo sorteado por igual. */
  cartas: [min: number, max: number]
  /** A chance de CADA carta sair em cada raridade (soma 1). As cartas são
   *  sorteadas uma a uma, então podem vir repetidas. */
  chances: Record<Raridade, number>
}

/**
 * Os três envelopes. São o mesmo envelope em pé; o que os distingue na tela
 * é o SELO (`SELOS` em `Envelope.tsx`), e nas regras é só esta tabela.
 *
 * Os ids são os de quando eles nasceram (`pardo`, `confidencial`), e não o
 * nome da tela: envelope guardado na coleção de alguém carrega o id, e
 * renomear o id o faria sumir.
 */
export const ENVELOPES: Record<TipoEnvelope, Envelope> = {
  // o de toda partida: pouco, e quase sempre comum — é o que mantém a
  // coleção andando sem fazer de cada derrota um prêmio
  comum: {
    nome: 'Envelope comum',
    origem: 'Vem ao fim de toda partida, ganhando ou perdendo.',
    cartas: [1, 3],
    chances: { comum: 0.8, incomum: 0.15, rara: 0.04, epica: 0.01, lendaria: 0 },
  },
  pardo: {
    nome: 'Envelope do dia',
    origem: 'A missão "Bater o ponto": a primeira partida terminada do dia.',
    cartas: [3, 3],
    chances: { comum: 0.55, incomum: 0.27, rara: 0.12, epica: 0.05, lendaria: 0.01 },
  },
  confidencial: {
    nome: 'Envelope confidencial',
    origem: 'A missão "Fechar o mês": a primeira vitória do dia.',
    cartas: [3, 3],
    chances: { comum: 0.3, incomum: 0.33, rara: 0.22, epica: 0.11, lendaria: 0.04 },
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
 * A partida acabou: um envelope comum, sempre, e um por missão cumprida pela
 * primeira vez no dia. A mesa chama isto UMA vez por partida (na jogada que
 * a encerra); as missões não se repetem no dia porque ficam em `feitas`.
 */
export function cumprirMissoes(
  c: Collection,
  fim: FimDeRun,
  dia: string = hoje(),
): { colecao: Collection; cumpridas: Missao[] } {
  const feitas = feitasHoje(c, dia)
  const cumpridas = MISSOES.filter((m) => !feitas.includes(m.id) && m.cumpre(fim))
  // o envelope comum vem de TODA partida, e por isso não é missão: missão é
  // o que vale uma vez por dia
  return {
    colecao: {
      ...c,
      envelopes: [...c.envelopes, 'comum', ...cumpridas.map((m) => m.premio)],
      missoes: { dia, feitas: [...feitas, ...cumpridas.map((m) => m.id)] },
    },
    cumpridas,
  }
}

const ORDEM: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']

function sortearRaridade(chances: Record<Raridade, number>, sorte: () => number): Raridade {
  let resto = sorte()
  for (const r of ORDEM) {
    resto -= chances[r]
    if (resto < 0) return r
  }
  return 'comum'
}

/**
 * Uma carta da raridade sorteada que ainda CABE na coleção (abaixo do teto
 * de cópias). Esgotada a raridade, tenta as de baixo e, só então, as de
 * cima — o envelope nunca dá menos do que prometeu por falta de carta. Com
 * a coleção inteira cheia, `null`.
 */
function cartaDe(c: Collection, alvo: Raridade, sorte: () => number): CardId | null {
  const i = ORDEM.indexOf(alvo)
  const tentativas = [...ORDEM.slice(0, i + 1).reverse(), ...ORDEM.slice(i + 1)]
  const cabem = cartasDoJogo().filter((carta) => (c.tenho[carta.id] ?? 0) < copiasMaximas(carta))
  for (const r of tentativas) {
    const pool = cabem.filter((carta) => (carta.raridade ?? 'comum') === r)
    if (pool.length > 0) return pool[Math.floor(sorte() * pool.length)].id
  }
  return null
}

/**
 * Abre um envelope da fila (o mais antigo, se não disser qual): sorteia as
 * cartas UMA A UMA e já as põe na coleção, fora dos baralhos — quem decide
 * onde elas entram é a pessoa, no /baralho. Uma a uma porque a segunda
 * cópia da mesma carta conta para o teto da terceira.
 *
 * O envelope sai da fila mesmo com a coleção cheia e zero cartas: guardar um
 * envelope que nunca vai ter o que dar só acumularia um aviso eterno.
 */
export function abrirEnvelope(
  c: Collection,
  indice = 0,
  sorte: () => number = Math.random,
): { colecao: Collection; tipo: TipoEnvelope; cartas: CardId[] } | null {
  const tipo = c.envelopes[indice]
  if (!tipo) return null
  const envelope = ENVELOPES[tipo]
  const [min, max] = envelope.cartas
  const quantas = min + Math.floor(sorte() * (max - min + 1))
  let colecao: Collection = { ...c, envelopes: c.envelopes.filter((_, i) => i !== indice) }
  const cartas: CardId[] = []
  for (let n = 0; n < quantas; n++) {
    const id = cartaDe(colecao, sortearRaridade(envelope.chances, sorte), sorte)
    if (!id) break
    cartas.push(id)
    colecao = ganharCopia(colecao, id)
  }
  return { colecao, tipo, cartas }
}
