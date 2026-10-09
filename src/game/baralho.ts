import { getCard } from './catalogo'
import type { Regras } from './regras'
import type { BaralhoMontado, CardKind } from './types'

/** Os quatro naipes, na ordem em que a tela os mostra. */
export const NAIPES: CardKind[] = ['tarefa', 'descanso', 'grana', 'social']

export interface Contagem {
  total: number
  porNaipe: Record<CardKind, number>
  semNaipe: number
}

export function contarBaralho(b: BaralhoMontado): Contagem {
  const porNaipe = { tarefa: 0, descanso: 0, grana: 0, social: 0 } as Record<CardKind, number>
  let semNaipe = 0
  let total = 0
  for (const [id, n] of Object.entries(b.cartas)) {
    const kind = getCard(id).kind
    total += n
    if (kind === null) semNaipe += n
    else porNaipe[kind] += n
  }
  return { total, porNaipe, semNaipe }
}

/**
 * Os motivos de o baralho NÃO poder ir para a mesa — vazio quando pode.
 *
 * Uma função só, para a página do baralho (o aviso) e para a mesa (que não
 * começa run com baralho inválido) dizerem a mesma coisa. As regras são as de
 * HOJE (`regras()`), e não as de uma run: montar baralho é antes da partida.
 */
export function problemasDoBaralho(b: BaralhoMontado, r: Regras): string[] {
  const c = contarBaralho(b)
  const problemas: string[] = []
  if (c.total < r.baralhoMinimo) {
    problemas.push(`Faltam ${r.baralhoMinimo - c.total} cartas: o mínimo é ${r.baralhoMinimo}.`)
  }
  if (c.total > r.baralhoMaximo) {
    problemas.push(`Sobram ${c.total - r.baralhoMaximo} cartas: o máximo é ${r.baralhoMaximo}.`)
  }
  for (const naipe of NAIPES) {
    const falta = r.minimoPorNaipe - c.porNaipe[naipe]
    if (falta > 0) problemas.push(`Falta${falta > 1 ? 'm' : ''} ${falta} de ${naipe}: o mínimo é ${r.minimoPorNaipe} por naipe.`)
  }
  return problemas
}
