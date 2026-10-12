import { cartasDoJogo, getCard } from './catalogo'
import { ganharCopia } from './colecao'
import { cosmeticoPorId, sortearCosmetico } from './cosmeticos'
import { TOKENS_POR_RARIDADE, comTokens } from './tokens'
import type { CardId, Collection, EnvelopeGanho, Raridade, TipoEnvelope } from './types'

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

/** O desenho da recompensa: a escada de valor, do mais simples ao mais raro. */
export type FormaDaRecompensa = 'envelope' | 'pacote' | 'maleta' | 'cofre'

export interface Envelope {
  nome: string
  /** O objeto que a recompensa é na tela (`components/Recompensa`). */
  forma: FormaDaRecompensa
  /** Para as frases: "toque NO pacote", "toque NA maleta". */
  artigo: 'o' | 'a'
  /** De onde ele vem, numa frase — é o que o popup de chances diz no topo. */
  origem: string
  /** Quantas cartas: de `min` a `max`. */
  cartas: [min: number, max: number]
  /** A chance de cada quantidade, de `min` a `max` (soma 1). Sem ela, todas
   *  saem por igual. A quantidade é sorteada antes, e a raridade de CADA
   *  carta depois: pode vir uma carta só, e épica, ou três comuns. */
  pesos?: number[]
  /** Os itens (peças do avatar): a chance de cada um, independentes. `[0.3]`
   *  é "pode vir um"; `[1, 0.25]` é "um garantido, e às vezes um segundo".
   *  A raridade do item sai das mesmas `chances` das cartas. */
  itens?: number[]
  /** A chance de CADA carta sair em cada raridade (soma 1). As cartas são
   *  sorteadas uma a uma, então podem vir repetidas. */
  chances: Record<Raridade, number>
}

/**
 * As recompensas. Até a v0.22 eram todas o mesmo envelope, distinguido pelo
 * selo; desde a v0.23 cada uma é um OBJETO, numa escada em que o tamanho diz
 * o valor: envelope, pacote, maleta e cofre (`forma`). Nas regras continua
 * sendo só esta tabela, e recompensa melhor dá MAIS cartas, e não só cartas
 * melhores (v0.20).
 *
 * Os ids são os de quando elas nasceram (`pardo` é o pacote, `confidencial`
 * a maleta), e não o nome da tela: recompensa guardada na coleção de alguém
 * carrega o id, e renomear o id a faria sumir. O código continua chamando
 * todas de "envelope" pelo mesmo motivo.
 */
export const ENVELOPES: Record<TipoEnvelope, Envelope> = {
  // o de toda partida: quase sempre comum, e nunca lendária — é o que mantém
  // a coleção andando sem fazer de cada derrota um prêmio
  comum: {
    nome: 'Envelope',
    forma: 'envelope',
    artigo: 'o',
    origem: 'Vem ao fim de toda partida, ganhando ou perdendo.',
    cartas: [1, 3],
    pesos: [0.25, 0.45, 0.3],
    chances: { comum: 0.8, incomum: 0.15, rara: 0.04, epica: 0.01, lendaria: 0 },
  },
  pardo: {
    nome: 'Pacote',
    forma: 'pacote',
    artigo: 'o',
    origem: 'A missão "Bater o ponto": a primeira partida terminada do dia.',
    cartas: [3, 5],
    pesos: [0.3, 0.45, 0.25],
    chances: { comum: 0.55, incomum: 0.3, rara: 0.1, epica: 0.04, lendaria: 0.01 },
  },
  confidencial: {
    nome: 'Maleta',
    forma: 'maleta',
    artigo: 'a',
    origem: 'A missão "Fechar o mês": a primeira vitória do dia.',
    cartas: [5, 7],
    pesos: [0.3, 0.45, 0.25],
    itens: [0.3],
    chances: { comum: 0.35, incomum: 0.33, rara: 0.2, epica: 0.09, lendaria: 0.03 },
  },
  // o prêmio dos sete dias seguidos, o topo da escada. Já houve um
  // cofre-forte acima dele (v0.23–v0.24), que nenhuma missão dava: o autor o
  // tirou, porque o cofre já é forte o bastante
  epico: {
    nome: 'Cofre',
    forma: 'cofre',
    artigo: 'o',
    origem: 'A missão "Sete dias seguidos": terminar uma partida por dia, sete dias sem falhar.',
    cartas: [7, 9],
    pesos: [0.3, 0.45, 0.25],
    itens: [1, 0.25],
    chances: { comum: 0.2, incomum: 0.3, rara: 0.28, epica: 0.16, lendaria: 0.06 },
  },
}

/** A data LOCAL, `AAAA-MM-DD`: a missão vira à meia-noite de quem joga, não
 *  à de Greenwich — senão ela renovaria às nove da noite em Brasília. */
