import { numeroDaSemana } from './regras'
import { idAtual } from './ids'
import type { CardId, CardKind, GameState } from './types'

/**
 * O catálogo de ações — o vocabulário que uma carta ou um evento tem para
 * mexer no jogo.
 *
 * A ideia toda: **o efeito é DADO, a regra geral é código.** Uma carta não
 * descreve o que acontece com o estresse; ela diz `{ faz: 'recurso', qual:
 * 'estresse', quanto: 2 }` e o motor é quem sabe que estresse não passa de
 * zero e que dez é burnout. Carta nova não precisa de uma linha de motor.
 *
 * Três regras que decidem se isto envelhece bem:
 *
 * 1. **A composição acontece na LISTA, não em função nova.** "Reembaralhar 1"
 *    não é uma ação: é `descartar(1)` seguido de `comprar(1)`. Se cada
 *    combinação virar uma primitiva, em três meses são trinta primitivas —
 *    e trinta linhas para ler antes de entender uma carta.
 * 2. **Isto não é para virar linguagem de programação.** `sorteio` já carrega
 *    listas dentro e é o limite: laço, variável e expressão ficam de fora. O
 *    que não couber aqui continua sendo código no motor, e tudo bem. A régua
 *    não é o que o editor aguenta desenhar; é o que cabe numa carta que
 *    alguém lê na mão, em três linhas.
 * 3. **Ação nova precisa de um descritor.** Desde que o editor visual existe,
 *    quem sabe desenhar um campo é a tabela em
 *    `src/app/(app)/lab/_catalogo/descritores.ts`. Ela é um
 *    `satisfies Record<Acao['faz'], Descritor>`, então esquecer o descritor
 *    quebra o BUILD em vez de deixar a ação sem formulário em silêncio.
 */

export type Recurso = 'produtividade' | 'energia' | 'estresse' | 'dinheiro'

/**
 * Dados no lugar de um número (v0.41): "1d3 de energia" em vez de "3 de
 * energia". `dados` dados de `lados` lados, somados, mais `mais`; com
 * `negativo`, o total entra subtraindo ("−1d3 estresse"). A rolagem é do
 * motor (`ctx.sorte`), então o simulador continua determinístico, e fica
 * em `GameState.ultimaRolagem` para a mesa mostrar os dados caindo.
 */
export interface Rolagem {
  dados: number
  lados: number
  mais?: number
  negativo?: boolean
}

/** O tom de uma saída do dado: verde e vermelho quando a carta quer dizer
 *  "deu certo / deu errado"; neutro quando ela só tem caminhos diferentes. */
export type TomDaSaida = 'bom' | 'ruim' | 'neutro'

/** Uma faixa de faces do dado (`de` a `ate`), o que ela diz na carta e o que
 *  ela faz. Face sem faixa nenhuma não faz nada. */
export interface SaidaDoDado {
  de: number
  ate: number
  texto: string
  tom?: TomDaSaida
  acoes: Acao[]
}

/** O `rolar` que a carta faz ao ser jogada, se ela tem um: é ele que vira a
 *  barra no corpo da carta. */
export function rolarDaCarta(efeitos: { acoes: Acao[]; quando?: string }[] | undefined): Extract<Acao, { faz: 'rolar' }> | null {
  for (const e of efeitos ?? []) {
    if (e.quando && e.quando !== 'aoJogar') continue
    const r = e.acoes.find((a) => a.faz === 'rolar')
    if (r && r.faz === 'rolar') return r
  }
  return null
}

/** A saída da face `valor`, ou -1. */
export function saidaDaFace(acao: Extract<Acao, { faz: 'rolar' }>, valor: number): number {
  return acao.saidas.findIndex((s) => valor >= s.de && valor <= s.ate)
}

/** Um número fixo, ou dados. */
export type Quantia = number | Rolagem

export function ehRolagem(q: unknown): q is Rolagem {
  return typeof q === 'object' && q !== null && typeof (q as Rolagem).lados === 'number'
}

/** O valor esperado de uma quantia: quem precisa de UM número antes de
 *  rolar (o bot do simulador, a prévia de uma jogada) usa a média. */
