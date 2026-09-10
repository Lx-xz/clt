import type { ActionCard, WeekConfig } from './types'

export const ACTION_CARDS: ActionCard[] = [
  // --- baralho inicial (15 cartas) ---
  { id: 'tarefa-simples', name: 'Tarefa Simples', cost: 3, kind: 'tarefa', text: '+2 produtividade', starter: true, copies: 4 },
  { id: 'planilha-infinita', name: 'Planilha Infinita', cost: 2, kind: 'tarefa', text: '+1 produtividade', starter: true, copies: 2 },
  { id: 'reuniao', name: 'Reunião', cost: 2, kind: 'social', text: '+1 produtividade. Se for a 2ª reunião do dia: +1 estresse e nenhuma produtividade.', starter: true, copies: 2 },
  { id: 'cafe', name: 'Café', cost: 0, kind: 'descanso', text: '+3 energia, +1 estresse', starter: true, copies: 2 },
  { id: 'hora-extra', name: 'Hora Extra', cost: 4, kind: 'grana', text: '+R$ 30, +2 estresse', starter: true, copies: 2 },
  { id: 'freela', name: 'Freela', cost: 5, kind: 'grana', text: '+R$ 50', starter: true, copies: 1 },
  { id: 'enrolar-no-corredor', name: 'Enrolar no Corredor', cost: 1, kind: 'descanso', text: '−1 estresse', starter: true, copies: 1 },
  { id: 'almoco-decente', name: 'Almoço Decente', cost: 1, kind: 'descanso', text: '+2 energia', starter: true, copies: 1 },

  // --- desbloqueáveis (recompensa semanal) ---
  { id: 'atalho-no-sistema', name: 'Atalho no Sistema', cost: 3, kind: 'tarefa', text: '+3 produtividade', starter: false },
  { id: 'delegar', name: 'Delegar', cost: 1, kind: 'social', text: '+2 produtividade, +1 estresse (alguém vai reclamar)', starter: false },
  { id: 'cafe-duplo', name: 'Café Duplo', cost: 0, kind: 'descanso', text: '+5 energia, +2 estresse', starter: false },
  { id: 'terapia', name: 'Terapia', cost: 2, kind: 'descanso', text: '−3 estresse', starter: false },
  { id: 'vale-refeicao', name: 'Vale-Refeição', cost: 0, kind: 'grana', text: '+R$ 20', starter: false },
  { id: 'home-office', name: 'Home Office', cost: 2, kind: 'tarefa', text: '+2 produtividade, −1 estresse', starter: false },
  { id: 'foco-total', name: 'Foco Total', cost: 4, kind: 'tarefa', text: '+4 produtividade, mas descarta o resto da mão', starter: false },
  { id: 'puxar-o-saco', name: 'Puxar o Saco', cost: 2, kind: 'social', text: 'Cancela 1 advertência (uma vez por run)', starter: false },
  { id: 'freela-grande', name: 'Freela Grande', cost: 6, kind: 'grana', text: '+R$ 90, +2 estresse', starter: false },
  { id: 'soneca-no-banheiro', name: 'Soneca no Banheiro', cost: 1, kind: 'descanso', text: '+2 energia, −1 estresse', starter: false },
  { id: 'automatizar', name: 'Automatizar', cost: 5, kind: 'tarefa', text: '+2 produtividade agora e +1 produtividade em todos os dias seguintes', starter: false },
  { id: 'pedir-aumento', name: 'Pedir Aumento', cost: 3, kind: 'social', text: '50%: salário +R$ 100 pelo resto da run. 50%: +3 estresse.', starter: false },
]

export const CARDS_BY_ID: Record<string, ActionCard> = Object.fromEntries(
  ACTION_CARDS.map((c) => [c.id, c]),
)

export const STARTER_CARDS = ACTION_CARDS.filter((c) => c.starter)
export const UNLOCKABLE_CARDS = ACTION_CARDS.filter((c) => !c.starter)

export function getCard(id: string): ActionCard {
  const card = CARDS_BY_ID[id]
  if (!card) throw new Error(`Carta desconhecida: ${id}`)
  return card
}

export const WEEKS: WeekConfig[] = [
  { week: 1, dailyQuota: 3, weeklyGoal: 16, fullSalary: 400, reducedSalary: 250 },
  { week: 2, dailyQuota: 3, weeklyGoal: 18, fullSalary: 400, reducedSalary: 250 },
  { week: 3, dailyQuota: 4, weeklyGoal: 22, fullSalary: 450, reducedSalary: 280 },
  { week: 4, dailyQuota: 4, weeklyGoal: 25, fullSalary: 450, reducedSalary: 280 },
]

export const DAYS_PER_WEEK = 5
export const TOTAL_DAYS = WEEKS.length * DAYS_PER_WEEK
export const WEEKLY_BILLS = 300
export const STARTING_MONEY = 100
export const MAX_STRESS = 10
export const MAX_WARNINGS = 3
export const BASE_ENERGY = 10
export const HAND_SIZE = 5

export const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']

export function weekOfDay(day: number): WeekConfig {
  const index = Math.min(Math.floor((day - 1) / DAYS_PER_WEEK), WEEKS.length - 1)
  return WEEKS[index]
}

export function weekdayOf(day: number): string {
  return WEEKDAY_NAMES[(day - 1) % DAYS_PER_WEEK]
}

export function isFriday(day: number): boolean {
  return day % DAYS_PER_WEEK === 0
}
