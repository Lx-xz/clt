import {
  AlarmClock,
  AlertTriangle,
  Angry,
  Award,
  BadgeDollarSign,
  Banknote,
  BedDouble,
  BedSingle,
  Beer,
  Bot,
  Briefcase,
  Cake,
  CalendarClock,
  CalendarDays,
  Car,
  CircleDashed,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Coffee,
  CupSoda,
  Eraser,
  FileWarning,
  Flame,
  Footprints,
  Forward,
  Handshake,
  House,
  Keyboard,
  Laptop,
  Layers,
  Lock,
  MessagesSquare,
  Moon,
  PartyPopper,
  PhoneCall,
  Presentation,
  Receipt,
  Scale,
  ServerCrash,
  Sheet,
  Shuffle,
  Smartphone,
  Sofa,
  Sun,
  Target,
  Thermometer,
  ThumbsUp,
  Ticket,
  TrendingUp,
  UserX,
  Users,
  UtensilsCrossed,
  WifiOff,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CardId, ClasseDaCarta, EventTone } from '@/game/types'

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

/**
 * A ARTE de cada carta: um desenho por carta, não por classe.
 *
 * A arte do topo era o ícone da classe em tamanho grande — então todas as
 * tarefas tinham a mesma prancheta e todos os eventos negativos a mesma
 * chama, e no leque as cartas só se distinguiam lendo o nome. O ícone da
 * CLASSE continua no canto (é o que o embalo e o bloqueio de evento olham); a
 * arte agora diz qual carta é.
 *
 * Mora aqui, por id, e não no banco: a tabela `cartas` não tem coluna para
 * isso, e abrir uma migração só por ela não vale — o CLAUDE.md combina que a
 * próxima mexida no schema leva as conquistas junto. Carta nova criada no lab
 * cai no ícone da classe até ganhar uma linha aqui (ou a coluna `icone`).
 */
const ARTE_POR_CARTA: Record<CardId, LucideIcon> = {
  // ação
  'tarefa-simples': ClipboardCheck,
  'planilha-infinita': Sheet,
  reuniao: Presentation,
  cafe: Coffee,
  'hora-extra': Clock,
  freela: Laptop,
  'enrolar-no-corredor': Footprints,
  'almoco-decente': UtensilsCrossed,
  'atalho-no-sistema': Keyboard,
  delegar: Forward,
  'cafe-duplo': CupSoda,
  terapia: Sofa,
  'vale-refeicao': Ticket,
  'home-office': House,
  'foco-total': Target,
  'puxar-o-saco': ThumbsUp,
  'freela-grande': Briefcase,
  'soneca-no-banheiro': BedSingle,
  automatizar: Bot,
  'reorganizar-a-mesa': Shuffle,
  'pedir-aumento': BadgeDollarSign,
  // eventos
  'sistema-fora-do-ar': ServerCrash,
  'reuniao-de-alinhamento': CalendarClock,
  'chefe-de-mau-humor': Angry,
  'relatorio-de-ultima-hora': FileWarning,
  transito: Car,
  'colega-faltou': UserX,
  'ar-condicionado-quebrado': Thermometer,
  'fofoca-de-corredor': MessagesSquare,
  'limpeza-de-mesa': Eraser,
  'internet-caiu': WifiOff,
  'cobranca-no-zap': Smartphone,
  'dormiu-bem': BedDouble,
  'bolo-na-copa': Cake,
  'sexta-de-folga': PartyPopper,
  'elogio-do-chefe': Award,
  'reembolso-atrasado': Receipt,
  'dia-tranquilo': Sun,
  'hora-extra-nao-solicitada': AlarmClock,
  'convite-happy-hour': Beer,
  'freela-de-um-amigo': Handshake,
  'chamado-de-madrugada': PhoneCall,
}

/** A arte de uma carta — a dela, ou a da classe/tom quando ela não tem. */
export function arteDaCarta(id: CardId, reserva: LucideIcon): LucideIcon {
  return ARTE_POR_CARTA[id] ?? reserva
}

export { Lock as LockIcon, Moon as EndDayIcon }