export function mediaDe(q: Quantia): number {
  if (!ehRolagem(q)) return q
  const media = (q.dados * (q.lados + 1)) / 2 + (q.mais ?? 0)
  return q.negativo ? -media : media
}

/** A quantia de uma ação que tem uma (recurso, comprar, cota); nulo nas outras. */
export function quantiaDe(acao: Acao): Quantia | null {
  if (acao.faz === 'recurso' || acao.faz === 'cota') return acao.quanto
  if (acao.faz === 'comprar') return acao.quantas
  return null
}

/** A mesma ação, com a quantia já resolvida num número (no `rolar`, a face
 *  que saiu). */
export function comQuantia(acao: Acao, n: number): Acao {
  if (acao.faz === 'recurso' || acao.faz === 'cota') return { ...acao, quanto: n }
  if (acao.faz === 'comprar') return { ...acao, quantas: n }
  if (acao.faz === 'rolar') return { ...acao, saiu: n }
  return acao
}

/** O que a ação rola, se rola: a quantia em dados, ou o dado do `rolar`
 *  (que ainda não saiu). */
export function rolagemDe(acao: Acao): Rolagem | null {
  if (acao.faz === 'rolar') return acao.saiu === undefined ? { dados: 1, lados: Number(acao.lados) || 6 } : null
  const q = quantiaDe(acao)
  return q !== null && ehRolagem(q) ? q : null
}

/** "1d3", "2d6+1", "−1d4": como a rolagem se escreve. */
export function textoDaRolagem(r: Rolagem): string {
  const mais = r.mais ? (r.mais > 0 ? `+${r.mais}` : `${r.mais}`) : ''
  return `${r.negativo ? '−' : ''}${r.dados}d${r.lados}${mais}`
}

