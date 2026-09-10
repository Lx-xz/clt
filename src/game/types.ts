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

export type Phase = 'evento' | 'dia' | 'sexta' | 'recompensa' | 'fim'

export type FridayStep = 'salario' | 'contas' | 'descanso' | null

export interface GameState {
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

  rewardOptions: CardId[]
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
