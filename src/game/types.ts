import type { Acao, Efeito, Recurso, Restricao } from './acoes'
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
  /** Cartas iniciais já vêm desbloqueadas; as demais saem como recompensa no fim da run. */
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
  /** Quão difícil é ganhar a carta no fim da run, e quantas cópias dela
   *  cabem na coleção (`copiasMaximas`). Ausente é `comum`. */
  raridade?: Raridade
  /** O que a carta cobra ALÉM da energia (`cost`): dinheiro, estresse,
   *  produtividade. Pago antes dos efeitos; sem saldo de dinheiro ou de
   *  produtividade, a carta não sai da mão. Veja `src/game/custos.ts`.
   *  Substitui o `custoDinheiro` da v0.15, que é traduzido na leitura. */
  custos?: Custo[]
}

/** Da mais fácil à mais difícil de ganhar. Os ids não têm acento porque
 *  moram numa coluna do banco; o nome com acento é `NOMES_DE_RARIDADE`. */
export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria'

/** Os recursos que podem ser custo além da energia, que é o `cost`. */
export type RecursoDeCusto = Exclude<Recurso, 'energia'>

export interface Custo {
  qual: RecursoDeCusto
  quanto: number
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
  /** Só existe na carta que cobra algo além da energia (v0.17). */
  custos?: Custo[]
  /** O formato da v0.15, que continua dentro das runs gravadas antes da
   *  lista de custos. Quem lê é `custosDe()`; nada novo escreve isto. */
  custoDinheiro?: number
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

/** `recompensa` é a fase da recompensa semanal, que saiu na v0.15. Continua
 *  no tipo porque um save gravado no meio dela ainda pode chegar —
 *  `pularRecompensaSemanal` o tira de lá. */
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

  /**
   * A fila do dia seguinte. Roda no COMEÇO do próximo `startDay`, depois dos
   * recorrentes e antes de o evento ser sorteado.
   *
   * Era `tomorrow: { energy, quota }` — dois números escolhidos a dedo. Uma
   * lista de ações adia qualquer coisa: um recurso, uma carta, uma mensagem.
   * Cuidado com um detalhe de momento: quando a fila roda, **a mão do dia
   * ainda não foi comprada** (ela só chega em `revealEvent`), então adiar
   * `comprar`/`descartar` age sobre uma mão vazia.
   */
  amanha: Acao[]

  /** O que continua valendo depois de hoje — o que era `passiveProductivity`
   *  (todo dia) e `salaryBonus` (toda semana), agora um só. */
  recorrentes: Recorrente[]
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

  /**
   * A pergunta que uma CARTA fez ao jogador, no mesmo espírito do
   * `escolhaDeDescarte`: o dia para até alguém responder.
   *
   * `resto` é o que faltava rodar da lista quando a pergunta apareceu. Sem
   * ele, as ações depois de um `escolha` aconteceriam antes da resposta —
   * contar o fim antes do começo.
   */
  escolhaAberta: {
    opcoes: { rotulo: string; acoes: Acao[] }[]
    cartaId: CardId | null
    resto: Acao[]
  } | null

  /** A última mensagem de carta ou evento, para a mesa MOSTRAR. Mesmo padrão
   *  do `ultimoDescarte`, `selo` incluído — e pelo mesmo motivo. */
  ultimaMensagem: { texto: string; selo: number } | null

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
  /** O que os eventos de hoje somam aos custos ALÉM da energia (a energia é
   *  o `costModifier`, que já existia). Opcional para o save de antes dele
   *  continuar válido sem subir a chave; zera todo dia, em `startDay`. */
  modCustos?: Partial<Record<RecursoDeCusto, number>>
  currentEvent: CardId | null
  /** O evento entra virado para baixo; só o clique do jogador aplica o efeito. */
  eventRevealed: boolean
  pendingEventChoice: boolean
  /** Escolha feita hoje num evento ambíguo — some no dia seguinte. Só existe
   *  para o resumo do dia entrar em `history` com a escolha certa. */
  lastEventChoice: 0 | 1 | null