export type Acao =
  /** Soma no recurso. Estresse positivo SOBE o estresse; nunca passa de zero. */
  | { faz: 'recurso'; qual: Recurso; quanto: Quantia }
  /** Efeito adiado: a lista inteira roda no começo do dia seguinte. Serve
   *  para QUALQUER coisa — um recurso, uma carta, uma mensagem —, e não para
   *  dois números escolhidos a dedo, que era o que ela fazia antes. */
  | { faz: 'amanha'; acoes: Acao[] }
  | { faz: 'comprar'; quantas: Quantia }
  /** `quantas: 'tudo'` esvazia a mão. `aleatorio` escolhe qual sai.
   *  `porque` é quem aparece no histórico: "Fofoca de Corredor descartou
   *  Café." diz mais do que "Descartou Café.", e o custo é um campo. */
  | { faz: 'descartar'; quantas: number | 'tudo'; aleatorio?: boolean; porque?: string }
  /** Para o dia e pede ao JOGADOR que escolha o que sai da mão. `entao` é o
   *  que acontece depois — é assim que "descarte 1 para comprar 1" existe sem
   *  uma ação nova para cada troca. */
  | { faz: 'escolherDescarte'; quantas: number; porque?: string; entao?: Acao[] }
  /** O irmão do `escolherDescarte`: o jogador escolhe carta da mão, mas ela
   *  não vai para o descarte — sai da mão hoje e volta junto com a mão de
   *  amanhã (`GameState.guardadas`). O "Deixar pra Amanhã" adia um problema;
   *  isto adia uma CARTA. */
  | { faz: 'guardarParaAmanha'; quantas: number; porque?: string; entao?: Acao[] }
  | { faz: 'ganharCarta'; carta: CardId; onde: 'mao' | 'descarte' }
  /** Muda o custo de todas as cartas até o fim do dia. */
  /** Muda o custo de TODAS as cartas hoje. Sem `qual`, é a energia (o
   *  Ar-Condicionado Quebrado); com `qual`, um dos custos da lista — é o que
   *  deixa a Black Friday baratear as cartas pagas em dinheiro. */
  | { faz: 'custo'; quanto: number; qual?: 'energia' | 'dinheiro' | 'estresse' | 'produtividade' }
  | { faz: 'bloquearClasse'; classe: CardKind }
  /** Duas informais viram uma de verdade — a conta é do motor. */
  | { faz: 'advertencia'; quanto: number; informal?: boolean }
  /** Soma na cota do dia, ou fixa um valor com `absoluto`. */
  | { faz: 'cota'; quanto: Quantia; absoluto?: boolean }
  /** O que continua valendo depois de hoje.
   *
   *  Ela nasceu de duas: `salarioPermanente` somava no salário da sexta e
   *  `produtividadePassiva` somava na produtividade de todo dia. Eram a mesma
   *  ideia escrita duas vezes — o que as separava não era o recurso, era a
   *  CADÊNCIA. Hoje é um campo (`cada`), e de brinde veio o que não existia:
   *  `duracao`, que permite um efeito valer só por esta semana em vez de para
   *  sempre. */
  | {
      faz: 'recorrente'
      qual: Recurso
      quanto: number
      cada: 'dia' | 'semana'
      /** `'run'` (padrão) é o resto da partida · `'semana'` é o resto desta
       *  semana · um número é essa quantidade de disparos. */
      duracao?: 'run' | 'semana' | number
    }
  /** Quantas cartas o dia compra, quando não são as de sempre. Com
   *  `relativo`, `quantas` é somado ao tamanho normal da mão — é o que
   *  mantém o Dia Tranquilo sendo "duas a mais" mesmo se o modo de jogo
   *  mudar a mão de 5 para 6. */
  | { faz: 'maoDoDia'; quantas: number; relativo?: boolean }
  | { faz: 'sorteio'; chance: number; entao: Acao[]; senao?: Acao[] }
  /** Joga UM dado e segue a saída da faixa em que ele caiu (v0.43): "1 a 7
   *  no d10, perde R$ 30; 8 a 10, ganha R$ 90". É o irmão do `sorteio` com
   *  mais de duas saídas, e o que a carta desenha como barra dividida no
   *  lugar do texto (`BarraDaSorte`). Na mesa, o dado é jogado pela mão de
   *  quem joga, como toda rolagem. `semCor` desenha as faixas sem o verde e
   *  o vermelho (carta que não julga). `saiu` é só do motor: o número que a
   *  mesa respondeu, quando a ação volta para ser executada. */
  | { faz: 'rolar'; lados: number; saidas: SaidaDoDado[]; semCor?: boolean; saiu?: number }
  /** O irmão do `sorteio`: um pergunta à sorte, o outro pergunta ao estado.
   *  Ele existe porque o `se` do efeito só vale no nível do bloco — dentro de
   *  um `sorteio` não havia como perguntar nada. */
  | { faz: 'se'; condicao: Condicao; entao: Acao[]; senao?: Acao[] }
  /** Pergunta ao JOGADOR, como os eventos ambíguos já fazem. Igual ao
   *  `escolherDescarte`, ela PAUSA o dia — então o que vier depois dela na
   *  mesma lista roda antes da resposta. Na prática: é a última da lista. */
  | { faz: 'escolha'; opcoes: { rotulo: string; acoes: Acao[] }[] }
  /** Aparece na mesa e fica no histórico da run. */
  | { faz: 'mensagem'; texto: string }

/** O "se" de um efeito. Sem ele, o efeito sempre vale. */
export type Condicao =
  /** Quantas vezes ESTA carta já foi jogada hoje, antes desta vez. */
  | { se: 'jaJogadaHoje'; aoMenos?: number; noMaximo?: number }
  | { se: 'embalo'; aoMenos: number }
  | { se: 'recurso'; qual: Recurso; aoMenos?: number; noMaximo?: number }
  | { se: 'cotaBatida'; valor: boolean }
  | { se: 'advertencias'; aoMenos: number }
  /** Esta carta ainda não foi jogada nenhuma vez nesta run. */
  | { se: 'ineditaNaRun' }
  /** Um efeito que ESTA carta deixou ainda está valendo (o "+1 todo dia"
   *  da Automatizar): é o que deixa a carta fazer outra coisa enquanto o
   *  efeito de antes não acaba (v0.46). */
  | { se: 'efeitoAtivo' }
  /** Quantas cartas já saíram hoje, de qualquer tipo. Com `noMaximo: 0` é
   *  "só se for a PRIMEIRA do dia" — e é mais geral do que uma condição com
   *  esse nome, que só saberia dizer essa frase. */
  | { se: 'cartasJogadasHoje'; aoMenos?: number; noMaximo?: number }
  /** Quantas cartas dessa classe já saíram hoje. É o `embalo` sem precisar
   *  ser seguido. */
  | { se: 'classeJogadaHoje'; classe: CardKind; aoMenos?: number; noMaximo?: number }
  | { se: 'cartasNaMao'; aoMenos?: number; noMaximo?: number }
  | { se: 'dia'; aoMenos?: number; noMaximo?: number }
  | { se: 'semana'; aoMenos?: number; noMaximo?: number }
  // As três combinatórias. São o que faz as condições de cima valerem o
  // dobro: sem elas, um bloco só consegue perguntar UMA coisa, e "a cota não
  // foi batida E você tem menos de 3 cartas" não tinha como ser escrito.
  | { se: 'nao'; condicao: Condicao }
  | { se: 'todas'; condicoes: Condicao[] }
  | { se: 'alguma'; condicoes: Condicao[] }

