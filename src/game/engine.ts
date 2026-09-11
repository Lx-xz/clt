import {
  BASE_ENERGY,
  DAYS_PER_WEEK,
  HAND_SIZE,
  MAX_STRESS,
  MAX_WARNINGS,
  STARTING_MONEY,
  TOTAL_DAYS,
  WEEKLY_BILLS,
  isFriday,
  weekOfDay,
  weekdayOf,
} from './cards'
// as cartas vêm do catálogo, não de um array importado: desde a v0.10 elas
// moram no banco e podem mudar entre uma abertura do site e a próxima
import {
  cartasDesbloqueaveis,
  eventosDoJogo,
  fotografarBaralho,
  fotografarCarta,
  getCard,
  getEvent,
  versaoDoBaralho,
} from './catalogo'
import { condicaoVale, dispararEfeitos, executar, type Acao, type Contexto } from './acoes'
import type { CardId, CardInstance, ClasseDaCarta, DayLog, GameState } from './types'

// ---------------------------------------------------------------- utilidades

let uidCounter = 0
function makeInstance(cardId: CardId): CardInstance {
  uidCounter += 1
  return { uid: `${cardId}-${uidCounter}`, cardId }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function log(state: GameState, message: string) {
  state.log = [message, ...state.log].slice(0, 40)
}

function clone(state: GameState): GameState {
  return structuredClone(state)
}

/**
 * A ponte entre o catálogo de ações e o motor. Comprar, descartar e
 * embaralhar continuam AQUI de propósito — "quando o baralho acaba, o
 * descarte é embaralhado e vira o baralho" é regra do jogo, não de uma carta,
 * e nenhuma carta deveria poder mudá-la.
 *
 * `sorte` entra por aqui em vez de a ação chamar `Math.random()` direto: é o
 * que permite rodar o motor com sorteio determinístico e comparar duas
 * versões jogada por jogada.
 */
function contexto(cartaId?: CardId): Contexto {
  return {
    cartaId,
    comprar: (state, quantas) => draw(state, quantas),
    descartarMao: (state) => discardHand(state),
    descartarUma: (state, aleatoria, porque) => {
      if (state.hand.length === 0) return null
      const alvo = aleatoria ? pick(state.hand) : state.hand[state.hand.length - 1]
      state.hand = state.hand.filter((c) => c.uid !== alvo.uid)
      state.discard.push(alvo)
      const nome = getCard(alvo.cardId).name
      log(state, porque ? `${porque} descartou ${nome}.` : `Descartou ${nome}.`)
      return alvo.cardId
    },
    mostrarDescarte: (state, cartas, porque) => anunciarDescarte(state, cartas, porque),
    pedirDescarte: (state, quantas, porque, entao, cartaId) => {
      // mais do que há na mão vira o que há: pedir 3 de uma mão de 1 travaria
      // o dia esperando uma escolha impossível
      const restam = Math.min(quantas, state.hand.length)
      if (restam <= 0) {
        executar(state, entao, contexto(cartaId ?? undefined))
        return
      }
      state.escolhaDeDescarte = { restam, porque, entao, cartaId }
    },
    criarCarta: (cardId) => makeInstance(cardId),
    log: (state, texto) => log(state, texto),
    sorte: () => Math.random(),
  }
}

// ------------------------------------------------------------------ leitura

export function currentWeek(state: GameState) {
  return weekOfDay(state.day)
}

export function weekNumber(state: GameState) {
  return Math.min(Math.floor((state.day - 1) / DAYS_PER_WEEK) + 1, 4)
}

export function dayLabel(state: GameState) {
  return `Semana ${weekNumber(state)} · ${weekdayOf(state.day)}`
}

export function effectiveCost(state: GameState, cardId: CardId) {
  return Math.max(0, getCard(cardId).cost + state.costModifier)
}

export function canPlay(state: GameState, instance: CardInstance) {
  if (state.phase !== 'dia') return false
  // uma escolha de descarte em aberto é uma pergunta: o dia para até ela ser
  // respondida, senão o jogador escaparia dela jogando outra coisa
  if (state.escolhaDeDescarte) return false
  const card = getCard(instance.cardId)
  // carta neutra não tem classe para ser bloqueada — Sistema Fora do Ar não
  // tem como proibir "nenhum tipo"
  if (card.kind !== null && state.blockedKinds.includes(card.kind)) return false
  // a restrição decide se DÁ para jogar; o efeito decide o que acontece
  // depois. Sem essa separação, "uma vez por run" viraria um booleano novo no
  // estado a cada carta dessas
  const restricao = card.restricao
  if (restricao?.umaVezPorRun && state.usadasNaRun.includes(card.id)) return false
  if (restricao?.exige && !condicaoVale(state, restricao.exige, contexto(card.id))) return false
  return effectiveCost(state, card.id) <= state.energy
}

// -------------------------------------------------------------- compra/robô

function drawOne(state: GameState) {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return
    state.deck = shuffle(state.discard)
    state.discard = []
  }
  const card = state.deck.shift()
  if (card) state.hand.push(card)
}

