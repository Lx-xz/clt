import {
  BASE_ENERGY,
  DAYS_PER_WEEK,
  HAND_SIZE,
  MAX_STRESS,
  MAX_WARNINGS,
  STARTING_MONEY,
  TOTAL_DAYS,
  UNLOCKABLE_CARDS,
  WEEKLY_BILLS,
  getCard,
  isFriday,
  weekOfDay,
  weekdayOf,
} from './cards'
import { EVENT_CARDS, getEvent } from './events'
import type { CardId, CardInstance, GameState } from './types'

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
  const card = getCard(instance.cardId)
  if (state.blockedKinds.includes(card.kind)) return false
  if (card.id === 'puxar-o-saco' && (state.usedPuxarOSaco || state.warnings === 0)) return false
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

function discardHand(state: GameState) {
  state.discard.push(...state.hand)
  state.hand = []
}

// ------------------------------------------------------------ início da run

export function createRun(equipped: CardId[]): GameState {
  const deck = equipped.flatMap((id) => {
    const card = getCard(id)
    const copies = card.starter ? (card.copies ?? 1) : 1
    return Array.from({ length: copies }, () => makeInstance(id))
  })

  const state: GameState = {
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
    usedPuxarOSaco: false,
    deck: shuffle(deck),
    hand: [],
    discard: [],
    playedToday: [],
    meetingsToday: 0,
    blockedKinds: [],
    costModifier: 0,
    currentEvent: null,
    eventRevealed: false,
    pendingEventChoice: false,
    rewardOptions: [],
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
  state.meetingsToday = 0
  state.blockedKinds = []
  state.costModifier = 0
  state.pendingEventChoice = false
  state.playedToday = []

  if (state.passiveProductivity > 0) {
    log(state, `Automatizar rende +${state.passiveProductivity} produtividade antes de começar.`)
  }

  // O evento entra virado para baixo. Nada acontece até o jogador revelar,
  // e a mão só é comprada depois — a ordem que o README descreve.
  state.currentEvent = pick(EVENT_CARDS).id
  state.eventRevealed = false
  return state
}

/** Vira a carta de evento: aplica o efeito e compra a mão do dia. */
export function revealEvent(input: GameState): GameState {
  const state = clone(input)
  if (state.phase !== 'evento' || state.eventRevealed || !state.currentEvent) return input

  const event = getEvent(state.currentEvent)
  state.eventRevealed = true
  log(state, `${dayLabel(state)} — evento: ${event.name}.`)

  if (event.choices) {
    state.pendingEventChoice = true
    return state
  }

  const drawCount = applyImmediateEvent(state, event.id)
  draw(state, drawCount)
  if (event.id === 'fofoca-de-corredor' && state.hand.length > 0) {
    const victim = pick(state.hand)
    state.hand = state.hand.filter((c) => c.uid !== victim.uid)
    state.discard.push(victim)
    log(state, `Fofoca de Corredor descartou ${getCard(victim.cardId).name}.`)
  }
  state.phase = 'dia'
  return checkDefeat(state)
}

/** Aplica o efeito imediato do evento e devolve quantas cartas comprar. */
function applyImmediateEvent(state: GameState, eventId: CardId): number {
  switch (eventId) {
    case 'sistema-fora-do-ar':
      state.blockedKinds = ['tarefa']
      break
    case 'reuniao-de-alinhamento':
      state.energy = Math.max(0, state.energy - 3)
      break
    case 'chefe-de-mau-humor':
      state.stress += 2
      break
    case 'relatorio-de-ultima-hora':
      state.dailyQuota += 2
      break
    case 'transito':
      state.energy = Math.max(0, state.energy - 2)
      break
    case 'colega-faltou':
      state.dailyQuota += 1
      state.money += 20
      break
    case 'ar-condicionado-quebrado':
      state.costModifier = 1
      break
    case 'cobranca-no-zap':
      state.stress += 1
      break
    case 'dormiu-bem':
      state.energy += 3
      break
    case 'bolo-na-copa':
      state.stress = Math.max(0, state.stress - 2)
      break
    case 'sexta-de-folga':
      state.dailyQuota = 0
      break
    case 'elogio-do-chefe':
      state.stress = Math.max(0, state.stress - 1)
      state.productivity += 1
      break
    case 'reembolso-atrasado':
      state.money += 40
      break
    case 'dia-tranquilo':
      return HAND_SIZE + 2
    case 'internet-caiu':
      return 3
    default:
      break
  }
  return HAND_SIZE
}

export function chooseEventOption(input: GameState, index: 0 | 1): GameState {
  const state = clone(input)
  if (!state.pendingEventChoice || !state.currentEvent) return state
  const event = getEvent(state.currentEvent)
  const choice = event.choices?.[index]
  if (!choice) return state

  switch (event.id) {
    case 'hora-extra-nao-solicitada':
      if (index === 0) {
        state.money += 40
        state.stress += 3
      } else {
        state.informalWarnings += 1
        if (state.informalWarnings >= 2) {
          state.informalWarnings -= 2
          state.warnings += 1
          log(state, 'Duas advertências informais viraram uma advertência real.')
        }
      }
      break
    case 'convite-happy-hour':
      if (index === 0) {
        state.stress = Math.max(0, state.stress - 3)
        state.tomorrow.energy -= 3
      } else {
        state.stress += 1
      }
      break
    case 'freela-de-um-amigo':
      if (index === 0) {
        state.money += 60
        state.tomorrow.quota += 2
      }
      break
    case 'chamado-de-madrugada':
      if (index === 0) {
        state.money += 25
        state.tomorrow.energy -= 4
      } else {
        state.stress += 2
      }
      break
    default:
      break
  }

  log(state, `${event.name}: você escolheu "${choice.label}".`)
  state.pendingEventChoice = false
  draw(state, HAND_SIZE)
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

  switch (card.id) {
    case 'tarefa-simples':
      state.productivity += 2
      break
    case 'planilha-infinita':
      state.productivity += 1
      break
    case 'reuniao':
      state.meetingsToday += 1
      if (state.meetingsToday >= 2) {
        state.stress += 1
        log(state, 'Segunda reunião do dia: só estresse, nenhuma produtividade.')
      } else {
        state.productivity += 1
      }
      break
    case 'cafe':
      state.energy += 3
      state.stress += 1
      break
    case 'hora-extra':
      state.money += 30
      state.stress += 2
      break
    case 'freela':
      state.money += 50
      break
    case 'enrolar-no-corredor':
      state.stress = Math.max(0, state.stress - 1)
      break
    case 'almoco-decente':
      state.energy += 2
      break
    case 'atalho-no-sistema':
      state.productivity += 3
      break
    case 'delegar':
      state.productivity += 2
      state.stress += 1
      break
    case 'cafe-duplo':
      state.energy += 5
      state.stress += 2
      break
    case 'terapia':
      state.stress = Math.max(0, state.stress - 3)
      break
    case 'vale-refeicao':
      state.money += 20
      break
    case 'home-office':
      state.productivity += 2
      state.stress = Math.max(0, state.stress - 1)
      break
    case 'foco-total':
      state.productivity += 4
      discardHand(state)
      log(state, 'Foco Total: o resto da mão foi descartado.')
      break
    case 'puxar-o-saco':
      state.warnings = Math.max(0, state.warnings - 1)
      state.usedPuxarOSaco = true
      break
    case 'freela-grande':
      state.money += 90
      state.stress += 2
      break
    case 'soneca-no-banheiro':
      state.energy += 2
      state.stress = Math.max(0, state.stress - 1)
      break
    case 'automatizar':
      state.productivity += 2
      state.passiveProductivity += 1
      break
    case 'pedir-aumento':
      if (Math.random() < 0.5) {
        state.salaryBonus += 100
        log(state, 'Pedir Aumento: deu certo! Salário +R$ 100 pelo resto da run.')
      } else {
        state.stress += 3
        log(state, 'Pedir Aumento: "vamos ver no próximo ciclo". +3 estresse.')
      }
      break
    default:
      break
  }

  state.playedToday.push(card.id)
  log(state, `Jogou ${card.name}.`)
  return checkDefeat(state)
}

// ---------------------------------------------------------------- fim do dia

export function endDay(input: GameState): GameState {
  let state = clone(input)
  if (state.phase !== 'dia') return input

  const metQuota = state.productivity >= state.dailyQuota
  if (!metQuota) {
    state.stress += 2
    log(state, `Cota não batida (${state.productivity}/${state.dailyQuota}): +2 estresse e o chefe anotou.`)
    if (state.currentEvent === 'cobranca-no-zap') {
      state.stress += 2
      log(state, 'A cobrança no grupo do zap piorou: +2 estresse extra.')
    }
  } else {
    log(state, `Cota batida (${state.productivity}/${state.dailyQuota}).`)
  }

  state.weekProductivity += state.productivity
  discardHand(state)

  state = checkDefeat(state)
  if (state.outcome !== 'jogando') return state

  if (isFriday(state.day)) {
    state.phase = 'sexta'
    return state
  }

  return startDay(state)
}

// ------------------------------------------------------------ fim da semana

export function resolveFriday(input: GameState): GameState {
  let state = clone(input)
  if (state.phase !== 'sexta') return input

  const week = currentWeek(state)
  const metGoal = state.weekProductivity >= week.weeklyGoal
  const salary = (metGoal ? week.fullSalary : week.reducedSalary) + state.salaryBonus
  state.money += salary
  if (metGoal) {
    log(state, `Meta semanal batida (${state.weekProductivity}/${week.weeklyGoal}). Salário: R$ ${salary}.`)
  } else {
    state.warnings += 1
    log(state, `Meta semanal falhou (${state.weekProductivity}/${week.weeklyGoal}). Salário reduzido: R$ ${salary} e +1 advertência.`)
  }

  state.money -= WEEKLY_BILLS
  log(state, `Contas do mês: −R$ ${WEEKLY_BILLS}.`)
  if (state.money < 0) {
    state.outcome = 'despejo'
    state.phase = 'fim'
    return state
  }

  state.stress = Math.max(0, state.stress - 3)
  state.weekProductivity = 0
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
  state.rewardOptions = shuffle(UNLOCKABLE_CARDS.map((c) => c.id)).slice(0, 3)
  return state
}

export function chooseReward(input: GameState, cardId: CardId): GameState {
  const state = clone(input)
  if (state.phase !== 'recompensa' || !state.rewardOptions.includes(cardId)) return input
  state.discard.push(makeInstance(cardId))
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