/**
 * Quando o efeito dispara. `aoJogar` é o padrão das cartas e `aoRevelar` o
 * dos eventos; os outros existem porque a ORDEM importa — a Fofoca de
 * Corredor descarta depois da mão chegar, e a Cobrança no Zap só pesa se a
 * cota não foi batida no fim do dia.
 *
 * `aoDescartar` é o único que dispara na carta que está SAINDO da mão, e é o
 * que permite uma carta ser boa de largar. `fimDaSemana` dispara na sexta,
 * antes do salário, e é o par natural do recorrente semanal.
 */
export type Quando =
  | 'aoJogar'
  | 'aoRevelar'
  | 'aposComprar'
  | 'fimDoDia'
  | 'aoDescartar'
  | 'fimDaSemana'

export interface Efeito {
  quando?: Quando
  se?: Condicao
  acoes: Acao[]
}

/** O que limita PODER JOGAR a carta — diferente do que ela faz ao ser jogada. */
export interface Restricao {
  /** Uma vez por run (Puxar o Saco). O motor guarda em `usadasNaRun`. */
  umaVezPorRun?: boolean
  /** Sem isto verdadeiro, a carta fica sem graça na mão (Puxar o Saco
   *  precisa de advertência para cancelar). */
  exige?: Condicao
}

// ---------------------------------------------------------------- contexto

/**
 * O que o interpretador precisa e não cabe no estado: quem está sendo
 * executado (para `jaJogadaHoje` e `ineditaNaRun`) e as funções do motor que
 * mexem no baralho — elas ficam lá porque embaralhar o descarte quando o
 * baralho acaba é regra do jogo, não da carta.
 */
export interface Contexto {
  cartaId?: CardId
  comprar: (state: GameState, quantas: number) => void
  descartarMao: (state: GameState) => CardId[]
  descartarUma: (state: GameState, aleatoria: boolean, porque?: string) => CardId | null
  /** Avisa a mesa do que acabou de sair, para o jogador VER as cartas indo
   *  embora em vez de a mão encolher sozinha. */
  mostrarDescarte: (state: GameState, cartas: CardId[], porque: string) => void
  /** Pausa o dia até o jogador escolher o que descartar — ou, com
   *  `guardar`, o que fica para amanhã. */
  pedirDescarte: (
    state: GameState,
    quantas: number,
    porque: string,
    entao: Acao[],
    cartaId: CardId | null,
    guardar?: boolean,
  ) => void
  /** Pausa o dia até o jogador escolher um dos caminhos da carta. */
  pedirEscolha: (
    state: GameState,
    opcoes: { rotulo: string; acoes: Acao[] }[],
    cartaId: CardId | null,
  ) => void
  criarCarta: (cardId: CardId) => { uid: string; cardId: CardId }
  /** A classe de uma carta pelo id. Entra por aqui, e não por um import do
   *  catálogo, pelo mesmo motivo que `comprar` entra: o interpretador não
   *  conhece o baralho — quem conhece é o motor. */
  classeDe: (cardId: CardId) => CardKind | null
  log: (state: GameState, texto: string) => void
  /** Escreve E mostra na mesa. É a diferença entre a `mensagem` e o `log`. */
  mostrarMensagem: (state: GameState, texto: string) => void
  /** 0..1; recebe o sorteio de fora para o teste poder ser determinístico. */
  sorte: () => number
  /** Quando existe, os dados NÃO são rolados aqui: a lista pausa (como numa
   *  `escolha`) até a mesa dizer o que os dados de verdade deram. Sem ele
   *  (o simulador, os eventos), rola-se na hora pela `sorte`. */
  pedirRolagem?: (state: GameState, acao: Acao, rolagem: Rolagem) => void
}

