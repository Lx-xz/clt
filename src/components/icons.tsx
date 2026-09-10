import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ClipboardList,
  Coffee,
  Flame,
  Layers,
  Lock,
  Moon,
  Scale,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CardKind, EventTone } from '@/game/types'

/**
 * Um lugar só para o vocabulário visual: cada função do jogo tem um ícone
 * fixo, então o mesmo conceito aparece igual no painel, na carta e no evento.
 */
export const RESOURCE_ICONS = {
  energia: Zap,
  estresse: Flame,
  produtividade: TrendingUp,
  dinheiro: Banknote,
  semana: CalendarDays,
  advertencias: AlertTriangle,
  baralho: Layers,
} as const satisfies Record<string, LucideIcon>

export const KIND_ICONS: Record<CardKind, LucideIcon> = {
  tarefa: ClipboardList,
  descanso: Coffee,
  grana: Banknote,
  social: Users,
}

export const TONE_ICONS: Record<EventTone, LucideIcon> = {
  negativo: Flame,
  positivo: Coffee,
  ambiguo: Scale,
}

export { Lock as LockIcon, Moon as EndDayIcon }