function draw(state: GameState, amount: number) {
  for (let i = 0; i < amount; i += 1) drawOne(state)
}

function discardHand(state: GameState): CardId[] {
  const saiu = state.hand.map((c) => c.cardId)
  state.discard.push(...state.hand)
  state.hand = []
  return saiu
}

/**
 * Registra um descarte para a mesa mostrar. Só o descarte causado por efeito
 * passa por aqui: o de fim de dia não entra, porque o dia está acabando de
 * qualquer jeito e anunciá-lo seria barulho.
 */
function anunciarDescarte(state: GameState, cartas: CardId[], porque: string) {
  if (cartas.length === 0) return
  const selo = (state.ultimoDescarte?.selo ?? 0) + 1
  state.ultimoDescarte = { cartas, porque, selo }
}

// ------------------------------------------------------------ início da run

export function createRun(equipped: CardId[]): GameState {
  const deck = equipped.flatMap((id) => {
    const card = getCard(id)
    const copies = card.starter ? (card.copies ?? 1) : 1
    return Array.from({ length: copies }, () => makeInstance(id))
  })

  const state: GameState = {
    runId: crypto.randomUUID(),
    // o retrato do baralho é tirado AQUI, uma vez só: é a única parte do
    // versionamento que não dá para acrescentar depois
    baralho: { versao: versaoDoBaralho(), cartas: fotografarBaralho(equipped) },
    startedAt: new Date().toISOString(),
    maxCombo: 0,
    cardsPlayed: 0,
    daysNoRest: 0,
    maxDaysNoRest: 0,
    day: 0,
    phase: 'evento',
    energy: 0,
    stress: 0,
    productivity: 0,
    money: STARTING_MONEY,
    warnings: 0,
    informalWarnings: 0,
    weekProductivity: 0,
    dailyQuota: 0,
    tomorrow: { energy: 0, quota: 0 },
    passiveProductivity: 0,
    salaryBonus: 0,
    usadasNaRun: [],
    deck: shuffle(deck),
    hand: [],
    discard: [],
    playedToday: [],
    ultimoDescarte: null,
    escolhaDeDescarte: null,
    streakKind: null,
    streakCount: 0,
    lastCombo: null,
    fridayStep: null,
    fridayResult: null,
    maoDoDia: HAND_SIZE,
    blockedKinds: [],
    costModifier: 0,
    currentEvent: null,
    eventRevealed: false,
    pendingEventChoice: false,
    lastEventChoice: null,
    rewardOptions: [],
    history: [],
    log: [],
    outcome: 'jogando',
  }

  return startDay(state)
}

// -------------------------------------------------------------- loop do dia

function startDay(input: GameState): GameState {
  const state = clone(input)
  state.day += 1
  state.phase = 'evento'
  state.energy = Math.max(0, BASE_ENERGY - state.stress + state.tomorrow.energy)
  state.productivity = state.passiveProductivity
  state.dailyQuota = currentWeek(state).dailyQuota + state.tomorrow.quota
  state.tomorrow = { energy: 0, quota: 0 }
  state.maoDoDia = HAND_SIZE
  state.blockedKinds = []
  state.costModifier = 0
  state.pendingEventChoice = false
  state.lastEventChoice = null
  state.playedToday = []
  state.ultimoDescarte = null
  state.escolhaDeDescarte = null
  state.streakKind = null
  state.streakCount = 0
  state.lastCombo = null

  if (state.passiveProductivity > 0) {
    log(state, `Automatizar rende +${state.passiveProductivity} produtividade antes de começar.`)
  }

  // O evento entra virado para baixo. Nada acontece até o jogador revelar,
  // e a mão só é comprada depois — a ordem que o README descreve.
  state.currentEvent = pick(eventosDoJogo()).id
  state.eventRevealed = false
  return state
}

