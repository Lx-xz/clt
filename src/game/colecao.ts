import { cartasDoJogo, cartasIniciais, getCard } from './catalogo'
import { regras } from './regras'
import type { ActionCard, BaralhoMontado, CardId, Collection, Raridade, TipoEnvelope } from './types'

/**
 * A coleção do jogador: as cópias que ele TEM e os baralhos montados com elas.
 *
 * Era binária — `{ equipped, unequipped }`, uma carta estava ou não estava —,
 * e as cópias só existiam nas cartas iniciais, lidas de `card.copies` na hora
 * de montar a run. Três coisas caíam disso juntas: tirar a Tarefa Simples
 * tirava as quatro; toda desbloqueável tinha uma cópia só; e a recompensa
 * morria quando as desbloqueáveis acabavam. Com cópias, ganhar carta é ganhar
 * MAIS UMA, até o teto da raridade.
 *
 * Funções puras sobre o objeto, sem localStorage: quem guarda é `storage.ts`.
 */

/** Quantos baralhos alguém pode montar. Um só não deixa experimentar sem
 *  desmontar o que funciona; dez viraria gaveta. */
export const MAXIMO_DE_BARALHOS = 3

/** Quantas cópias da carta cabem na coleção. Raridade é escassez, e o teto
 *  é o que faz a recompensa ter o que dar por muito tempo. */
export const COPIAS_POR_RARIDADE: Record<Raridade, number> = { comum: 4, incomum: 3, rara: 2 }

export function copiasMaximas(carta: ActionCard): number {
  // a carta inicial nunca pode ter um teto abaixo do que o baralho inicial
  // já dá — senão a coleção nasceria acima do limite
  return Math.max(COPIAS_POR_RARIDADE[carta.raridade ?? 'comum'], carta.starter ? (carta.copies ?? 1) : 0)
}

