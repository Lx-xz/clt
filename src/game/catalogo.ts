import type {
  ActionCard,
  CardId,
  CartaSnapshot,
  EventCard,
  MudancaDeCarta,
} from './types'
import { idAtual } from './ids'

/**
 * O catálogo vivo: quais cartas e eventos EXISTEM agora.
 *
 * As cartas moraram no código até a v0.10. Hoje a fonte da verdade é o banco
 * (tabelas `cartas` e `cartas_evento`), e este módulo é a única porta por
 * onde o resto do jogo as enxerga — `getCard` e `getEvent` leem daqui, não de
 * um array importado.
 *
 * **O banco é a ÚNICA fonte (v0.39).** Até ali o código tinha uma cópia
 * (`cards.ts`/`events.ts`), que servia de semente e de rede: sem banco, o
 * jogo abria com ela. Só que a cópia andava atrás do balanceamento feito no
 * /lab, e a rede jogava a pessoa com números velhos sem avisar — duas
 * versões do mesmo baralho, e nenhuma certeza de qual valia. Hoje o catálogo
 * nasce VAZIO; quem o enche é o banco ou, com a rede fora, a última cópia
 * que o banco mandou para este navegador (`src/data/cartas.ts`). Sem nenhum
 * dos dois a guarda de sessão diz que não conseguiu carregar as cartas, em
 * vez de abrir a mesa. O simulador lê o arquivo exportado do /lab.
 */

interface Catalogo {
  cartas: Map<CardId, ActionCard>
  eventos: Map<CardId, EventCard>
  versao: number
  mudancas: MudancaDeCarta[]
  removidas: CartaSnapshot[]
  doBanco: boolean
}

function porId<T extends { id: CardId }>(itens: T[]): Map<CardId, T> {
  return new Map(itens.map((i) => [i.id, i]))
}

function catalogoVazio(): Catalogo {
  return { cartas: new Map(), eventos: new Map(), versao: 0, mudancas: [], removidas: [], doBanco: false }
}

let atual: Catalogo = catalogoVazio()

export interface CatalogoCarregado {
  cartas: ActionCard[]
  eventos: EventCard[]
  versao: number
  mudancas: MudancaDeCarta[]
  removidas: CartaSnapshot[]
}

/**
 * Troca o catálogo pelo que veio do banco. `aoVivo` diz se a resposta veio
 * agora ou da cópia guardada no navegador: com a cópia, o /lab não grava
 * (estaria editando em cima do que pode já ter mudado).
 *
 * Catálogo vazio é instalado também: é o banco recém-criado, e é no /lab
 * que nascem as primeiras cartas. Quem decide se dá para JOGAR é
 * `catalogoJogavel`.
 */
export function carregarCatalogo(dados: CatalogoCarregado, aoVivo = true) {
  atual = {
    cartas: porId(dados.cartas),
    eventos: porId(dados.eventos),
    versao: dados.versao,
    mudancas: dados.mudancas,
    removidas: dados.removidas,
    doBanco: aoVivo,
  }
}

/** Dá para começar uma partida: há baralho inicial e evento para virar. */
export function catalogoJogavel(): boolean {
  return cartasIniciais().length > 0 && eventosDoJogo().length > 0
}

export function catalogoVeioDoBanco(): boolean {
  return atual.doBanco
}

// ------------------------------------------------------------------ leitura

/** Tudo que o catálogo conhece, inclusive o que foi removido do jogo. */
export function todasAsCartas(): ActionCard[] {
  return [...atual.cartas.values()]
}

export function todosOsEventos(): EventCard[] {
  return [...atual.eventos.values()]
}

/** As que ainda estão no jogo — as únicas que entram em baralho novo. */
export function cartasDoJogo(): ActionCard[] {
  return todasAsCartas().filter((c) => c.ativa !== false)
}

export function eventosDoJogo(): EventCard[] {
  return todosOsEventos().filter((e) => e.ativa !== false)
}

export function cartasIniciais(): ActionCard[] {
  return cartasDoJogo().filter((c) => c.starter)
}

export function cartasDesbloqueaveis(): ActionCard[] {
  return cartasDoJogo().filter((c) => !c.starter)
}

export function versaoDoBaralho(): number {
  return atual.versao
}

export function mudancasDoCatalogo(): MudancaDeCarta[] {
  return atual.mudancas
}

export function cartasRemovidas(): CartaSnapshot[] {
  return atual.removidas
}

/**
 * A carta de um id. Com o catálogo no banco, id desconhecido deixou de ser
 * "impossível" e virou "raro": um save antigo, uma carta apagada à mão no SQL
 * Editor. Antes isto lançava e derrubava a mesa inteira; hoje devolve uma
 * carta inerte — custo zero, sem classe, sem efeito — que o jogador consegue
 * ver e descartar, e avisa no console de quem estiver olhando.
 */
export function getCard(id: CardId): ActionCard {
  // o id antigo (`hora-extra`) ainda chega de save velho: vira o uuid aqui
  // também, além de na leitura (veja `ids.ts`)
  id = idAtual(id)
  const carta = atual.cartas.get(id)
  if (carta) return carta
  if (typeof console !== 'undefined') console.warn(`Carta fora do catálogo: ${id}`)
  return {
    id,
    name: 'Carta removida',
    cost: 0,
    kind: null,
    text: 'Esta carta não existe mais no jogo.',
    efeitos: [],
    starter: false,
    ativa: false,
  }
}

export function getEvent(id: CardId): EventCard {
  id = idAtual(id)
  const evento = atual.eventos.get(id)
  if (evento) return evento
  if (typeof console !== 'undefined') console.warn(`Evento fora do catálogo: ${id}`)
  return { id, name: 'Dia comum', tone: 'positivo', text: 'Nada de diferente hoje.', efeitos: [] }
}

// --------------------------------------------------------------- retratos

/** A carta reduzida ao que a run precisa lembrar. Veja `CartaSnapshot`. */
export function fotografarCarta(card: ActionCard): CartaSnapshot {
  const retrato: CartaSnapshot = { id: card.id, name: card.name, cost: card.cost, kind: card.kind, text: card.text }
  // só quando existe: o retrato das cartas que só custam energia fica
  // idêntico ao de antes, e o simulador continua comparando byte a byte
  if (card.custos?.length) retrato.custos = card.custos
  return retrato
}

/**
 * O retrato do baralho equipado. Guardado dentro da run porque é a única
 * parte do versionamento que NÃO dá para acrescentar depois: uma run jogada
 * antes de isto existir nunca vai saber quanto custava a carta naquele dia.
 *
 * Com o catálogo no banco isto deixou de ser zelo e virou necessidade: agora
 * uma carta muda de custo sem ninguém publicar nada.
 */
export function fotografarBaralho(equipped: CardId[]): CartaSnapshot[] {
  return equipped.map((id) => fotografarCarta(getCard(id)))
}
