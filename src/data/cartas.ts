import { carregarCatalogo, type CatalogoCarregado } from '@/game/catalogo'
import { MODO_NORMAL, carregarModos, type Regras } from '@/game/regras'
import type {
  ActionCard,
  CardId,
  CardKind,
  CartaSnapshot,
  ClasseDaCarta,
  EventCard,
  EventChoice,
  MudancaDeCarta,
} from '@/game/types'
import type { Acao, Efeito, Restricao } from '@/game/acoes'
import { supabase } from './supabase'

/**
 * O catálogo, do lado do banco.
 *
 * Este arquivo é a fronteira entre dois vocabulários. O banco fala português
 * (`nome`, `custo`, `classe`), o motor fala o inglês que veio do README
 * (`name`, `cost`, `kind`), e traduzir aqui é o que mantém `src/game/` sem
 * saber que Supabase existe — que é o que permite simular runs fora do
 * navegador.
 */

// --------------------------------------------------------------- tradução

/** A linha da tabela `cartas`. */
interface LinhaCarta {
  id: string
  nome: string
  custo: number
  classe: string | null
  texto: string
  efeitos: Efeito[] | null
  restricao: Restricao | null
  especial: boolean
  inicial: boolean
  copias: number | null
  versao: number
  ativa: boolean
}

interface LinhaEvento {
  id: string
  nome: string
  tom: 'negativo' | 'positivo' | 'ambiguo'
  texto: string
  efeitos: Efeito[] | null
  escolhas: EventChoice[] | null
  versao: number
  ativa: boolean
}

const CLASSES_VALIDAS: CardKind[] = ['tarefa', 'descanso', 'grana', 'social']

/** Classe desconhecida vira NEUTRA em vez de derrubar a página. O mesmo
 *  princípio do avatar: quem valida é a leitura, e o desconhecido cai num
 *  padrão honesto. */
function paraClasse(bruta: string | null): ClasseDaCarta {
  if (!bruta) return null
  return CLASSES_VALIDAS.includes(bruta as CardKind) ? (bruta as CardKind) : null
}

function paraCarta(linha: LinhaCarta): ActionCard {
  return {
    id: linha.id,
    name: linha.nome,
    cost: linha.custo,
    kind: paraClasse(linha.classe),
    text: linha.texto,
    efeitos: linha.efeitos ?? [],
    restricao: linha.restricao ?? undefined,
    especial: linha.especial || undefined,
    starter: linha.inicial,
    copies: linha.copias ?? undefined,
    ativa: linha.ativa,
    versao: linha.versao,
  }
}

function paraEvento(linha: LinhaEvento): EventCard {
  const escolhas = linha.escolhas
  return {
    id: linha.id,
    name: linha.nome,
    tone: linha.tom,
    text: linha.texto,
    efeitos: linha.efeitos ?? [],
    choices: escolhas && escolhas.length === 2 ? [escolhas[0], escolhas[1]] : undefined,
    ativa: linha.ativa,
    versao: linha.versao,
  }
}

/** O caminho de volta: a carta do motor no formato que a RPC espera. */
export function cartaParaBanco(c: ActionCard): Record<string, unknown> {
  return {
    id: c.id,
    nome: c.name,
    custo: c.cost,
    classe: c.kind,
    texto: c.text,
    efeitos: c.efeitos,
    restricao: c.restricao ?? null,
    especial: c.especial ?? false,
    inicial: c.starter,
    copias: c.copies ?? null,
  }
}

export function eventoParaBanco(e: EventCard): Record<string, unknown> {
  return {
    id: e.id,
    nome: e.name,
    tom: e.tone,
    texto: e.text,
    efeitos: e.efeitos ?? [],
    escolhas: e.choices ?? null,
  }
}

// ---------------------------------------------------------------- leitura

interface RespostaCatalogo {
  versao: number
  cartas: LinhaCarta[]
  eventos: LinhaEvento[]
  /** O modo chega achatado: identidade e regras no mesmo objeto, porque é
   *  assim que `Regras` é usado no motor. */
  modos: (Regras & { padrao?: boolean })[]
  mudancas: MudancaDeCarta[]
  removidas: LinhaCarta[]
}

/** Um modo que veio do banco sem algum número cai no do modo normal: como no
 *  avatar, quem valida é a LEITURA, e campo novo não pode derrubar a página
 *  de quem tem uma linha gravada por uma versão anterior. */
function paraRegras(bruto: Partial<Regras> & { id?: string }): Regras {
  return {
    ...MODO_NORMAL,
    ...bruto,
    id: bruto.id ?? MODO_NORMAL.id,
    semanas: bruto.semanas?.length ? bruto.semanas : MODO_NORMAL.semanas,
  }
}

