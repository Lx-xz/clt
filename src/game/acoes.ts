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
 * Duas regras que decidem se isto envelhece bem:
 *
 * 1. **A composição acontece na LISTA, não em função nova.** "Reembaralhar 1"
 *    não é uma ação: é `descartar(1)` seguido de `comprar(1)`. Se cada
 *    combinação virar uma primitiva, em três meses são trinta primitivas e o
 *    editor precisa de um formulário para cada uma.
 * 2. **Isto não é para virar linguagem de programação.** `sorteio` já carrega
 *    listas dentro e é o limite: laço, variável e expressão ficam de fora. O
 *    que não couber aqui continua sendo código no motor, e tudo bem.
 */

export type Recurso = 'produtividade' | 'energia' | 'estresse' | 'dinheiro'

export type Acao =
  /** Soma no recurso. Estresse positivo SOBE o estresse; nunca passa de zero. */
  | { faz: 'recurso'; qual: Recurso; quanto: number }
  /** Efeito adiado: entra no começo do dia seguinte. */
  | { faz: 'amanha'; qual: 'energia' | 'cota'; quanto: number }
  | { faz: 'comprar'; quantas: number }
  /** `quantas: 'tudo'` esvazia a mão. `aleatorio` escolhe qual sai.
   *  `porque` é quem aparece no histórico: "Fofoca de Corredor descartou
   *  Café." diz mais do que "Descartou Café.", e o custo é um campo. */
  | { faz: 'descartar'; quantas: number | 'tudo'; aleatorio?: boolean; porque?: string }
  | { faz: 'ganharCarta'; carta: CardId; onde: 'mao' | 'descarte' }
  /** Muda o custo de todas as cartas até o fim do dia. */
  | { faz: 'custo'; quanto: number }
  | { faz: 'bloquearClasse'; classe: CardKind }
  /** Duas informais viram uma de verdade — a conta é do motor. */
  | { faz: 'advertencia'; quanto: number; informal?: boolean }
  /** Soma na cota do dia, ou fixa um valor com `absoluto`. */
  | { faz: 'cota'; quanto: number; absoluto?: boolean }
  | { faz: 'salarioPermanente'; quanto: number }
  | { faz: 'produtividadePassiva'; quanto: number }
  /** Quantas cartas o dia compra, quando não são as 5 de sempre. */
  | { faz: 'maoDoDia'; quantas: number }
  | { faz: 'sorteio'; chance: number; entao: Acao[]; senao?: Acao[] }
  /** Só escreve no histórico da mesa. Serve para explicar o que aconteceu. */
  | { faz: 'aviso'; texto: string }

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

/**
 * Quando o efeito dispara. `aoJogar` é o padrão das cartas e `aoRevelar` o
 * dos eventos; os outros dois existem porque a ORDEM importa — a Fofoca de
 * Corredor descarta depois da mão chegar, e a Cobrança no Zap só pesa se a
 * cota não foi batida no fim do dia.
 */
export type Quando = 'aoJogar' | 'aoRevelar' | 'aposComprar' | 'fimDoDia'

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
  descartarMao: (state: GameState) => void
  descartarUma: (state: GameState, aleatoria: boolean, porque?: string) => CardId | null
  criarCarta: (cardId: CardId) => { uid: string; cardId: CardId }
  log: (state: GameState, texto: string) => void
  /** 0..1; recebe o sorteio de fora para o teste poder ser determinístico. */
  sorte: () => number
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
  }
}

function valorDoRecurso(state: GameState, qual: Recurso): number {
  if (qual === 'produtividade') return state.productivity
  if (qual === 'energia') return state.energy
  if (qual === 'estresse') return state.stress
  return state.money
}

/** Roda uma ação. Muda o estado no lugar — o motor já clonou antes. */
export function executarAcao(state: GameState, acao: Acao, ctx: Contexto) {
  switch (acao.faz) {
    case 'recurso':
      if (acao.qual === 'produtividade') state.productivity += acao.quanto
      else if (acao.qual === 'energia') state.energy = Math.max(0, state.energy + acao.quanto)
      else if (acao.qual === 'dinheiro') state.money += acao.quanto
      else state.stress = Math.max(0, state.stress + acao.quanto)
      break
    case 'amanha':
      if (acao.qual === 'energia') state.tomorrow.energy += acao.quanto
      else state.tomorrow.quota += acao.quanto
      break
    case 'comprar':
      ctx.comprar(state, acao.quantas)
      break
    case 'descartar':
      if (acao.quantas === 'tudo') ctx.descartarMao(state)
      else {
        for (let i = 0; i < acao.quantas; i += 1) {
          ctx.descartarUma(state, acao.aleatorio === true, acao.porque)
        }
      }
      break
    case 'ganharCarta': {
      const nova = ctx.criarCarta(acao.carta)
      if (acao.onde === 'mao') state.hand.push(nova)
      else state.discard.push(nova)
      break
    }
    case 'custo':
      state.costModifier += acao.quanto
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
    case 'cota':
      state.dailyQuota = acao.absoluto ? acao.quanto : state.dailyQuota + acao.quanto
      break
    case 'salarioPermanente':
      state.salaryBonus += acao.quanto
      break
    case 'produtividadePassiva':
      state.passiveProductivity += acao.quanto
      break
    case 'maoDoDia':
      state.maoDoDia = acao.quantas
      break
    case 'sorteio':
      executar(state, ctx.sorte() < acao.chance ? acao.entao : (acao.senao ?? []), ctx)
      break
    case 'aviso':
      ctx.log(state, acao.texto)
      break
  }
}

export function executar(state: GameState, acoes: Acao[], ctx: Contexto) {
  for (const acao of acoes) executarAcao(state, acao, ctx)
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
    executar(state, efeito.acoes, ctx)
  }
}

/** Sem `quando`, o efeito pertence ao gatilho principal daquele dono. */
function padraoDe(quando: Quando): Quando {
  return quando === 'aoRevelar' ? 'aoRevelar' : 'aoJogar'
}
