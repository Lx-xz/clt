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

/**
 * Um pente — o lucide não tem. É a amostra "igual ao cabelo" da cor da barba:
 * ela não é uma cor, é "a mesma do cabelo", e uma bolinha pintada seria lida
 * como mais uma cor para escolher.
 */
export function PenteIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="5" rx="1.5" />
      <path d="M5.5 10v8M9 10v8M12.5 10v8M16 10v8M19.5 10v6" />
    </svg>
  )
}