function traduzir(bruto: RespostaCatalogo): CatalogoCarregado {
  return {
    versao: bruto.versao ?? 1,
    cartas: (bruto.cartas ?? []).map(paraCarta),
    eventos: (bruto.eventos ?? []).map(paraEvento),
    mudancas: bruto.mudancas ?? [],
    // a removida chega como a linha inteira que ela era; o replay só precisa
    // do retrato
    removidas: (bruto.removidas ?? []).map((l): CartaSnapshot => {
      const c = paraCarta(l)
      return { id: c.id, name: c.name, cost: c.cost, kind: c.kind, text: c.text }
    }),
  }
}

/**
 * Busca o catálogo e o instala no motor. Devolve se o banco realmente mandou
 * cartas.
 *
 * **Falhar aqui não é erro fatal, de propósito.** Sem banco, com a rede fora
 * ou com o catálogo ainda não semeado, o jogo continua com as cartas do
 * código (`cards.ts`) — o pior caso é jogar o baralho de referência, não é
 * ficar sem jogo.
 */
let tentativa: Promise<boolean> | null = null

/**
 * O catálogo, carregado uma vez por visita. Todo mundo que precisa dele
 * espera a MESMA promessa: a home dispara sem esperar (o tutorial só abre no
 * clique, e até lá a resposta chegou) e a guarda de sessão aguarda junto com
 * a leitura da conta, sem custar uma viagem a mais.
 */
export function catalogoPronto(): Promise<boolean> {
  tentativa ??= carregarCatalogoDoBanco()
  return tentativa
}

export async function carregarCatalogoDoBanco(): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data, error } = await supabase.rpc('catalogo')
    if (error || !data) return false
    const resposta = data as RespostaCatalogo
    carregarModos((resposta.modos ?? []).map(paraRegras))
    return carregarCatalogo(traduzir(resposta))
  } catch {
    return false
  }
}

// ------------------------------------------------------------------ admin

/** O que toda escrita no catálogo devolve: o catálogo já atualizado, para a
 *  bancada não precisar buscar de novo. */
async function escrever(
  fn: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; erro?: string }> {
  if (!supabase) return { ok: false, erro: 'Banco não configurado.' }
  const { data, error } = await supabase.rpc(fn, args)
  if (error) return { ok: false, erro: error.message }
  if (data) {
    const resposta = data as RespostaCatalogo
    carregarModos((resposta.modos ?? []).map(paraRegras))
    carregarCatalogo(traduzir(resposta))
  }
  return { ok: true }
}

/**
 * `oQue` e `porque` viajam junto com a carta e não são opcionais no banco.
 * É a decisão central desta tela: o histórico da carta nasce NO MOMENTO da
 * edição, porque escrito depois ele não seria escrito.
 */
export function salvarCarta(carta: ActionCard, oQue: string, porque: string) {
  return escrever('admin_salvar_carta', {
    p_carta: cartaParaBanco(carta),
    p_o_que: oQue,
    p_porque: porque,
  })
}

export function salvarEvento(evento: EventCard, oQue: string, porque: string) {
  return escrever('admin_salvar_evento', {
    p_evento: eventoParaBanco(evento),
    p_o_que: oQue,
    p_porque: porque,
  })
}

/** Não apaga: marca como fora do jogo. Quem está no meio de uma run com a
 *  carta na mão termina a partida normalmente. */
export function excluirDoCatalogo(id: CardId, familia: 'acao' | 'evento', porque: string) {
  return escrever('admin_excluir_carta', { p_id: id, p_familia: familia, p_porque: porque })
}

/** A ponte de mão única: leva o baralho do código para o banco. Roda uma vez,
 *  na estreia; depois é inofensiva, porque nada existente é sobrescrito. */
export function semearCatalogo(cartas: ActionCard[], eventos: EventCard[], modos: Regras[]) {
  return escrever('admin_semear_catalogo', {
    p_cartas: cartas.map(cartaParaBanco),
    p_eventos: eventos.map(eventoParaBanco),
    p_modos: modos.map((m, i) => ({ ...m, padrao: i === 0 })),
  })
}

/** As regras do jogo. Mexer aqui não afeta quem já está no meio de uma run:
 *  a run copia o modo na criação e joga com ele até o fim. */
export function salvarModo(modo: Regras, oQue: string, porque: string) {
  return escrever('admin_salvar_modo', { p_modo: modo, p_o_que: oQue, p_porque: porque })
}

export type { Acao }
