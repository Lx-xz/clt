export type CardId = string

/** Categoria usada por eventos que bloqueiam um tipo de jogada (ex.: Sistema Fora do Ar). */
export type CardKind = 'tarefa' | 'descanso' | 'grana' | 'social'

export interface ActionCard {
  id: CardId
  name: string
  cost: number
  kind: CardKind
  text: string
  /** Cartas iniciais já vêm desbloqueadas; as demais entram como recompensa semanal. */
  starter: boolean
  /** Quantas cópias entram no baralho inicial. */
  copies?: number
}

export type EventTone = 'negativo' | 'positivo' | 'ambiguo'

export interface EventChoice {
  label: string
  text: string
}

export interface EventCard {
  id: CardId
  name: string
  tone: EventTone
  text: string
  choices?: [EventChoice, EventChoice]
}

/** Uma instância de carta na mão/baralho (várias cópias da mesma carta). */
export interface CardInstance {
  uid: string
  cardId: CardId
}

/**
 * O resumo de um dia já fechado — o que "meus jogos" mostra ao reabrir uma
 * run terminada, jogada por jogada. Guardado em GameState.history e, ao fim
 * da run, enviado ao banco dentro de runs.details.
 */
export interface DayLog {
  day: number
  eventId: CardId | null
  /** Qual opção foi escolhida, se o evento do dia era ambíguo. */
  eventChoice: 0 | 1 | null
  /** As cartas jogadas naquele dia, na ordem em que foram jogadas. */
  cardsPlayed: CardId[]
  /** As que ficaram na mão e foram descartadas sem jogar. */
  notPlayed: CardId[]
  /** Energia que sobrou sem uso quando o dia fechou. */
  energyLeft: number
  productivity: number
  quota: number
  metQuota: boolean
  /** Estresse e dinheiro ao final do dia, depois da penalidade de cota. */
  stress: number
  money: number
}

export type Phase = 'evento' | 'dia' | 'sexta' | 'recompensa' | 'fim'

export type FridayStep = 'salario' | 'contas' | 'descanso' | null

export interface GameState {
  /** Identifica esta run de verdade, para o banco nunca registrar a mesma
   *  run duas vezes (duas abas, uma retentativa de rede). Não aparece na
   *  interface. */
  runId: string
  /** Quando a run começou (ISO). Com o `ended_at` do banco dá a duração. */
  startedAt: string
  /** Maior embalo alcançado em qualquer dia da run. */
  maxCombo: number
  /** Quantas cartas foram jogadas na run inteira, somando todos os dias. */
  cardsPlayed: number
  /** Dias seguidos sem jogar carta de descanso — o atual e o recorde da run. */
  daysNoRest: number
  maxDaysNoRest: number
  day: number // 1..20
  phase: Phase
  energy: number
  stress: number
  productivity: number
  money: number
  warnings: number
  informalWarnings: number

  weekProductivity: number
  dailyQuota: number // cota do dia já com ajustes de evento
  tomorrow: { energy: number; quota: number } // efeitos adiados

  /** Bônus permanente de produtividade por dia (carta Automatizar). */
  passiveProductivity: number
  salaryBonus: number
  usedPuxarOSaco: boolean

  deck: CardInstance[]
  hand: CardInstance[]
  discard: CardInstance[]
  /** O que já foi jogado hoje, para o tapete mostrar o dia se montando. */
  playedToday: CardId[]

  /** Embalo: cartas seguidas da mesma classe rendem bônus crescente. */
  streakKind: CardKind | null
  streakCount: number
  /** Última mensagem de embalo, para a mesa mostrar o que aconteceu. */
  lastCombo: string | null

  /** Passo da sexta-feira, para salário, contas e descanso não passarem juntos. */
  fridayStep: FridayStep
  fridayResult: { metGoal: boolean; salary: number } | null

  meetingsToday: number
  blockedKinds: CardKind[]
  costModifier: number
  currentEvent: CardId | null
  /** O evento entra virado para baixo; só o clique do jogador aplica o efeito. */
  eventRevealed: boolean
  pendingEventChoice: boolean
  /** Escolha feita hoje num evento ambíguo — some no dia seguinte. Só existe
   *  para o resumo do dia entrar em `history` com a escolha certa. */
  lastEventChoice: 0 | 1 | null

  rewardOptions: CardId[]
  /** Um resumo por dia fechado, para reabrir a run jogada por jogada depois. */
  history: DayLog[]
  log: string[]
  outcome: 'jogando' | 'vitoria' | 'burnout' | 'demissao' | 'despejo'
}

/** Coleção persistida entre runs (o "baralho" fora da partida). */
export interface Collection {
  /** Cartas montadas no baralho da próxima run. */
  equipped: CardId[]
  /** Desbloqueadas, mas fora do baralho. */
  unequipped: CardId[]
}

export interface WeekConfig {
  week: number
  dailyQuota: number
  weeklyGoal: number
  fullSalary: number
  reducedSalary: number
}
