import type { Acao, Efeito } from './acoes'
import type { Custo, GameState, RecursoDeCusto } from './types'

/**
 * Os custos da carta além da energia: o que ela COBRA para sair da mão.
 *
 * Até a v0.16 era um campo por recurso (`custoDinheiro`), e a próxima carta
 * que custasse estresse pediria outro campo, outra coluna e outro `if` em
 * cada tela. Agora é uma lista (`ActionCard.custos`), como os efeitos: custo
 * novo é dado, não código. A energia continua em `cost` porque ela é o custo
 * que TODA carta tem, e porque os eventos mexem nela (`effectiveCost`).
 *
 * Custo é diferente de efeito, e é isso que justifica a lista existir à parte:
 *  - **dinheiro** e **produtividade**: sem saldo, a carta não sai da mão. Um
 *    efeito de dinheiro negativo deixaria jogar no vermelho e só cobraria na sexta.
 *  - **estresse**: não há "saldo" de estresse; pagar é subir. A carta sai
 *    mesmo que isso leve ao burnout — é escolha de quem joga, e o carimbo
 *    avisou. O que muda em relação a um efeito é a ORDEM: é pago antes.
 *
 * Tudo é pago ANTES dos efeitos: a carta que rende dinheiro não se paga com o
 * próprio rendimento.
 */

export const RECURSOS_DE_CUSTO: RecursoDeCusto[] = ['dinheiro', 'estresse', 'produtividade']

/**
 * Os custos que uma carta pode ter HOJE (v0.47): o de estresse saiu. Ele
 * era o único que SOMA, e a mesma coisa aparecia de dois jeitos — "+2🔥" na
 * descrição de umas cartas e no carimbo de outras. Continua lido (os
 * retratos das runs antigas o têm), mas a carta do catálogo o recebe como
 * efeito (`estresseViraEfeito`), e o editor não o oferece mais.
 */
export const CUSTOS_DE_CARTA: RecursoDeCusto[] = ['dinheiro', 'produtividade']

/**
 * O custo de estresse da carta vira o primeiro efeito dela: "+N🔥" no
 * começo do primeiro bloco sem condição que roda ao jogar (ou num bloco
 * novo, à frente de todos). A ordem é a do custo, que era pago antes dos
 * efeitos. É tradução na LEITURA, como `migrarAcoes`: salvar a carta no lab
 * já grava o formato novo, e nada precisa rodar no banco.
 */
export function estresseViraEfeito<C extends { custos?: Custo[]; efeitos: Efeito[] }>(carta: C): C {
  const estresse = carta.custos?.find((c) => c.qual === 'estresse')?.quanto ?? 0
  if (!(estresse > 0)) return carta
  const custos = carta.custos!.filter((c) => c.qual !== 'estresse')
  const acao: Acao = { faz: 'recurso', qual: 'estresse', quanto: estresse }
  const i = carta.efeitos.findIndex((e) => !e.se && (!e.quando || e.quando === 'aoJogar'))
  const efeitos =
    i >= 0
      ? carta.efeitos.map((e, j) => (j === i ? { ...e, acoes: [acao, ...e.acoes] } : e))
      : [{ acoes: [acao] }, ...carta.efeitos]
  return { ...carta, custos: custos.length ? custos : undefined, efeitos }
}

/** Os custos de uma carta ou de um retrato. Lê também o `custoDinheiro` da
 *  v0.15, que ainda mora nos retratos gravados dentro das runs antigas. */
export function custosDe(c: { custos?: Custo[]; custoDinheiro?: number }): Custo[] {
  if (c.custos?.length) return c.custos
  return c.custoDinheiro ? [{ qual: 'dinheiro', quanto: c.custoDinheiro }] : []
}

/** Lista que veio de fora (banco, JSON colado) vira lista válida: recurso
 *  desconhecido e quantia não positiva caem fora, e o mesmo recurso repetido
 *  é somado — dois carimbos de dinheiro seriam um carimbo mentindo. */
export function lerCustos(bruto: unknown): Custo[] {
  if (!Array.isArray(bruto)) return []
  const soma = new Map<RecursoDeCusto, number>()
  for (const item of bruto) {
    const qual = (item as Custo | null)?.qual as RecursoDeCusto
    const quanto = Math.floor(Number((item as Custo | null)?.quanto))
    if (!RECURSOS_DE_CUSTO.includes(qual) || !(quanto > 0)) continue
    soma.set(qual, (soma.get(qual) ?? 0) + quanto)
  }
  return RECURSOS_DE_CUSTO.filter((r) => soma.has(r)).map((qual) => ({ qual, quanto: soma.get(qual)! }))
}

/**
 * Os custos de hoje: os da carta mais o que os eventos somaram
 * (`modCustos`). Um custo que cai a zero some — a Black Friday pode deixar
 * uma carta de graça —, e nenhum evento cria custo onde a carta não tinha:
 * "+15 em todo custo de dinheiro" encarece o que já cobrava dinheiro.
 */
export function custosEfetivos(
  state: Pick<GameState, 'modCustos'>,
  card: { custos?: Custo[]; custoDinheiro?: number },
): Custo[] {
  return custosDe(card)
    .map((c) => ({ qual: c.qual, quanto: Math.max(0, c.quanto + (state.modCustos?.[c.qual] ?? 0)) }))
    .filter((c) => c.quanto > 0)
}

/** O que falta para pagar, ou `null` se dá. Estresse nunca falta. */
export function custoQueFalta(state: GameState, custos: Custo[]): Custo | null {
  for (const c of custos) {
    if (c.qual === 'dinheiro' && c.quanto > state.money) return c
    if (c.qual === 'produtividade' && c.quanto > state.productivity) return c
  }
  return null
}

export function pagarCustos(state: GameState, custos: Custo[]) {
  for (const c of custos) {
    if (c.qual === 'dinheiro') state.money -= c.quanto
    else if (c.qual === 'produtividade') state.productivity -= c.quanto
    else if (c.qual === 'estresse') state.stress += c.quanto
  }
}

/** Por extenso, para onde só cabe texto: o leitor de tela e o motivo de
 *  bloqueio. Na tela, o custo é ícone e número — e o dinheiro do jogo não é
 *  real, então nada de "R$". */
export function textoDoCusto(c: Custo): string {
  return `${c.quanto} de ${c.qual}`
}