export function hoje(agora: Date = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${d(agora.getMonth() + 1)}-${d(agora.getDate())}`
}

/** O dia anterior a `dia` (`AAAA-MM-DD`), no calendário local. */
export function ontem(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number)
  return hoje(new Date(a, m - 1, d - 1))
}

/**
 * A missão dos dias SEGUIDOS: terminar uma partida por dia, sete dias sem
 * falhar, dá um cofre. Não mora em `MISSOES` porque não é do dia — ela
 * atravessa a semana, e quem a conta é `Collection.sequencia`. Mas tem a
 * mesma cara de missão (`Missao`), para o recibo e a lista a mostrarem igual.
 */
export const SEQUENCIA: Missao & { dias: number } = {
  id: 'sete-dias',
  nome: 'Sete dias seguidos',
  descricao: 'Termine uma partida por dia, sete dias sem falhar.',
  premio: 'epico',
  dias: 7,
  cumpre: () => false,
}

/** Uma missão pelo id, a do dia ou a dos sete dias. */
export function missaoPorId(id: string): Missao | undefined {
  return id === SEQUENCIA.id ? SEQUENCIA : MISSOES.find((m) => m.id === id)
}

/**
 * Quantos dias seguidos valem HOJE: os da sequência gravada, se o último dia
 * dela foi hoje ou ontem; senão a corrente quebrou, e vale zero. `hojeConta`
 * diz se a partida de hoje já entrou.
 */
export function sequenciaDeHoje(c: Collection, dia: string = hoje()): { dias: number; hojeConta: boolean } {
  const s = c.sequencia
  if (!s || (s.dia !== dia && s.dia !== ontem(dia))) return { dias: 0, hojeConta: false }
  return { dias: s.dias, hojeConta: s.dia === dia }
}

/** O que já foi feito HOJE. A lista gravada é de outro dia? Vale vazia. */
export function feitasHoje(c: Collection, dia: string = hoje()): string[] {
  return c.missoes.dia === dia ? c.missoes.feitas : []
}

/**
 * A partida acabou: um envelope comum, sempre, e um por missão cumprida pela
 * primeira vez no dia. A mesa chama isto UMA vez por partida (na jogada que
 * a encerra); as missões não se repetem no dia porque ficam em `feitas`.
 *
 * As cartas de cada envelope são sorteadas AQUI, e não ao abrir: é o que
 * deixa o recibo e o replay contarem o que a partida deu. Elas ficam dentro
 * do envelope fechado, e só entram na coleção quando ele é aberto.
 */
export function cumprirMissoes(
  c: Collection,
  fim: FimDeRun,
  { dia = hoje(), sorte = Math.random, runId = String(Date.now()) }: { dia?: string; sorte?: () => number; runId?: string } = {},
): { colecao: Collection; cumpridas: Missao[]; ganhos: EnvelopeGanho[] } {
  const feitas = feitasHoje(c, dia)
  const cumpridas = MISSOES.filter((m) => !feitas.includes(m.id) && m.cumpre(fim))
  // os dias seguidos: a primeira partida do dia soma um (ou recomeça do um,
  // se ontem ficou sem); no sétimo, sai o cofre e a conta volta a zero
  const atual = sequenciaDeHoje(c, dia)
  let sequencia = atual.hojeConta ? c.sequencia! : { dia, dias: atual.dias + 1 }
  if (sequencia.dias >= SEQUENCIA.dias) {
    cumpridas.push(SEQUENCIA)
    sequencia = { dia, dias: 0 }
  }
  // o envelope comum vem de TODA partida, e por isso não é missão: missão é
  // o que vale uma vez por dia
  const tipos: { tipo: TipoEnvelope; missao?: string }[] = [
    { tipo: 'comum' },
    ...cumpridas.map((m) => ({ tipo: m.premio, missao: m.id })),
  ]
  // desde a v0.29 o sorteio não olha a coleção: repetida acima do teto
  // vira token na abertura (`abrirEnvelope`), e por isso dois envelopes
  // podem prometer a mesma épica sem ninguém sair perdendo
  const ganhos: EnvelopeGanho[] = tipos.map(({ tipo, missao }, i) => {
    const cartas = sortearCartas(tipo, sorte)
    const itens = sortearItens(tipo, sorte)
    return { tipo, id: `${runId}:${i}`, cartas, ...(itens.length ? { cosmeticos: itens } : {}), ...(missao ? { missao } : {}) }
  })
  return {
    colecao: {
      ...c,
      envelopes: [...c.envelopes, ...ganhos.map(({ tipo, id, cartas, cosmeticos }) => ({ tipo, id, cartas, ...(cosmeticos ? { cosmeticos } : {}) }))],
      missoes: { dia, feitas: [...feitas, ...cumpridas.filter((m) => m !== SEQUENCIA).map((m) => m.id)] },
      sequencia,
    },
    cumpridas,
    ganhos,
  }
}

/** Os itens de uma recompensa: cada chance de `itens` é um sorteio à parte.
 *  Podem vir peças que a pessoa já tem (viram token), mas não duas iguais
 *  na mesma recompensa. */
function sortearItens(tipo: TipoEnvelope, sorte: () => number): string[] {
  const envelope = ENVELOPES[tipo]
  const ids: string[] = []
  for (const chance of envelope.itens ?? []) {
    if (sorte() >= chance) continue
    const item = sortearCosmetico(envelope.chances, ids, sorte)
    if (!item) break
    ids.push(item.id)
  }
  return ids
}

/** Quantas cartas: pelos `pesos`, se houver, senão por igual. */
function sortearQuantas(envelope: Envelope, sorte: () => number): number {
  const [min, max] = envelope.cartas
  if (!envelope.pesos) return min + Math.floor(sorte() * (max - min + 1))
  let resto = sorte()
  for (let i = 0; i < envelope.pesos.length; i++) {
    resto -= envelope.pesos[i]
    if (resto < 0) return Math.min(max, min + i)
  }
  return max
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
 * Uma carta da raridade sorteada, entre TODAS as do jogo (v0.29). Até ali
 * eram só as que ainda cabiam na coleção, e o sorteio mirava justamente o
 * que faltava: a coleção se completava sozinha em umas três semanas. Hoje a
 * cópia acima do teto vira token na abertura. A raridade sem carta nenhuma
 * no jogo cai para a de baixo e, só então, para a de cima.
 */
function cartaDe(alvo: Raridade, sorte: () => number): CardId | null {
  const i = ORDEM.indexOf(alvo)
  const tentativas = [...ORDEM.slice(0, i + 1).reverse(), ...ORDEM.slice(i + 1)]
  const todas = cartasDoJogo()
  for (const r of tentativas) {
    const pool = todas.filter((carta) => (carta.raridade ?? 'comum') === r)
    if (pool.length > 0) return pool[Math.floor(sorte() * pool.length)].id
  }
  return null
}

/** As cartas de um envelope, sorteadas uma a uma (podem vir repetidas). */
function sortearCartas(tipo: TipoEnvelope, sorte: () => number): CardId[] {
  const envelope = ENVELOPES[tipo]
  const quantas = sortearQuantas(envelope, sorte)
  const cartas: CardId[] = []
  for (let n = 0; n < quantas; n++) {
    const id = cartaDe(sortearRaridade(envelope.chances, sorte), sorte)
    if (!id) break
    cartas.push(id)
  }
  return cartas
}

/** O que uma abertura deu. `cartas` e `cosmeticos` são TUDO o que saiu, na
 *  ordem; `emToken` diz quais viraram token (a cópia acima do teto, o item
 *  que já tinha), e `tokens` é a soma. */
export interface Abertura {
  colecao: Collection
  tipo: TipoEnvelope
  cartas: CardId[]
  cosmeticos: string[]
  emToken: { cartas: boolean[]; cosmeticos: boolean[] }
  tokens: number
}

/**
 * Abre um envelope da fila (o mais antigo, se não disser qual) e põe as
 * cartas na coleção, fora dos baralhos — quem decide onde elas entram é a
 * pessoa, no /baralho.
 *
 * O envelope ganho desde a v0.20 já traz as cartas; o de antes é sorteado
 * agora, como era. A carta que não cabe (já no teto, ou que passou do teto
 * com as outras deste mesmo envelope) e o item que a pessoa já tem viram
 * TOKEN, no peso da raridade (v0.29). Antes ela não entrava e não aparecia.
 */
export function abrirEnvelope(c: Collection, indice = 0, sorte: () => number = Math.random): Abertura | null {
  const envelope = c.envelopes[indice]
  if (!envelope) return null
  let colecao: Collection = { ...c, envelopes: c.envelopes.filter((_, i) => i !== indice) }
  const cartas = envelope.cartas ?? sortearCartas(envelope.tipo, sorte)
  const cosmeticos = envelope.cartas ? (envelope.cosmeticos ?? []) : sortearItens(envelope.tipo, sorte)
  let tokens = 0
  const emTokenCartas = cartas.map((id) => {
    const depois = ganharCopia(colecao, id)
    if (depois !== colecao) {
      colecao = depois
      return false
    }
    tokens += TOKENS_POR_RARIDADE[getCard(id).raridade ?? 'comum']
    return true
  })
  const emTokenItens = cosmeticos.map((id) => {
    if (!colecao.cosmeticos.includes(id)) {
      colecao = { ...colecao, cosmeticos: [...colecao.cosmeticos, id] }
      return false
    }
    tokens += TOKENS_POR_RARIDADE[cosmeticoPorId(id)?.raridade ?? 'comum']
    return true
  })
  return {
    colecao: comTokens(colecao, tokens),
    tipo: envelope.tipo,
    cartas,
    cosmeticos,
    emToken: { cartas: emTokenCartas, cosmeticos: emTokenItens },
    tokens,
  }
}