  /** As cartas que o recibo de fim oferecia para a coleção (v0.15). Desde
   *  as missões diárias (v0.16) carta vem de envelope e isto fica vazio; o
   *  campo continua para o save que terminou com a escolha pendente. */
  rewardOptions: CardId[]
  /** `undefined`: o fim ainda não ofereceu nada. `null`: ofereceu e a
   *  pessoa não escolheu. Opcional para o save de antes dela continuar
   *  válido sem subir a chave do localStorage. */
  recompensaEscolhida?: CardId | null
  /** Os envelopes que a partida deu, já com as cartas dentro — gravados na
   *  jogada que a encerra, antes de ela subir para `runs`, para o recibo e o
   *  replay mostrarem. Opcional: campo obrigatório novo descartaria o save
   *  de quem está no meio de uma run. */
  envelopesGanhos?: EnvelopeGanho[]
  /** Um resumo por dia fechado, para reabrir a run jogada por jogada depois. */
  history: DayLog[]
  /** A narrativa da run, em ordem cronológica. Era `string[]` com teto de 40
   *  linhas — o que cobria três dias — porque **ninguém lia**: o campo era
   *  escrito desde sempre e não era desenhado em tela nenhuma. Agora ele é o
   *  botão Histórico da mesa, e por isso carrega o dia e guarda a run toda. */
  log: LinhaDoLog[]
  /** Cartas jogadas nesta semana, sem repetir — é o sujeito do gatilho
   *  `fimDaSemana`. Zera junto com `weekProductivity`, no descanso. */
  jogadasNaSemana: CardId[]
  outcome: 'jogando' | 'vitoria' | 'burnout' | 'demissao' | 'despejo'
}

export interface LinhaDoLog {
  dia: number
  texto: string
}

/**
 * Um efeito que volta sozinho, todo dia ou toda semana.
 *
 * `restam` é a duração JÁ RESOLVIDA: a carta diz "uma semana" e aqui fica o
 * número de disparos, porque quantos dias tem a semana é uma regra do modo, e
 * a run carrega uma cópia das regras para nada mudar no meio dela. `null` é
 * "até a run acabar".
 */
export interface Recorrente {
  qual: Recurso
  quanto: number
  cada: 'dia' | 'semana'
  restam: number | null
  /** Quem criou, para o histórico dizer o nome da carta. Guarda o ID: quem
   *  traduz id em nome é o catálogo, e quem fala com ele é o motor. */
  origem: CardId | null
}

/**
 * Um baralho montado: quantas cópias de cada carta. Cópia, e não "a carta":
 * a coleção era binária (tem ou não tem) e por isso clicar na Tarefa Simples
 * tirava as quatro de uma vez, e a recompensa morria quando as desbloqueáveis
 * acabavam.
 */
export interface BaralhoMontado {
  id: string
  nome: string
  cartas: Record<CardId, number>
}

/** Coleção persistida entre runs. Veja `src/game/colecao.ts`. */
export interface Collection {
  /** Cópias que o jogador TEM de cada carta. */
  tenho: Record<CardId, number>
  /** Os baralhos montados com elas — até três. */
  baralhos: BaralhoMontado[]
  /** O id do baralho equipado, que é o que a próxima run usa. */
  ativo: string
  /** Envelopes ganhos e ainda fechados, na ordem em que chegaram. Moram na
   *  coleção porque são coisa que se TEM, e assim sobem com ela para o banco
   *  (`saves.collection`) sem coluna nova. Veja `src/game/missoes.ts`. */
  envelopes: EnvelopeFechado[]
  /** As missões cumpridas no dia `dia` (data local, `AAAA-MM-DD`). Virou o
   *  dia, a lista volta a valer vazia — quem confere é `missoesDeHoje`. */
  missoes: { dia: string; feitas: string[] }
  /** Os cosméticos desbloqueados (`campo:valor`, veja `src/game/cosmeticos.ts`).
   *  Na coleção pelo mesmo motivo dos envelopes: é coisa que se tem, e sobe
   *  em `saves.collection` sem coluna nova. */
  cosmeticos: string[]
}

/** O pacote de cartas. Envelope, e não baú: o jogo é papelada de escritório,
 *  e o que chega na mesa de alguém num escritório é envelope. */
export type TipoEnvelope = 'comum' | 'pardo' | 'confidencial' | 'epico' | 'lendario'

/**
 * Um envelope esperando na coleção. Desde a v0.20 o conteúdo é sorteado
 * quando ele é GANHO (`cartas`), e não quando é aberto: é o que deixa o
 * recibo e o replay da partida dizerem o que ela deu. Abrir continua sendo a
 * hora de VER — as cópias só entram na coleção ali.
 *
 * `cartas` é opcional porque o envelope guardado antes disso era só o tipo,
 * e é sorteado na abertura, como era. `id` liga o envelope à run que o deu.
 */
export interface EnvelopeFechado {
  tipo: TipoEnvelope
  id?: string
  cartas?: CardId[]
}

/** O envelope que uma run deu, com o que veio dentro. */
export interface EnvelopeGanho {
  tipo: TipoEnvelope
  id: string
  cartas: CardId[]
  /** A missão que o deu; sem ela, é o envelope de toda partida. */
  missao?: string
}

export interface WeekConfig {
  week: number
  dailyQuota: number
  weeklyGoal: number
  fullSalary: number
  reducedSalary: number
}