export function condicaoVale(state: GameState, cond: Condicao | undefined, ctx: Contexto): boolean {
  if (!cond) return true
  switch (cond.se) {
    case 'jaJogadaHoje': {
      const vezes = ctx.cartaId ? state.playedToday.filter((id) => id === ctx.cartaId).length : 0
      if (cond.aoMenos !== undefined && vezes < cond.aoMenos) return false
      if (cond.noMaximo !== undefined && vezes > cond.noMaximo) return false
      return true
    }
    case 'embalo':
      return state.streakCount >= cond.aoMenos
    case 'recurso': {
      const valor = valorDoRecurso(state, cond.qual)
      if (cond.aoMenos !== undefined && valor < cond.aoMenos) return false
      if (cond.noMaximo !== undefined && valor > cond.noMaximo) return false
      return true
    }
    case 'cotaBatida':
      return (state.productivity >= state.dailyQuota) === cond.valor
    case 'advertencias':
      return state.warnings >= cond.aoMenos
    case 'ineditaNaRun':
      return ctx.cartaId ? !state.usadasNaRun.includes(ctx.cartaId) : true
    case 'efeitoAtivo':
      return ctx.cartaId ? state.recorrentes.some((r) => r.origem === ctx.cartaId) : false
    case 'cartasJogadasHoje':
      return entre(state.playedToday.length, cond.aoMenos, cond.noMaximo)
    case 'classeJogadaHoje': {
      const vezes = state.playedToday.filter((id) => ctx.classeDe(id) === cond.classe).length
      return entre(vezes, cond.aoMenos, cond.noMaximo)
    }
    case 'cartasNaMao':
      return entre(state.hand.length, cond.aoMenos, cond.noMaximo)
    case 'dia':
      return entre(state.day, cond.aoMenos, cond.noMaximo)
    case 'semana':
      return entre(numeroDaSemana(state.modo, state.day), cond.aoMenos, cond.noMaximo)
    case 'nao':
      return !condicaoVale(state, cond.condicao, ctx)
    case 'todas':
      return cond.condicoes.every((c) => condicaoVale(state, c, ctx))
    case 'alguma':
      return cond.condicoes.some((c) => condicaoVale(state, c, ctx))
  }
}

/** Sete condições fazem a mesma comparação; ela mora aqui uma vez só. */
function entre(valor: number, aoMenos?: number, noMaximo?: number): boolean {
  if (aoMenos !== undefined && valor < aoMenos) return false
  if (noMaximo !== undefined && valor > noMaximo) return false
  return true
}

function valorDoRecurso(state: GameState, qual: Recurso): number {
  if (qual === 'produtividade') return state.productivity
  if (qual === 'energia') return state.energy
  if (qual === 'estresse') return state.stress
  return state.money
}

/**
 * Anota uma rolagem já feita: o total, a linha do histórico e o
 * `ultimaRolagem` para a mesa. `naMao` marca a que o jogador jogou com a
 * mão — essa a mesa já mostrou, e não joga de novo.
 */
export function anotarRolagem(
  state: GameState,
  q: Rolagem,
  valores: number[],
  log: (state: GameState, texto: string) => void,
  naMao = false,
): number {
  const total = valores.reduce((a, b) => a + b, 0) + (q.mais ?? 0)
  const selo = (state.ultimaRolagem?.selo ?? 0) + 1
  state.ultimaRolagem = { lados: Math.max(2, Math.round(q.lados)), valores, mais: q.mais ?? 0, total, selo, ...(naMao ? { naMao } : {}) }
  log(state, `Rolou ${textoDaRolagem(q).replace('−', '')}: ${valores.join(' + ')}${q.mais ? ` ${q.mais > 0 ? '+' : '−'} ${Math.abs(q.mais)}` : ''} = ${total}.`)
  return q.negativo ? -total : total
}