/** Vira a carta de evento: aplica o efeito e compra a mão do dia. */
export function revealEvent(input: GameState): GameState {
  const state = clone(input)
  if (state.phase !== 'evento' || state.eventRevealed || !state.currentEvent) return input

  const event = getEvent(state.currentEvent)
  const ctx = contexto()
  state.eventRevealed = true
  log(state, `${dayLabel(state)} — evento: ${event.name}.`)

  // o evento ambíguo não faz nada sozinho: quem carrega o efeito é a escolha
  if (event.choices) {
    state.pendingEventChoice = true
    return state
  }

  dispararEfeitos(state, event.efeitos, 'aoRevelar', ctx)
  draw(state, state.maoDoDia)
  // e só depois da mão chegar vem o que precisa dela (a Fofoca de Corredor)
  dispararEfeitos(state, event.efeitos, 'aposComprar', ctx)
  state.phase = 'dia'
  return checkDefeat(state)
}

export function chooseEventOption(input: GameState, index: 0 | 1): GameState {
  const state = clone(input)
  if (!state.pendingEventChoice || !state.currentEvent) return state
  const event = getEvent(state.currentEvent)
  const choice = event.choices?.[index]
  if (!choice) return state

  const ctx = contexto()
  executar(state, choice.acoes, ctx)

  log(state, `${event.name}: você escolheu "${choice.label}".`)
  state.pendingEventChoice = false
  state.lastEventChoice = index
  draw(state, state.maoDoDia)
  dispararEfeitos(state, event.efeitos, 'aposComprar', ctx)
  state.phase = 'dia'
  return checkDefeat(state)
}

// ------------------------------------------------------------ jogar cartas

export function playCard(input: GameState, uid: string): GameState {
  const state = clone(input)
  const instance = state.hand.find((c) => c.uid === uid)
  if (!instance || !canPlay(state, instance)) return input

  const card = getCard(instance.cardId)
  state.energy -= effectiveCost(state, card.id)
  state.hand = state.hand.filter((c) => c.uid !== uid)
  state.discard.push(instance)

  // TUDO que a carta faz vem da lista de ações dela — inclusive a segunda
  // reunião do dia, o descarte do Foco Total e o sorteio do Pedir Aumento.
  // O motor não conhece o id de carta nenhuma, e é isso que deixa carta nova
  // nascer só de dado.
  dispararEfeitos(state, card.efeitos, 'aoJogar', contexto(card.id))

  state.playedToday.push(card.id)
  if (!state.usadasNaRun.includes(card.id)) state.usadasNaRun.push(card.id)
  state.cardsPlayed += 1
  log(state, `Jogou ${card.name}.`)
  aplicarEmbalo(state, card.kind)
  return checkDefeat(state)
}

/**
 * O jogador escolheu qual carta descartar.
 *
 * Isto existe porque "descarte 1 para comprar 1" não é a mesma coisa que
 * "descarte 1 ao acaso": a primeira é uma decisão, e decisão precisa de mão à
 * mostra. Enquanto a escolha está em pé o dia não anda — nem outra carta, nem
 * fechar o dia —, e quando a última carta é escolhida o `entao` roda: é ele
 * que entrega a carta nova, o recurso, o que a carta tiver prometido.
 */
export function escolherParaDescartar(input: GameState, uid: string): GameState {
  const state = clone(input)
  const pedido = state.escolhaDeDescarte
  if (!pedido) return input

  const alvo = state.hand.find((c) => c.uid === uid)
  if (!alvo) return input

  state.hand = state.hand.filter((c) => c.uid !== uid)
  state.discard.push(alvo)
  log(state, `${pedido.porque} descartou ${getCard(alvo.cardId).name}.`)
  anunciarDescarte(state, [alvo.cardId], pedido.porque)

  const restam = pedido.restam - 1
  // a mão pode ter acabado antes da conta fechar (uma carta que pede 2 numa
  // mão de 2, sendo ela mesma uma delas): acabou a mão, acabou a escolha
  if (restam > 0 && state.hand.length > 0) {
    state.escolhaDeDescarte = { ...pedido, restam }
    return state
  }

  state.escolhaDeDescarte = null
  executar(state, pedido.entao, contexto(pedido.cartaId ?? undefined))
  return checkDefeat(state)
}

