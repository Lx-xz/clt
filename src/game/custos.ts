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
 *    efeito de −R$ deixaria jogar no vermelho e só cobraria na sexta.
 *  - **estresse**: não há "saldo" de estresse; pagar é subir. A carta sai
 *    mesmo que isso leve ao burnout — é escolha de quem joga, e o carimbo
 *    avisou. O que muda em relação a um efeito é a ORDEM: é pago antes.
 *
 * Tudo é pago ANTES dos efeitos: a carta que rende dinheiro não se paga com o
 * próprio rendimento.
 */

export const RECURSOS_DE_CUSTO: RecursoDeCusto[] = ['dinheiro', 'estresse', 'produtividade']

/** Os custos de uma carta ou de um retrato. Lê também o `custoDinheiro` da
 *  v0.15, que ainda mora nos retratos gravados dentro das runs antigas. */
export function custosDe(c: { custos?: Custo[]; custoDinheiro?: number }): Custo[] {
  if (c.custos?.length) return c.custos
  return c.custoDinheiro ? [{ qual: 'dinheiro', quanto: c.custoDinheiro }] : []
}

/** Lista que veio de fora (banco, JSON colado) vira lista válida: recurso
 *  desconhecido e quantia não positiva caem fora, e o mesmo recurso repetido
 *  é somado — duas linhas de "R$" seriam um carimbo mentindo. */
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

/** O carimbo: curto, porque mora num canto da carta. */
export function carimboDoCusto(c: Custo): string {
  if (c.qual === 'dinheiro') return `R$${c.quanto}`
  return String(c.quanto)
}

/** Por extenso, para o detalhe, o leitor de tela e o motivo de bloqueio. */
export function textoDoCusto(c: Custo): string {
  if (c.qual === 'dinheiro') return `R$ ${c.quanto}`
  return `${c.quanto} de ${c.qual}`
}