/**
 * O número de uma quantia: ele mesmo, ou os dados rolados agora, pela
 * `sorte` (o caminho do simulador e dos eventos; a carta jogada na mesa
 * pausa antes, em `executarAcao`).
 */
function resolver(state: GameState, q: Quantia, ctx: Contexto): number {
  if (!ehRolagem(q)) return q
  const lados = Math.max(2, Math.round(q.lados))
  const valores: number[] = []
  for (let i = 0; i < Math.max(1, Math.round(q.dados)); i++) valores.push(1 + Math.floor(ctx.sorte() * lados))
  return anotarRolagem(state, q, valores, ctx.log)
}

/** Roda uma ação. Muda o estado no lugar — o motor já clonou antes. */
export function executarAcao(state: GameState, acao: Acao, ctx: Contexto) {
  // dados que o jogador vai jogar: a ação espera a mesa, e a lista pausa
  const q = rolagemDe(acao)
  if (q && ctx.pedirRolagem) {
    ctx.pedirRolagem(state, acao, q)
    return
  }
  switch (acao.faz) {
    case 'recurso': {
      const quanto = resolver(state, acao.quanto, ctx)
      if (acao.qual === 'produtividade') state.productivity += quanto
      else if (acao.qual === 'energia') state.energy = Math.max(0, state.energy + quanto)
      else if (acao.qual === 'dinheiro') state.money += quanto
      else state.stress = Math.max(0, state.stress + quanto)
      break
    }
    case 'amanha':
      // a fila é só dado: ela é clonada e serializada com o resto do estado
      state.amanha.push(...acao.acoes)
      break
    case 'comprar':
      ctx.comprar(state, Math.max(0, resolver(state, acao.quantas, ctx)))
      break
    case 'descartar': {
      // as cartas saem uma a uma, mas a mesa mostra o LOTE: "descartou 2" é
      // um acontecimento só, e piscar duas vezes contaria outra história
      const saiu: CardId[] = []
      if (acao.quantas === 'tudo') saiu.push(...ctx.descartarMao(state))
      else {
        for (let i = 0; i < acao.quantas; i += 1) {
          const id = ctx.descartarUma(state, acao.aleatorio === true, acao.porque)
          if (id) saiu.push(id)
        }
      }
      ctx.mostrarDescarte(state, saiu, acao.porque ?? 'Descarte')
      break
    }
    case 'guardarParaAmanha':
      ctx.pedirDescarte(
        state,
        acao.quantas,
        acao.porque ?? 'Escolha o que fica para amanhã',
        acao.entao ?? [],
        ctx.cartaId ?? null,
        true,
      )
      break
    case 'escolherDescarte':
      ctx.pedirDescarte(
        state,
        acao.quantas,
        acao.porque ?? 'Escolha o que descartar',
        acao.entao ?? [],
        ctx.cartaId ?? null,
      )
      break
    case 'ganharCarta': {
      const nova = ctx.criarCarta(acao.carta)
      if (acao.onde === 'mao') state.hand.push(nova)
      else state.discard.push(nova)
      break
    }
    case 'custo':
      if (!acao.qual || acao.qual === 'energia') state.costModifier += acao.quanto
      else state.modCustos = { ...state.modCustos, [acao.qual]: (state.modCustos?.[acao.qual] ?? 0) + acao.quanto }
      break
    case 'bloquearClasse':
      if (!state.blockedKinds.includes(acao.classe)) state.blockedKinds.push(acao.classe)
      break
    case 'advertencia':
      if (acao.informal) {
        state.informalWarnings += acao.quanto
        // duas informais viram uma de verdade: a conta é do motor, não da carta
        while (state.informalWarnings >= 2) {
          state.informalWarnings -= 2
          state.warnings += 1
          ctx.log(state, 'Duas advertências informais viraram uma advertência real.')
        }
      } else {
        state.warnings = Math.max(0, state.warnings + acao.quanto)
      }
      break
    case 'cota': {
      const quanto = resolver(state, acao.quanto, ctx)
      state.dailyQuota = acao.absoluto ? quanto : state.dailyQuota + quanto
      break
    }
    case 'recorrente': {
      // a duração é resolvida AGORA, e não guardada como palavra: "uma
      // semana" depende de quantos dias tem a semana DESTA run, e a run já
      // carrega uma cópia das regras justamente para não mudar no meio
      const duracao = acao.duracao ?? 'run'
      const restam =
        duracao === 'run'
          ? null
          : duracao === 'semana'
            ? acao.cada === 'dia'
              ? state.modo.diasPorSemana
              : 1
            : Math.max(0, duracao)
      if (restam !== 0) {
        state.recorrentes.push({
          qual: acao.qual,
          quanto: acao.quanto,
          cada: acao.cada,
          restam,
          ...(restam === null ? {} : { total: restam }),
          // guarda o ID, não o nome: quem traduz id em nome é o catálogo, e
          // quem fala com o catálogo é o motor. A ação continua sem conhecer
          // carta nenhuma
          origem: ctx.cartaId ?? null,
        })
      }
      break
    }
    case 'maoDoDia':
      state.maoDoDia = acao.relativo
        ? Math.max(0, state.modo.cartasNaMao + acao.quantas)
        : acao.quantas
      break
    case 'sorteio':
      executar(state, ctx.sorte() < acao.chance ? acao.entao : (acao.senao ?? []), ctx)
      break
    case 'rolar': {
      // `saiu` vem da mesa (já anotado lá); sem ele, rola-se aqui pela sorte
      const lados = Math.max(2, Number(acao.lados) || 6)
      const valor = acao.saiu ?? 1 + Math.floor(ctx.sorte() * lados)
      if (acao.saiu === undefined) anotarRolagem(state, { dados: 1, lados }, [valor], ctx.log)
      const i = saidaDaFace(acao, valor)
      if (state.ultimaRolagem) {
        state.ultimaRolagem.saida = i
        if (ctx.cartaId) state.ultimaRolagem.cartaId = ctx.cartaId
      }
      if (i >= 0) executar(state, acao.saidas[i].acoes, ctx)
      break
    }
    case 'se':
      executar(state, condicaoVale(state, acao.condicao, ctx) ? acao.entao : (acao.senao ?? []), ctx)
      break
    case 'escolha':
      ctx.pedirEscolha(state, acao.opcoes, ctx.cartaId ?? null)
      break
    case 'mensagem':
      ctx.mostrarMensagem(state, acao.texto)
      break
  }
}