function idDeBaralho(): string {
  return `b${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

/** As cópias do baralho inicial, NA ORDEM do catálogo. A ordem importa: é
 *  ela que `cartasDoBaralho` expande, e o simulador compara runs byte a byte. */
function copiasIniciais(): Record<CardId, number> {
  const copias: Record<CardId, number> = {}
  for (const c of cartasIniciais()) copias[c.id] = c.copies ?? 1
  return copias
}

export function colecaoInicial(): Collection {
  const id = 'b1'
  return {
    tenho: copiasIniciais(),
    baralhos: [{ id, nome: 'Baralho 1', cartas: copiasIniciais() }],
    ativo: id,
    envelopes: [],
    missoes: { dia: '', feitas: [] },
  }
}

/** Envelopes e missões chegaram depois das coleções: quem gravou antes não
 *  tem os campos, e a leitura os dá vazios — o mesmo padrão do resto. */
function lerEnvelopes(bruta: Record<string, unknown>): Pick<Collection, 'envelopes' | 'missoes'> {
  const envelopes = Array.isArray(bruta.envelopes)
    ? (bruta.envelopes as unknown[]).filter((e): e is TipoEnvelope => e === 'pardo' || e === 'confidencial')
    : []
  const m = bruta.missoes as Record<string, unknown> | undefined
  const missoes =
    m && typeof m === 'object' && typeof m.dia === 'string' && Array.isArray(m.feitas)
      ? { dia: m.dia, feitas: (m.feitas as unknown[]).filter((f): f is string => typeof f === 'string') }
      : { dia: '', feitas: [] }
  return { envelopes, missoes }
}

function numero(x: unknown): number {
  return typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0
}

/**
 * Lê a coleção como ela vier — do localStorage, do banco, de uma versão
 * antiga — e devolve uma válida. É o mesmo padrão de `lerAvatar` e
 * `migrarAcoes`: a tradução acontece na LEITURA, e nada precisa rodar no banco.
 *
 * O formato antigo (`{ equipped, unequipped }`) vira: carta inicial equipada →
 * as cópias que ela dava; desbloqueável → uma cópia; não equipada → fica na
 * coleção, fora do baralho.
 */
export function lerColecao(bruta: unknown): Collection {
  if (!bruta || typeof bruta !== 'object') return colecaoInicial()
  const b = bruta as Record<string, unknown>
  const conhecidas = new Map(cartasDoJogo().map((c) => [c.id, c]))

  if (Array.isArray(b.equipped)) {
    const equipadas = (b.equipped as unknown[]).filter((id): id is string => typeof id === 'string' && conhecidas.has(id))
    const fora = Array.isArray(b.unequipped)
      ? (b.unequipped as unknown[]).filter((id): id is string => typeof id === 'string' && conhecidas.has(id))
      : []
    const copiasDe = (id: CardId) => {
      const c = conhecidas.get(id)!
      return c.starter ? (c.copies ?? 1) : 1
    }
    const tenho: Record<CardId, number> = {}
    const cartas: Record<CardId, number> = {}
    for (const id of equipadas) {
      tenho[id] = copiasDe(id)
      cartas[id] = copiasDe(id)
    }
    for (const id of fora) if (!tenho[id]) tenho[id] = copiasDe(id)
    return garantirNaipes({ tenho, baralhos: [{ id: 'b1', nome: 'Baralho 1', cartas }], ativo: 'b1', ...lerEnvelopes(b) })
  }

  const tenho: Record<CardId, number> = {}
  if (b.tenho && typeof b.tenho === 'object') {
    for (const [id, n] of Object.entries(b.tenho as Record<string, unknown>)) {
      const carta = conhecidas.get(id)
      const q = Math.min(numero(n), carta ? copiasMaximas(carta) : 0)
      if (carta && q > 0) tenho[id] = q
    }
  }
  const baralhos: BaralhoMontado[] = []
  if (Array.isArray(b.baralhos)) {
    for (const bruto of (b.baralhos as unknown[]).slice(0, MAXIMO_DE_BARALHOS)) {
      if (!bruto || typeof bruto !== 'object') continue
      const x = bruto as Record<string, unknown>
      const cartas: Record<CardId, number> = {}
      if (x.cartas && typeof x.cartas === 'object') {
        for (const [id, n] of Object.entries(x.cartas as Record<string, unknown>)) {
          // nunca mais cópias no baralho do que a pessoa tem
          const q = Math.min(numero(n), tenho[id] ?? 0)
          if (q > 0) cartas[id] = q
        }
      }
      baralhos.push({
        id: typeof x.id === 'string' && x.id ? x.id : idDeBaralho(),
        nome: typeof x.nome === 'string' && x.nome.trim() ? x.nome.trim().slice(0, 24) : `Baralho ${baralhos.length + 1}`,
        cartas,
      })
    }
  }
  if (Object.keys(tenho).length === 0) return { ...colecaoInicial(), ...lerEnvelopes(b) }
  if (baralhos.length === 0) baralhos.push({ id: 'b1', nome: 'Baralho 1', cartas: { ...tenho } })
  const ativo = typeof b.ativo === 'string' && baralhos.some((x) => x.id === b.ativo) ? b.ativo : baralhos[0].id
  return garantirNaipes({ tenho, baralhos, ativo, ...lerEnvelopes(b) })
}

/**
 * Ninguém pode ficar preso abaixo do mínimo por naipe sem ter como sair.
 *
 * O mínimo por naipe chegou depois das coleções: quem começou com 2 Reuniões
 * (o baralho inicial antigo) não tinha uma terceira carta social para pôr, e
 * a mesa recusaria o baralho para sempre. Aqui a coleção ganha cópias da
 * carta INICIAL daquele naipe até o mínimo, e o baralho ativo, se estiver
 * curto naquele naipe, recebe as que faltam. É o mesmo princípio de traduzir
 * na leitura: a regra nova não pode derrubar quem já jogava.
 */
function garantirNaipes(c: Collection): Collection {
  const minimo = regras().minimoPorNaipe
  const tenho = { ...c.tenho }
  const ativo = baralhoAtivo(c)
  const noAtivo = { ...ativo.cartas }
  for (const naipe of ['tarefa', 'descanso', 'grana', 'social'] as const) {
    const doNaipe = cartasDoJogo().filter((carta) => carta.kind === naipe)
    const inicial = doNaipe.find((carta) => carta.starter) ?? doNaipe[0]
    if (!inicial) continue
    const possuidas = doNaipe.reduce((t, carta) => t + (tenho[carta.id] ?? 0), 0)
    if (possuidas < minimo) tenho[inicial.id] = (tenho[inicial.id] ?? 0) + (minimo - possuidas)
    const noBaralho = doNaipe.reduce((t, carta) => t + (noAtivo[carta.id] ?? 0), 0)
    if (noBaralho < minimo) {
      noAtivo[inicial.id] = Math.min((noAtivo[inicial.id] ?? 0) + (minimo - noBaralho), tenho[inicial.id])
    }
  }
  return {
    ...c,
    tenho,
    baralhos: c.baralhos.map((b) => (b.id === ativo.id ? { ...b, cartas: noAtivo } : b)),
  }
}

export function baralhoAtivo(c: Collection): BaralhoMontado {
  return c.baralhos.find((b) => b.id === c.ativo) ?? c.baralhos[0]
}

/** Uma entrada por CÓPIA, na ordem das chaves — é o que a run embaralha. */
export function cartasDoBaralho(b: BaralhoMontado): CardId[] {
  return Object.entries(b.cartas).flatMap(([id, n]) => Array.from({ length: n }, () => id))
}

export function tamanho(b: BaralhoMontado): number {
  return Object.values(b.cartas).reduce((t, n) => t + n, 0)
}

/** Quantas cópias da carta estão FORA do baralho dado. */
export function foraDoBaralho(c: Collection, b: BaralhoMontado, id: CardId): number {
  return (c.tenho[id] ?? 0) - (b.cartas[id] ?? 0)
}

function comBaralho(c: Collection, id: string, mudar: (b: BaralhoMontado) => BaralhoMontado): Collection {
  return { ...c, baralhos: c.baralhos.map((b) => (b.id === id ? mudar(b) : b)) }
}

/** Põe (`+1`) ou tira (`-1`) cópias da carta do baralho, dentro do que se tem. */
export function moverCopias(c: Collection, baralhoId: string, id: CardId, delta: number): Collection {
  return comBaralho(c, baralhoId, (b) => {
    const q = Math.max(0, Math.min((b.cartas[id] ?? 0) + delta, c.tenho[id] ?? 0))
    const cartas = { ...b.cartas }
    if (q > 0) cartas[id] = q
    else delete cartas[id]
    return { ...b, cartas }
  })
}

/** Mais uma cópia na coleção — fora dos baralhos: quem decide onde ela entra
 *  é a pessoa. Devolve a mesma coleção se o teto já foi alcançado. */
export function ganharCopia(c: Collection, id: CardId): Collection {
  const carta = getCard(id)
  const atual = c.tenho[id] ?? 0
  if (atual >= copiasMaximas(carta)) return c
  return { ...c, tenho: { ...c.tenho, [id]: atual + 1 } }
}

/** Cartas que a pessoa ainda não tem nenhuma cópia. */
export function cartasBloqueadas(c: Collection): ActionCard[] {
  return cartasDoJogo().filter((carta) => !(c.tenho[carta.id] > 0))
}

export function novoBaralho(c: Collection, copiaDe?: string): Collection {
  if (c.baralhos.length >= MAXIMO_DE_BARALHOS) return c
  const base = c.baralhos.find((b) => b.id === copiaDe) ?? baralhoAtivo(c)
  const novo: BaralhoMontado = { id: idDeBaralho(), nome: `Baralho ${c.baralhos.length + 1}`, cartas: { ...base.cartas } }
  return { ...c, baralhos: [...c.baralhos, novo], ativo: novo.id }
}

export function renomearBaralho(c: Collection, id: string, nome: string): Collection {
  const limpo = nome.trim().slice(0, 24)
  if (!limpo) return c
  return comBaralho(c, id, (b) => ({ ...b, nome: limpo }))
}

export function apagarBaralho(c: Collection, id: string): Collection {
  if (c.baralhos.length <= 1) return c
  const baralhos = c.baralhos.filter((b) => b.id !== id)
  return { ...c, baralhos, ativo: c.ativo === id ? baralhos[0].id : c.ativo }
}

export function ativarBaralho(c: Collection, id: string): Collection {
  return c.baralhos.some((b) => b.id === id) ? { ...c, ativo: id } : c
}

// ---------------------------------------------------------------- sorteio

const ORDEM_RARIDADE: Raridade[] = ['comum', 'incomum', 'rara']

/**
 * Sorteia uma carta por vaga, na raridade pedida. Só entra carta que ainda
 * CABE (cópias abaixo do teto) — dar a quinta Tarefa Simples seria dar nada.
 * Quando uma raridade esgota, a vaga cai para a de baixo; com a coleção
 * cheia, a lista sai vazia e quem chama diz "coleção completa". Nunca a mesma
 * carta duas vezes no mesmo sorteio.
 *
 * Era a recompensa de fim de run (v0.15); desde as missões diárias é o
 * miolo do envelope (`ENVELOPES` em `missoes.ts`). O sorteio vem de fora
 * (`sorte`) pelo mesmo motivo do motor: o simulador precisa repetir a partida.
 */
export function sortearCartas(
  colecao: Collection,
  raridades: Raridade[],
  sorte: () => number = Math.random,
): CardId[] {
  const cabem = cartasDoJogo().filter((c) => (colecao.tenho[c.id] ?? 0) < copiasMaximas(c))
  const escolhidas: CardId[] = []
  for (const alvo of raridades) {
    for (let i = ORDEM_RARIDADE.indexOf(alvo); i >= 0; i--) {
      const pool = cabem.filter((c) => (c.raridade ?? 'comum') === ORDEM_RARIDADE[i] && !escolhidas.includes(c.id))
      if (pool.length === 0) continue
      escolhidas.push(pool[Math.floor(sorte() * pool.length)].id)
      break
    }
  }
  return escolhidas
}
