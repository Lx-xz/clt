import { idAtual, idDaConquista, traduzirIds } from './ids'
import { cartasDoJogo, cartasIniciais, getCard } from './catalogo'
import { regras } from './regras'
import type { ActionCard, BaralhoMontado, CardId, Collection, EnvelopeFechado, Raridade, TipoEnvelope } from './types'

const TIPOS_DE_ENVELOPE: TipoEnvelope[] = ['comum', 'pardo', 'confidencial', 'epico', 'abobora']

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
// v0.34, a pedido do autor: um degrau por raridade, de 5 a 1. É também o
// máximo da carta num baralho, porque não dá para pôr mais do que se tem
export const COPIAS_POR_RARIDADE: Record<Raridade, number> = { comum: 5, incomum: 4, rara: 3, epica: 2, lendaria: 1 }

export const NOMES_DE_RARIDADE: Record<Raridade, string> = {
  comum: 'comum',
  incomum: 'incomum',
  rara: 'rara',
  epica: 'épica',
  lendaria: 'lendária',
}

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
    cosmeticos: [],
  }
}

/** Envelopes e missões chegaram depois das coleções: quem gravou antes não
 *  tem os campos, e a leitura os dá vazios — o mesmo padrão do resto. */
function lerEnvelopes(bruta: Record<string, unknown>): Pick<Collection, 'envelopes' | 'missoes' | 'cosmeticos' | 'sequencia' | 'tokens' | 'maquina' | 'aboboraGratis' | 'conquistasPagas'> {
  // até a v0.19 a fila era só o tipo (`'pardo'`); desde a v0.20 é o envelope
  // com as cartas já sorteadas. O antigo vira `{ tipo }`, e é sorteado na
  // abertura, como era
  const envelopes: EnvelopeFechado[] = []
  for (const e of Array.isArray(bruta.envelopes) ? (bruta.envelopes as unknown[]) : []) {
    const obj = (typeof e === 'string' ? { tipo: e } : e) as Record<string, unknown> | null
    if (!obj || typeof obj !== 'object' || !TIPOS_DE_ENVELOPE.includes(obj.tipo as TipoEnvelope)) continue
    envelopes.push({
      tipo: obj.tipo as TipoEnvelope,
      ...(typeof obj.id === 'string' ? { id: obj.id } : {}),
      ...(Array.isArray(obj.cartas) ? { cartas: (obj.cartas as unknown[]).filter((c): c is string => typeof c === 'string').map((c) => idAtual(c)) } : {}),
      ...(Array.isArray(obj.cosmeticos) ? { cosmeticos: (obj.cosmeticos as unknown[]).filter((c): c is string => typeof c === 'string') } : {}),
    })
  }
  const m = bruta.missoes as Record<string, unknown> | undefined
  const missoes =
    m && typeof m === 'object' && typeof m.dia === 'string' && Array.isArray(m.feitas)
      ? { dia: m.dia, feitas: (m.feitas as unknown[]).filter((f): f is string => typeof f === 'string') }
      : { dia: '', feitas: [] }
  // quem gravou antes das maletas não tem a lista: nasce vazia
  // o olho de réptil virou o de gato (v0.30): quem tinha o réptil fica
  // com o gato, sem repetir
  const cosmeticos = Array.isArray(bruta.cosmeticos)
    ? [...new Set((bruta.cosmeticos as unknown[]).filter((c): c is string => typeof c === 'string').map((c) => (c === 'iris:reptil' ? 'iris:gato' : c)))]
    : []
  // a sequência dos sete dias chegou na v0.24: quem gravou antes começa do zero
  const s = bruta.sequencia as Record<string, unknown> | undefined
  const sequencia =
    s && typeof s === 'object' && typeof s.dia === 'string' && typeof s.dias === 'number' ? { dia: s.dia, dias: Math.max(0, Math.floor(s.dias)) } : undefined
  // os tokens e a máquina chegaram na v0.29: quem gravou antes começa sem
  const tokens = numero(bruta.tokens)
  const mq = bruta.maquina as Record<string, unknown> | undefined
  const textos = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : [])
  const maquina =
    mq && typeof mq === 'object' && typeof mq.dia === 'string'
      ? {
          dia: mq.dia,
          cartas: textos(mq.cartas).map((c) => idAtual(c)),
          cosmeticos: textos(mq.cosmeticos),
          vendidos: textos(mq.vendidos).map((v) => (v.startsWith('carta:') ? `carta:${idAtual(v.slice(6))}` : v)),
        }
      : undefined
  // v0.34: a abóbora grátis da máquina (uma vez) e as conquistas que já
  // pagaram os seus tokens
  // o id da conquista era o nome (`mes-fechado`) até a v0.35
  const pagas = [...new Set(textos(bruta.conquistasPagas).map(idDaConquista))]
  return {
    envelopes,
    missoes,
    cosmeticos,
    ...(sequencia ? { sequencia } : {}),
    ...(tokens ? { tokens } : {}),
    ...(maquina ? { maquina } : {}),
    ...(bruta.aboboraGratis === true ? { aboboraGratis: true } : {}),
    ...(pagas.length ? { conquistasPagas: pagas } : {}),
  }
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
  // v0.35: os ids de carta viraram uuid. A coleção gravada antes fala
  // `hora-extra` nas chaves, nos baralhos, nas recompensas e na máquina;
  // `traduzirIds` troca os conhecidos, e `idAtual` (abaixo, nos campos que
  // se SABE que são id) troca até o de uma carta criada no lab
  const b = traduzirIds(bruta) as Record<string, unknown>
  const conhecidas = new Map(cartasDoJogo().map((c) => [c.id, c]))

  if (Array.isArray(b.equipped)) {
    const equipadas = (b.equipped as unknown[]).flatMap((id) => (typeof id === 'string' && conhecidas.has(idAtual(id)) ? [idAtual(id)] : []))
    const fora = Array.isArray(b.unequipped)
      ? (b.unequipped as unknown[]).flatMap((id) => (typeof id === 'string' && conhecidas.has(idAtual(id)) ? [idAtual(id)] : []))
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
    for (const [bruto, n] of Object.entries(b.tenho as Record<string, unknown>)) {
      const id = idAtual(bruto)
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
        for (const [bruto, n] of Object.entries(x.cartas as Record<string, unknown>)) {
          const id = idAtual(bruto)
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

/**
 * Copia o baralho de OUTRA pessoa (v0.34, do perfil de um amigo): para um
 * baralho novo (`novo`) ou por cima do que está equipado. Só entra o que a
 * pessoa tem — não dá para pôr no baralho a carta que ela não ganhou —, e
 * `faltaram` diz quantas cópias ficaram de fora, para a tela contar.
 */
export function copiarBaralho(
  c: Collection,
  cartas: Record<CardId, number>,
  nome: string,
  novo: boolean,
): { colecao: Collection; faltaram: number } {
  const dentro: Record<CardId, number> = {}
  let faltaram = 0
  for (const [id, n] of Object.entries(cartas)) {
    const q = Math.min(n, c.tenho[id] ?? 0)
    if (q > 0) dentro[id] = q
    faltaram += n - q
  }
  if (novo) {
    if (c.baralhos.length >= MAXIMO_DE_BARALHOS) return { colecao: c, faltaram: 0 }
    const b: BaralhoMontado = { id: idDeBaralho(), nome: nome.trim().slice(0, 24) || `Baralho ${c.baralhos.length + 1}`, cartas: dentro }
    return { colecao: { ...c, baralhos: [...c.baralhos, b], ativo: b.id }, faltaram }
  }
  return { colecao: comBaralho(c, c.ativo, (b) => ({ ...b, cartas: dentro })), faltaram }
}