export function executar(state: GameState, acoes: Acao[], ctx: Contexto) {
  for (let i = 0; i < acoes.length; i += 1) {
    executarAcao(state, acoes[i], ctx)
    // Uma pergunta aberta PARA a lista. O que vem depois de um "escolha" é
    // consequência da resposta, e rodar antes dela seria contar o fim antes
    // do começo — o `for` de antes rodava a lista inteira na hora.
    // O resto fica guardado na própria pergunta e é retomado ao responder,
    // o que resolve o aninhamento de graça: um `escolha` dentro de um
    // `sorteio` pausa a lista de dentro, e a de fora empilha atrás.
    // Os dados que esperam a mão do jogador param a lista do mesmo jeito.
    const pausa = pausaAberta(state)
    if (pausa) {
      pausa.resto = [...pausa.resto, ...acoes.slice(i + 1)]
      return
    }
  }
}

/** Roda os efeitos de um gatilho, respeitando o `se` de cada um. */
export function dispararEfeitos(
  state: GameState,
  efeitos: Efeito[] | undefined,
  quando: Quando,
  ctx: Contexto,
) {
  if (!efeitos) return
  for (const efeito of efeitos) {
    if ((efeito.quando ?? padraoDe(quando)) !== quando) continue
    if (!condicaoVale(state, efeito.se, ctx)) continue
    // um bloco anterior pausou: este vai para depois da resposta, com a
    // condição conferida AGORA (é agora que a carta está sendo jogada)
    const pausa = pausaAberta(state)
    if (pausa) {
      pausa.resto = [...pausa.resto, ...efeito.acoes]
      continue
    }
    executar(state, efeito.acoes, ctx)
  }
}

/** A pergunta (ou os dados) que segura a lista agora, se houver. */
export function pausaAberta(state: GameState): { resto: Acao[] } | null {
  return state.escolhaAberta ?? state.rolagemAberta ?? null
}

/** Sem `quando`, o efeito pertence ao gatilho principal daquele dono. */
function padraoDe(quando: Quando): Quando {
  return quando === 'aoRevelar' ? 'aoRevelar' : 'aoJogar'
}

