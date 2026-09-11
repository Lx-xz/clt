import { CARDS_BY_ID } from '@/game/cards'
import type { ActionCard, CardId, CartaSnapshot } from '@/game/types'

/**
 * O versionamento do baralho.
 *
 * O problema: rebalancear é mexer em carta que já foi jogada. Se a Hora Extra
 * passar de 4 para 6 de custo, toda run antiga vira mentira — o replay mostra
 * a carta de HOJE no lugar da que a pessoa jogou. E se uma carta for
 * removida, o replay nem nome tem para mostrar.
 *
 * A solução tem duas metades, e elas resolvem coisas diferentes:
 *
 * 1. **O retrato, dentro da run.** `createRun` grava em `GameState.baralho`
 *    uma cópia de cada carta equipada como ela era naquele dia, mais a versão
 *    do baralho. Isso sobe junto com a run (`runs.details.baralho`) e é o que
 *    faz o replay continuar verdadeiro para sempre, sem depender de nada
 *    externo. **É a única metade que não dá para acrescentar depois**: run
 *    jogada antes disto existir nunca vai saber quanto a carta custava.
 * 2. **O histórico, aqui.** `MUDANCAS` é escrito à mão a cada ajuste e conta o
 *    que mudou e POR QUÊ. É o que o jogador lê ao clicar numa carta no
 *    baralho, e o que vira item de Novidades. Um diff automático saberia
 *    dizer "custo 4 → 6" e não saberia dizer "porque Freela → Hora Extra
 *    fechava a semana 1 sozinha", que é a parte que importa.
 *
 * Por que não uma tabela `cartas` + `cartas_antigas` no banco (ainda): com as
 * cartas no código, o retrato dentro da run já garante a integridade das runs
 * antigas, e o histórico aqui já dá a leitura para o jogador. A tabela vira
 * necessária quando as cartas saírem do código — aí `CARTAS_REMOVIDAS` e
 * `MUDANCAS` são exatamente o conteúdo de `cartas_antigas`, e esta estrutura
 * migra sem mudar de forma.
 */

/**
 * Sobe de 1 a cada mudança de regra ou de número de carta. Não é a versão do
 * site (`changelog.ts`): duas entregas seguidas que não tocam em carta nenhuma
 * mantêm o mesmo número aqui, e é isso que o deixa comparável entre runs.
 */
export const VERSAO_BARALHO = 1

export type TipoDeMudanca = 'criada' | 'ajustada' | 'removida'

export interface MudancaDeCarta {
  carta: CardId
  /** A versão do baralho em que a mudança passou a valer. */
  versao: number
  /** AAAA-MM-DD. */
  data: string
  tipo: TipoDeMudanca
  /** O que mudou, em número: "Custo 4 → 6". */
  oQue: string
  /** Por que mudou. É esta parte que um diff automático não escreve. */
  porque: string
}

/**
 * Escrito à mão, do mais novo para o mais velho. Ao ajustar uma carta:
 * suba `VERSAO_BARALHO`, acrescente a linha aqui e cite em `changelog.ts`.
 *
 * Exemplo do formato:
 *   { carta: 'hora-extra', versao: 2, data: '2026-09-20', tipo: 'ajustada',
 *     oQue: 'Custo 4 → 6', porque: 'Com o Embalo de grana, Freela → Hora
 *     Extra pagava o mês inteiro na semana 1.' }
 *
 * Está vazio porque o baralho ainda está na v1: nenhuma carta mudou desde que
 * o jogo existe. A lista nasce aqui para que o primeiro ajuste já apareça
 * para o jogador em vez de mudar o jogo em silêncio.
 */
export const MUDANCAS: MudancaDeCarta[] = []

/**
 * As cartas que deixaram de existir, com o último formato que tiveram. Uma
 * run antiga pode citar uma delas no histórico, e sem isto o replay mostraria
 * um id cru na tela.
 */
export const CARTAS_REMOVIDAS: CartaSnapshot[] = []

export function mudancasDaCarta(id: CardId): MudancaDeCarta[] {
  return MUDANCAS.filter((m) => m.carta === id)
}

/**
 * Como a carta era naquela run. A ordem das fontes é a ordem da confiança:
 * o retrato da run é a verdade daquele dia; o baralho de hoje serve para
 * carta que nunca mudou; a lista de removidas é o resgate; e o último caso
 * (id desconhecido, de uma run velha demais) devolve um rótulo honesto em
 * vez de derrubar a página.
 */
export function cartaComoEra(id: CardId, retrato?: CartaSnapshot[]): CartaSnapshot {
  const naRun = retrato?.find((c) => c.id === id)
  if (naRun) return naRun
  const hoje = CARDS_BY_ID[id]
  if (hoje) return { id, name: hoje.name, cost: hoje.cost, kind: hoje.kind, text: hoje.text }
  const removida = CARTAS_REMOVIDAS.find((c) => c.id === id)
  if (removida) return removida
  return { id, name: 'Carta removida', cost: 0, kind: 'tarefa', text: 'Esta carta não existe mais no jogo.' }
}

/**
 * A carta daquela run no formato que o componente `Card` desenha. `efeitos`
 * vai vazio de propósito: isto é um retrato para olhar, não uma carta para
 * jogar — e uma carta removida não tem regra nenhuma para carregar.
 */
export function cartaParaMostrar(id: CardId, retrato?: CartaSnapshot[]): ActionCard {
  return { ...cartaComoEra(id, retrato), efeitos: [], starter: false }
}
