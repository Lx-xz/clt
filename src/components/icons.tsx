import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CircleDashed,
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
import type { ClasseDaCarta, EventTone } from '@/game/types'

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

const ICONE_POR_CLASSE = {
  tarefa: ClipboardList,
  descanso: Coffee,
  grana: Banknote,
  social: Users,
} as const satisfies Record<string, LucideIcon>

/**
 * O ícone da classe. A carta NEUTRA (sem classe) recebe o círculo tracejado:
 * um contorno sem miolo lê como "não é de nenhum tipo" sem inventar uma
 * quinta família que o jogador teria que aprender.
 */
export function iconeDaClasse(classe: ClasseDaCarta): LucideIcon {
  return classe === null ? CircleDashed : ICONE_POR_CLASSE[classe]
}

/** O nome da classe para ler na tela. */
export function nomeDaClasse(classe: ClasseDaCarta): string {
  return classe ?? 'sem tipo'
}

export const TONE_ICONS: Record<EventTone, LucideIcon> = {
  negativo: Flame,
  positivo: Coffee,
  ambiguo: Scale,
}

export { Lock as LockIcon, Moon as EndDayIcon }