// ------------------------------------------------------- vocabulário antigo

/**
 * Traduz o vocabulário anterior na LEITURA.
 *
 * **Sem isto, mudar o vocabulário quebra o jogo em silêncio.** As cartas
 * moram no banco desde a v0.10, e a `automatizar` que está no ar ainda guarda
 * `{"faz":"produtividadePassiva"}`. O `switch` de `executarAcao` não tem
 * `default`: uma ação que ele não conhece não dá erro, não avisa e não faz
 * nada — a carta especial simplesmente pararia de funcionar, e ninguém
 * descobriria.
 *
 * É a mesma escolha que o avatar faz: quem valida é a leitura
 * (`lerAvatar()`), e por isso `salvar_avatar()` pode não validar nada. Aqui
 * também não há migração no banco para rodar: salvar a carta de novo no
 * `/lab` grava o formato de hoje, e daí em diante esta função não encosta
 * mais nela.
 */
export function migrarAcoes(acoes: Acao[] | undefined): Acao[] {
  if (!acoes) return []
  return acoes.map(migrarAcao)
}

type AcaoAntiga =
  | { faz: 'salarioPermanente'; quanto: number }
  | { faz: 'produtividadePassiva'; quanto: number }
  | { faz: 'amanha'; qual: 'energia' | 'cota'; quanto: number }
  | { faz: 'aviso'; texto: string }

function migrarAcao(acao: Acao): Acao {
  // a carta citada pela ação tinha o id antigo (`hora-extra`) até a v0.35;
  // vira o uuid na leitura, como tudo (veja `ids.ts`)
  if (acao.faz === 'ganharCarta' && acao.carta) return { ...acao, carta: idAtual(acao.carta) }
  const velha = acao as unknown as AcaoAntiga
  switch (velha.faz) {
    case 'salarioPermanente':
      return { faz: 'recorrente', qual: 'dinheiro', quanto: velha.quanto, cada: 'semana' }
    case 'produtividadePassiva':
      return { faz: 'recorrente', qual: 'produtividade', quanto: velha.quanto, cada: 'dia' }
    case 'aviso':
      return { faz: 'mensagem', texto: velha.texto }
    case 'amanha':
      // o `amanha` antigo adiava dois números; o novo adia uma lista. Só é
      // formato velho quando tem `qual` — o novo tem `acoes`
      if ('qual' in velha) {
        return {
          faz: 'amanha',
          acoes: [
            velha.qual === 'energia'
              ? { faz: 'recurso', qual: 'energia', quanto: velha.quanto }
              : { faz: 'cota', quanto: velha.quanto },
          ],
        }
      }
      break
  }
  // desce nos pontos de aninhamento — senão um `salarioPermanente` dentro de
  // um `sorteio` (que é exatamente onde ele está na Pedir Aumento) escapa
  switch (acao.faz) {
    case 'sorteio':
      return { ...acao, entao: migrarAcoes(acao.entao), senao: acao.senao && migrarAcoes(acao.senao) }
    case 'se':
      return { ...acao, entao: migrarAcoes(acao.entao), senao: acao.senao && migrarAcoes(acao.senao) }
    case 'escolherDescarte':
    case 'guardarParaAmanha':
      return { ...acao, entao: acao.entao && migrarAcoes(acao.entao) }
    case 'amanha':
      return { ...acao, acoes: migrarAcoes(acao.acoes) }
    case 'escolha':
      return { ...acao, opcoes: acao.opcoes.map((o) => ({ ...o, acoes: migrarAcoes(o.acoes) })) }
    case 'rolar':
      // o editor guarda o dado como texto ("10", vem de um <select>)
      return { ...acao, lados: Number(acao.lados) || 6, saidas: (acao.saidas ?? []).map((x) => ({ ...x, acoes: migrarAcoes(x.acoes) })) }
    default:
      return acao
  }
}

/** O mesmo, para a lista de efeitos inteira de uma carta ou evento. */
export function migrarEfeitos(efeitos: Efeito[] | undefined): Efeito[] {
  if (!efeitos) return []
  return efeitos.map((e) => ({ ...e, acoes: migrarAcoes(e.acoes) }))
}