// ------------------------------------------------------------------ embalo

/** O que cada classe rende por nível de embalo. */
const EMBALO: Record<Exclude<ClasseDaCarta, null>, { rotulo: string; efeito: (s: GameState, n: number) => string }> = {
  tarefa: {
    rotulo: 'tarefa',
    efeito: (s, n) => {
      s.productivity += n
      return `+${n} produtividade`
    },
  },
  descanso: {
    rotulo: 'descanso',
    efeito: (s, n) => {
      s.energy += n
      return `+${n} energia`
    },
  },
  grana: {
    rotulo: 'grana',
    efeito: (s, n) => {
      s.money += n * 10
      return `+R$ ${n * 10}`
    },
  },
  social: {
    rotulo: 'social',
    efeito: (s, n) => {
      s.stress = Math.max(0, s.stress - n)
      return `−${n} estresse`
    },
  },
}

/**
 * Duas cartas seguidas da mesma classe rendem bônus; a terceira em diante
 * rende o dobro. É o que faz a ordem das jogadas importar.
 */
function aplicarEmbalo(state: GameState, kind: ClasseDaCarta) {
  // A carta neutra QUEBRA o embalo e não começa nenhum. "Sem tipo" é uma
  // troca de assunto como qualquer outra; deixá-la atravessar o embalo em
  // silêncio seria um combo escondido, que ninguém leria na carta.
  if (kind === null) {
    state.streakKind = null
    state.streakCount = 0
    state.lastCombo = null
    return
  }
  if (state.streakKind === kind) {
    state.streakCount += 1
  } else {
    state.streakKind = kind
    state.streakCount = 1
  }

  state.maxCombo = Math.max(state.maxCombo, state.streakCount)

  if (state.streakCount < 2) {
    state.lastCombo = null
    return
  }

  const nivel = state.streakCount >= 3 ? 2 : 1
  const ganho = EMBALO[kind].efeito(state, nivel)
  state.lastCombo = `Embalo ${EMBALO[kind].rotulo} ×${state.streakCount}: ${ganho}`
  log(state, state.lastCombo)
}

/** Quanto a próxima carta desta classe renderia de embalo, para a mesa avisar. */
export function embaloAtual(state: GameState): { kind: Exclude<ClasseDaCarta, null>; count: number } | null {
  if (!state.streakKind || state.streakCount < 1) return null
  return { kind: state.streakKind, count: state.streakCount }
}

// ---------------------------------------------------------------- fim do dia

export function endDay(input: GameState): GameState {
  let state = clone(input)
  if (state.phase !== 'dia') return input
  // a escolha de descarte é uma pergunta em aberto; o dia não fecha por cima
  if (state.escolhaDeDescarte) return input

  const metQuota = state.productivity >= state.dailyQuota
  if (!metQuota) {
    state.stress += 2
    log(state, `Cota não batida (${state.productivity}/${state.dailyQuota}): +2 estresse e o chefe anotou.`)
  } else {
    log(state, `Cota batida (${state.productivity}/${state.dailyQuota}).`)
  }

  // o evento que só cobra no fim do dia (Cobrança no Zap). Depois da
  // penalidade de cota, porque é dela que o "se" depende
  if (state.currentEvent) {
    dispararEfeitos(state, getEvent(state.currentEvent).efeitos, 'fimDoDia', contexto())
  }

  state.weekProductivity += state.productivity

  // medido ANTES de descartar: a energia que sobrou sem uso e as cartas que
  // ficaram na mão sem serem jogadas. As duas dizem o que o jogador deixou na
  // mesa, e nenhuma delas dá para deduzir depois
  const energiaSobrando = state.energy
  const naoJogadas = state.hand.map((i) => i.cardId)

  const descansouHoje = state.playedToday.some((id) => getCard(id).kind === 'descanso')
  state.daysNoRest = descansouHoje ? 0 : state.daysNoRest + 1
  state.maxDaysNoRest = Math.max(state.maxDaysNoRest, state.daysNoRest)

  discardHand(state)

  state = checkDefeat(state)

  // fecha o resumo do dia antes de qualquer coisa poder zerar playedToday —
  // é o que "meus jogos" usa para reabrir a run jogada por jogada
  const diaFechado: DayLog = {
    day: state.day,
    eventId: state.currentEvent,
    eventChoice: state.lastEventChoice,
    cardsPlayed: [...state.playedToday],
    notPlayed: naoJogadas,
    energyLeft: energiaSobrando,
    productivity: state.productivity,
    quota: state.dailyQuota,
    metQuota,
    stress: state.stress,
    money: state.money,
  }
  state.history = [...state.history, diaFechado]

  if (state.outcome !== 'jogando') return state

  if (isFriday(state.day)) {
    state.phase = 'sexta'
    state.fridayStep = 'salario'
    state.fridayResult = null
    return state
  }

  return startDay(state)
}

