import { cartasRemovidas, getCard, mudancasDoCatalogo, versaoDoBaralho } from '@/game/catalogo'
import type { ActionCard, CardId, CartaSnapshot, MudancaDeCarta } from '@/game/types'

/**
 * O versionamento do baralho, do lado de quem LÊ.
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
 *    externo. **É a única metade que não dá para acrescentar depois.**
 * 2. **O histórico, na tabela `cartas_antigas`.** Uma linha por ajuste, com
 *    `oQue` (o número) e `porque` (o motivo). Nasce junto com a edição, no
 *    `/lab/cartas`: a RPC recusa salvar sem motivo, porque mudar o jogo em
 *    silêncio é o que esta estrutura existe para impedir. É o que o jogador
 *    lê ao clicar em **histórico** numa carta do baralho.
 *
 * Desde que o catálogo foi para o banco, as duas metades deixaram de ser
 * zelo: agora uma carta muda de custo sem ninguém publicar versão nenhuma do
 * site, e sem o retrato o replay de ontem mudaria sozinho durante a noite.
 *
 * Este arquivo não guarda nada — ele lê o catálogo (`@/game/catalogo`) e
 * responde as perguntas que a interface faz.
 */

/** A versão do baralho AGORA. É função, e não constante, porque o número
 *  passou a vir do banco: ele muda no meio da vida do site. */
export { versaoDoBaralho }

export type { MudancaDeCarta }

export function mudancasDaCarta(id: CardId): MudancaDeCarta[] {
  return mudancasDoCatalogo().filter((m) => m.carta === id)
}

/**
 * Como a carta era naquela run. A ordem das fontes é a ordem da confiança:
 * o retrato da run é a verdade daquele dia; o catálogo de hoje serve para
 * carta que nunca mudou; a lista de removidas é o resgate; e o último caso
 * (id desconhecido, de uma run velha demais) devolve um rótulo honesto em
 * vez de derrubar a página.
 */
export function cartaComoEra(id: CardId, retrato?: CartaSnapshot[]): CartaSnapshot {
  const naRun = retrato?.find((c) => c.id === id)
  if (naRun) return naRun
  const removida = cartasRemovidas().find((c) => c.id === id)
  if (removida) return removida
  const hoje = getCard(id)
  return { id, name: hoje.name, cost: hoje.cost, kind: hoje.kind, text: hoje.text }
}

/**
 * A carta daquela run no formato que o componente `Card` desenha. `efeitos`
 * vai vazio de propósito: isto é um retrato para olhar, não uma carta para
 * jogar — e uma carta removida não tem regra nenhuma para carregar.
 */
export function cartaParaMostrar(id: CardId, retrato?: CartaSnapshot[]): ActionCard {
  return { ...cartaComoEra(id, retrato), efeitos: [], starter: false }
}
