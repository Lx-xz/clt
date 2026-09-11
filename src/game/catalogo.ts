import { CARTAS_BASE, VERSAO_BARALHO_BASE } from './cards'
import { EVENTOS_BASE } from './events'
import type {
  ActionCard,
  CardId,
  CartaSnapshot,
  EventCard,
  MudancaDeCarta,
} from './types'

/**
 * O catálogo vivo: quais cartas e eventos EXISTEM agora.
 *
 * As cartas moraram no código até a v0.10. Hoje a fonte da verdade é o banco
 * (tabelas `cartas` e `cartas_evento`), e este módulo é a única porta por
 * onde o resto do jogo as enxerga — `getCard` e `getEvent` leem daqui, não de
 * um array importado.
 *
 * **As cartas do código não foram embora: viraram a semente e a rede.** O
 * catálogo nasce com elas, e o banco só substitui o que conseguir carregar.
 * Isso resolve três coisas de uma vez:
 *
 * 1. O jogo abre e funciona sem banco nenhum — que era uma pendência aberta.
 * 2. Uma falha de rede no meio do carregamento não deixa ninguém sem jogo.
 * 3. A simulação fora do navegador (`src/game/` não importa React nem
 *    Supabase) continua rodando com o baralho de referência.
 *
 * O preço é ter o baralho escrito em dois lugares, e ele é pago uma vez:
 * `admin_semear_catalogo` leva o do código para o banco na estreia, e daí em
 * diante o do código é só o fallback.
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

function catalogoDoCodigo(): Catalogo {
  return {
    cartas: porId(CARTAS_BASE),
    eventos: porId(EVENTOS_BASE),
    versao: VERSAO_BARALHO_BASE,
    mudancas: [],
    removidas: [],
    doBanco: false,
  }
}

let atual: Catalogo = catalogoDoCodigo()

export interface CatalogoCarregado {
  cartas: ActionCard[]
  eventos: EventCard[]
  versao: number
  mudancas: MudancaDeCarta[]
  removidas: CartaSnapshot[]
}

/**
 * Troca o catálogo pelo que veio do banco. Chamado uma vez, na abertura do
 * site (`CarregarCatalogo.tsx`).
 *
 * Um catálogo vazio é IGNORADO de propósito: banco recém-criado, ainda não
 * semeado, devolve zero cartas, e trocar o baralho por nada deixaria o jogo
 * sem como ser jogado. Nesse caso o do código continua valendo.
 */
export function carregarCatalogo(dados: CatalogoCarregado): boolean {
  if (dados.cartas.length === 0) return false
  atual = {
    cartas: porId(dados.cartas),
    eventos: porId(dados.eventos.length > 0 ? dados.eventos : EVENTOS_BASE),
    versao: dados.versao,
    mudancas: dados.mudancas,
    removidas: dados.removidas,
    doBanco: true,
  }
  return true
}

/** Volta ao baralho de referência. Existe para o teste e para "sair da conta". */
export function reiniciarCatalogo() {
  atual = catalogoDoCodigo()
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
  const evento = atual.eventos.get(id)
  if (evento) return evento
  if (typeof console !== 'undefined') console.warn(`Evento fora do catálogo: ${id}`)
  return { id, name: 'Dia comum', tone: 'positivo', text: 'Nada de diferente hoje.', efeitos: [] }
}

// --------------------------------------------------------------- retratos

/** A carta reduzida ao que a run precisa lembrar. Veja `CartaSnapshot`. */
export function fotografarCarta(card: ActionCard): CartaSnapshot {
  return { id: card.id, name: card.name, cost: card.cost, kind: card.kind, text: card.text }
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