// ------------------------------------------------------------ fim da semana

/**
 * A sexta acontece em três passos separados — salário, contas e fim de semana
 * — para o jogador ver cada número entrar e sair, em vez de tudo de uma vez.
 */
export function paySalary(input: GameState): GameState {
  const state = clone(input)
  if (state.phase !== 'sexta' || state.fridayStep !== 'salario') return input

  const week = currentWeek(state)
  const metGoal = state.weekProductivity >= week.weeklyGoal
  const salary = (metGoal ? week.fullSalary : week.reducedSalary) + state.salaryBonus
  state.money += salary
  state.fridayResult = { metGoal, salary }

  if (metGoal) {
    log(state, `Meta semanal batida (${state.weekProductivity}/${week.weeklyGoal}). Salário: R$ ${salary}.`)
  } else {
    state.warnings += 1
    log(state, `Meta semanal falhou (${state.weekProductivity}/${week.weeklyGoal}). Salário reduzido: R$ ${salary} e +1 advertência.`)
  }

  state.fridayStep = 'contas'
  return state
}

export function payBills(input: GameState): GameState {
  const state = clone(input)
  if (state.phase !== 'sexta' || state.fridayStep !== 'contas') return input

  state.money -= WEEKLY_BILLS
  log(state, `Contas do mês: −R$ ${WEEKLY_BILLS}.`)

  if (state.money < 0) {
    state.outcome = 'despejo'
    state.phase = 'fim'
    state.fridayStep = null
    return state
  }

  state.fridayStep = 'descanso'
  return state
}

export function restWeekend(input: GameState): GameState {
  let state = clone(input)
  if (state.phase !== 'sexta' || state.fridayStep !== 'descanso') return input

  state.stress = Math.max(0, state.stress - 3)
  state.weekProductivity = 0
  state.fridayStep = null
  log(state, 'Fim de semana: −3 estresse.')

  state = checkDefeat(state)
  if (state.outcome !== 'jogando') return state

  if (state.day >= TOTAL_DAYS) {
    state.outcome = 'vitoria'
    state.phase = 'fim'
    log(state, `Mês sobrevivido com R$ ${state.money}.`)
    return state
  }

  state.phase = 'recompensa'
  state.rewardOptions = shuffle(cartasDesbloqueaveis().map((c) => c.id)).slice(0, 3)
  return state
}

export function chooseReward(input: GameState, cardId: CardId): GameState {
  const state = clone(input)
  if (state.phase !== 'recompensa' || !state.rewardOptions.includes(cardId)) return input
  state.discard.push(makeInstance(cardId))
  // a recompensa entra no baralho DEPOIS do retrato inicial, então ela
  // precisa ser fotografada aqui — senão o replay não saberia dizer como era
  // a única carta que a pessoa ganhou no meio da run
  if (!state.baralho.cartas.some((c) => c.id === cardId)) {
    state.baralho.cartas.push(fotografarCarta(getCard(cardId)))
  }
  state.rewardOptions = []
  log(state, `${getCard(cardId).name} entrou no baralho.`)
  return startDay(state)
}

// -------------------------------------------------------------------- morte

function checkDefeat(state: GameState): GameState {
  if (state.outcome !== 'jogando') return state
  if (state.stress >= MAX_STRESS) {
    state.stress = MAX_STRESS
    state.outcome = 'burnout'
    state.phase = 'fim'
    log(state, 'Estresse chegou a 10. Burnout.')
  } else if (state.warnings >= MAX_WARNINGS) {
    state.outcome = 'demissao'
    state.phase = 'fim'
    log(state, 'Três advertências. Demissão.')
  }
  return state
}
