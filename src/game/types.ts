import type { Acao, Efeito, Restricao } from './acoes'
import type { Regras } from './regras'

export type CardId = string

/** Categoria usada por eventos que bloqueiam um tipo de jogada (ex.: Sistema Fora do Ar). */
export type CardKind = 'tarefa' | 'descanso' | 'grana' | 'social'

/**
 * A classe de uma carta, onde `null` é a carta NEUTRA — sem tipo.
 *
 * Neutra não é uma quinta classe: é a ausência de classe, e isso muda duas
 * coisas no jogo. Ela não entra no embalo (não começa nem continua um, e
 * jogar uma QUEBRA o embalo que estava em pé, como qualquer troca de
 * assunto), e nenhum evento de bloqueio de classe a alcança — Sistema Fora
 * do Ar não tem como proibir "nenhum tipo".
 */
export type ClasseDaCarta = CardKind | null

export interface ActionCard {
  id: CardId
  name: string
  cost: number
  kind: ClasseDaCarta
  text: string
  /** O que a carta FAZ, como lista de ações do catálogo (`acoes.ts`). É dado,
   *  não código: carta nova não precisa de uma linha no motor. */
  efeitos: Efeito[]
  /** O que limita poder jogar a carta — diferente do que ela faz ao ser
   *  jogada. Só o Puxar o Saco usa hoje. */
  restricao?: Restricao
  /** Marca a carta que faz mais do que somar recurso. Não muda nada no motor
   *  (a regra dela também é dado); serve para o editor avisar que mexer só
   *  nos números não conta a carta inteira. */
  especial?: boolean
  /** Cartas iniciais já vêm desbloqueadas; as demais entram como recompensa semanal. */
  starter: boolean
  /** Quantas cópias entram no baralho inicial. */
  copies?: number
  /** Carta removida do jogo. Ela CONTINUA no catálogo de propósito: pode
   *  haver alguém no meio de uma run com ela na mão, e o motor precisa saber
   *  o que ela faz para a partida terminar. O que ela não faz mais é entrar
   *  em baralho novo nem sair como recompensa. */
  ativa?: boolean
  /** Em que versão do baralho este formato da carta passou a valer. */
  versao?: number
}

/**
 * A carta como ela era no dia em que a run foi jogada. Vai gravada dentro da
 * run — é o que mantém uma partida antiga legível depois de a carta mudar de
 * custo, de nome, ou deixar de existir. Veja `src/data/balanceamento.ts`.
 */
export interface CartaSnapshot {
  id: CardId
  name: string
  cost: number
  kind: ClasseDaCarta
  text: string
}

export type TipoDeMudanca = 'criada' | 'ajustada' | 'removida'

/**
 * Uma linha do histórico de balanceamento. `oQue` é o número e `porque` é o
 * motivo — e é o `porque` que justifica isto existir: um diff automático
 * sabe dizer "custo 4 → 6" e não sabe dizer por quê.
 */
export interface MudancaDeCarta {
  carta: CardId
  familia: 'acao' | 'evento'
  versao: number
  /** AAAA-MM-DD. */
  data: string
  tipo: TipoDeMudanca
  oQue: string
  porque: string
}

export type EventTone = 'negativo' | 'positivo' | 'ambiguo'

export interface EventChoice {
  label: string
  text: string
  /** O que a escolha faz. Lista vazia é uma escolha que não faz nada
   *  (recusar o freela do amigo), e isso é uma resposta legítima. */
  acoes: Acao[]
}

export interface EventCard {
  id: CardId
  name: string
  tone: EventTone
  /** Como em `ActionCard`: evento removido some do sorteio e continua
   *  legível para quem tem uma run antiga que o cita. */
  ativa?: boolean
  versao?: number
  text: string
  /** O que o evento faz ao ser revelado — mesmo catálogo das cartas. */
  efeitos?: Efeito[]
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
  /** O baralho como ele era quando esta run começou: a versão do
   *  balanceamento e a cópia de cada carta equipada. Sem isto, reabrir uma
   *  partida antiga mostraria a carta de HOJE no lugar da que foi jogada. */
  baralho: { versao: number; cartas: CartaSnapshot[] }
  /** As REGRAS desta run — aluguel, cota, salário, energia base —, copiadas
   *  na criação. O motor lê daqui e não da global de propósito: mexer no
   *  aluguel no meio da tarde não pode mudar o preço de quem já está no
   *  dia 12, e o replay de uma partida antiga tem que continuar batendo. */
  modo: Regras
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
  /** Cartas já jogadas alguma vez nesta run, sem repetir. É o que sustenta
   *  `umaVezPorRun` sem um booleano por carta (era `usedPuxarOSaco`). */
  usadasNaRun: CardId[]

  deck: CardInstance[]
  hand: CardInstance[]
  discard: CardInstance[]
  /** O que já foi jogado hoje, para o tapete mostrar o dia se montando. */
  playedToday: CardId[]

  /**
   * O último descarte causado por uma carta ou evento, para a mesa MOSTRAR
   * o que saiu. Antes disto a mão simplesmente encolhia: a Fofoca de
   * Corredor levava uma carta embora e o jogador não via qual.
   *
   * Só marca descarte causado por efeito. O descarte de fim de dia não entra
   * — o dia está acabando de qualquer jeito, e anunciá-lo seria barulho.
   *
   * `selo` sobe a cada descarte para a mesa distinguir dois descartes
   * iguais seguidos; sem ele o React não teria como saber que aconteceu de
   * novo.
   */
  ultimoDescarte: { cartas: CardId[]; porque: string; selo: number } | null

  /**
   * O dia parado esperando o jogador escolher o que descartar. Enquanto isto
   * existe não dá para jogar outra carta nem fechar o dia — é uma pergunta,
   * e o jogo espera a resposta.
   *
   * `entao` é o que acontece depois de a escolha terminar, e é o que
   * sustenta "descarte 1 para comprar 1" sem uma ação nova para cada troca.
   */
  escolhaDeDescarte: {
    restam: number
    porque: string
    entao: Acao[]
    /** Quem pediu, para o `se` das ações de `entao` continuar valendo. */
    cartaId: CardId | null
  } | null

  /** Embalo: cartas seguidas da mesma classe rendem bônus crescente. */
  streakKind: CardKind | null
  streakCount: number
  /** Última mensagem de embalo, para a mesa mostrar o que aconteceu. */
  lastCombo: string | null

  /** Passo da sexta-feira, para salário, contas e descanso não passarem juntos. */
  fridayStep: FridayStep
  fridayResult: { metGoal: boolean; salary: number } | null

  /** Quantas cartas o dia compra. Volta a HAND_SIZE todo dia; o evento é
   *  quem mexe (Dia Tranquilo compra 7, Internet Caiu compra 3). */
  maoDoDia: number
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
