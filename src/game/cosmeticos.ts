import type { Raridade } from './types'

/**
 * Cosméticos: peças do avatar que não nascem liberadas, e saem de MALETA.
 *
 * O envelope dá carta; a maleta dá coisa para vestir. São duas recompensas
 * porque são duas vontades diferentes — melhorar o baralho e mudar a cara —,
 * e misturar as duas no mesmo pacote faria o óculos competir com a carta
 * lendária pela mesma sorte.
 *
 * No jogo, desde a v0.24, o item sai da MALETA e do COFRE da escada de
 * recompensa, junto com as cartas (`sortearCosmetico`, chamado por
 * `missoes.ts`). As maletas de bronze, prata e ouro (`MALETAS`) continuam
 * só no /lab: foram o teste do modelo e da animação.
 *
 * Um cosmético é um VALOR de um campo da receita do avatar (`oculos: 'sol'`).
 * O desenho continua morando no `Avatar.tsx`, como toda peça; esta tabela só
 * diz quais valores são trancados e como se ganham. Peça que não está aqui
 * é de todo mundo, como sempre foi.
 */
export interface Cosmetico {
  /** `campo:valor` — é o que a coleção guarda. */
  id: string
  campo: string
  valor: string
  nome: string
  raridade: Raridade
  /** A aba do editor onde a peça mora: é o ÍCONE dela que diz o tipo do
   *  cosmético na abertura da maleta (óculos é da aba de acessórios). */
  aba: 'rosto' | 'olhos' | 'cabelo' | 'barba' | 'roupa' | 'extras' | 'fundo'
  /** A coleção sazonal a que a peça pertence: leva o símbolo dela no canto
   *  (a abóbora, no Halloween) onde quer que apareça. */
  tema?: 'halloween'
}

export const COSMETICOS: Cosmetico[] = [
  { id: 'oculos:sol', campo: 'oculos', valor: 'sol', nome: 'Óculos de sol', raridade: 'rara', aba: 'extras' },
  // os normais da v0.30, trancados até o autor dizer quais viram de todo
  // mundo (tirar daqui é o que os libera)
  { id: 'cabelo:tigelinha', campo: 'cabelo', valor: 'tigelinha', nome: 'Cabelo tigelinha', raridade: 'comum', aba: 'cabelo' },
  { id: 'cabelo:rabo', campo: 'cabelo', valor: 'rabo', nome: 'Rabo de cavalo', raridade: 'comum', aba: 'cabelo' },
  { id: 'cabelo:repartidoCurto', campo: 'cabelo', valor: 'repartidoCurto', nome: 'Repartido curto', raridade: 'comum', aba: 'cabelo' },
  { id: 'cabelo:repartidoMedio', campo: 'cabelo', valor: 'repartidoMedio', nome: 'Repartido médio', raridade: 'comum', aba: 'cabelo' },
  { id: 'cabelo:repartidoLongo', campo: 'cabelo', valor: 'repartidoLongo', nome: 'Repartido longo', raridade: 'incomum', aba: 'cabelo' },
  { id: 'cabelo:tranca', campo: 'cabelo', valor: 'tranca', nome: 'Trança', raridade: 'incomum', aba: 'cabelo' },
  { id: 'cabelo:pompadour', campo: 'cabelo', valor: 'pompadour', nome: 'Pompadour', raridade: 'incomum', aba: 'cabelo' },
  { id: 'cabelo:mullet', campo: 'cabelo', valor: 'mullet', nome: 'Mullet', raridade: 'comum', aba: 'cabelo' },
  { id: 'cabelo:moicano', campo: 'cabelo', valor: 'moicano', nome: 'Moicano', raridade: 'incomum', aba: 'cabelo' },
  { id: 'cor:rosa', campo: 'cor', valor: 'rosa', nome: 'Cabelo rosa', raridade: 'incomum', aba: 'cabelo' },
  { id: 'cor:azul', campo: 'cor', valor: 'azul', nome: 'Cabelo azul', raridade: 'incomum', aba: 'cabelo' },
  { id: 'cor:verde', campo: 'cor', valor: 'verde', nome: 'Cabelo verde', raridade: 'incomum', aba: 'cabelo' },
  { id: 'cor:lilas', campo: 'cor', valor: 'lilas', nome: 'Cabelo lilás', raridade: 'rara', aba: 'cabelo' },
  { id: 'roupa:rosa', campo: 'roupa', valor: 'rosa', nome: 'Roupa rosa', raridade: 'comum', aba: 'roupa' },
  { id: 'roupa:verde', campo: 'roupa', valor: 'verde', nome: 'Roupa verde', raridade: 'comum', aba: 'roupa' },
  { id: 'acessorio:gorro', campo: 'acessorio', valor: 'gorro', nome: 'Gorro', raridade: 'incomum', aba: 'extras' },
  // a coleção de Halloween (v0.29, e mais na v0.30). Levam a abóbora no
  // canto (`tema`)
  { id: 'fundo:abobora', campo: 'fundo', valor: 'abobora', nome: 'Fundo abóbora', raridade: 'comum', aba: 'fundo', tema: 'halloween' },
  { id: 'roupa:abobora', campo: 'roupa', valor: 'abobora', nome: 'Roupa abóbora', raridade: 'comum', aba: 'roupa', tema: 'halloween' },
  { id: 'roupa:noite', campo: 'roupa', valor: 'noite', nome: 'Roupa noite', raridade: 'comum', aba: 'roupa', tema: 'halloween' },
  { id: 'fundo:noite', campo: 'fundo', valor: 'noite', nome: 'Fundo noite', raridade: 'incomum', aba: 'fundo', tema: 'halloween' },
  { id: 'corChapeu:abobora', campo: 'corChapeu', valor: 'abobora', nome: 'Chapéu abóbora', raridade: 'comum', aba: 'extras', tema: 'halloween' },
  { id: 'corChapeu:noite', campo: 'corChapeu', valor: 'noite', nome: 'Chapéu noite', raridade: 'comum', aba: 'extras', tema: 'halloween' },
  { id: 'cor:abobora', campo: 'cor', valor: 'abobora', nome: 'Cabelo abóbora', raridade: 'incomum', aba: 'cabelo', tema: 'halloween' },
  { id: 'cor:noite', campo: 'cor', valor: 'noite', nome: 'Cabelo noite', raridade: 'incomum', aba: 'cabelo', tema: 'halloween' },
  { id: 'cilios:longos', campo: 'cilios', valor: 'longos', nome: 'Cílios longos', raridade: 'incomum', aba: 'olhos', tema: 'halloween' },
  { id: 'iris:gato', campo: 'iris', valor: 'gato', nome: 'Olho de gato', raridade: 'incomum', aba: 'olhos', tema: 'halloween' },
  { id: 'corOlhos:vermelho', campo: 'corOlhos', valor: 'vermelho', nome: 'Olhos vermelhos', raridade: 'rara', aba: 'olhos', tema: 'halloween' },
  { id: 'cabelo:vampiro', campo: 'cabelo', valor: 'vampiro', nome: 'Cabelo de vampiro', raridade: 'incomum', aba: 'cabelo', tema: 'halloween' },
  { id: 'acessorio:orelhasDeGato', campo: 'acessorio', valor: 'orelhasDeGato', nome: 'Orelhas de gato', raridade: 'incomum', aba: 'extras', tema: 'halloween' },
  { id: 'acessorio:bruxa', campo: 'acessorio', valor: 'bruxa', nome: 'Chapéu de bruxa', raridade: 'rara', aba: 'extras', tema: 'halloween' },
  { id: 'acessorio:chifres', campo: 'acessorio', valor: 'chifres', nome: 'Chifres', raridade: 'rara', aba: 'extras', tema: 'halloween' },
  { id: 'cabelo:frankenstein', campo: 'cabelo', valor: 'frankenstein', nome: 'Cabelo de Frankenstein', raridade: 'rara', aba: 'cabelo', tema: 'halloween' },
  { id: 'iris:colorido', campo: 'iris', valor: 'colorido', nome: 'Olho todo colorido', raridade: 'epica', aba: 'olhos', tema: 'halloween' },
  { id: 'iris:preto', campo: 'iris', valor: 'preto', nome: 'Olho todo preto', raridade: 'lendaria', aba: 'olhos', tema: 'halloween' },
]

export type TipoMaleta = 'bronze' | 'prata' | 'ouro'

export interface Maleta {
  nome: string
  /** A chance de cada raridade de cosmético. Raridade sem peça para dar cai
   *  para a de baixo, e só sem nenhuma para a de cima — como no envelope. */
  chances: Record<Raridade, number>
}

export const MALETAS: Record<TipoMaleta, Maleta> = {
  bronze: { nome: 'Maleta de bronze', chances: { comum: 0.7, incomum: 0.22, rara: 0.07, epica: 0.01, lendaria: 0 } },
  prata: { nome: 'Maleta de prata', chances: { comum: 0.4, incomum: 0.35, rara: 0.18, epica: 0.06, lendaria: 0.01 } },
  ouro: { nome: 'Maleta de ouro', chances: { comum: 0.15, incomum: 0.3, rara: 0.3, epica: 0.17, lendaria: 0.08 } },
}

/**
 * Campos que usam o cosmético de OUTRO campo (v0.31): a cor da barba é uma
 * cor de cabelo, e a das orelhas de gato uma de chapéu. Sem isto, a barba
 * abóbora era de graça para quem não tinha o cabelo abóbora, e a amostra
 * dela não levava a abóbora do Halloween.
 */
const CAMPO_DO_COSMETICO: Record<string, string> = { corBarba: 'cor', corOrelhas: 'corChapeu' }

export function idDoCosmetico(campo: string, valor: string): string {
  return `${CAMPO_DO_COSMETICO[campo] ?? campo}:${valor}`
}

/** O cosmético por trás de uma peça da receita, se ela for um. */
export function cosmeticoDaPeca(campo: string, valor: string): Cosmetico | undefined {
  const id = idDoCosmetico(campo, valor)
  return COSMETICOS.find((c) => c.id === id)
}

/** A peça é trancada e a pessoa não a tem. Peça fora da tabela nunca é. */
export function trancado(campo: string, valor: string, tenho: readonly string[]): boolean {
  const c = cosmeticoDaPeca(campo, valor)
  return !!c && !tenho.includes(c.id)
}

const ORDEM: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']

/**
 * Abre uma maleta: sorteia a raridade e, dentro dela, uma peça que a pessoa
 * ainda não tem. Sem nenhuma peça nova no jogo inteiro, devolve uma
 * REPETIDA (`nova: false`) em vez de nada — com um cosmético só na tabela,
 * a maleta do lab ficaria vazia já na segunda abertura.
 */
export function abrirMaleta(
  tipo: TipoMaleta,
  tenho: readonly string[],
  sorte: () => number = Math.random,
): { cosmetico: Cosmetico; nova: boolean } | null {
  if (COSMETICOS.length === 0) return null
  let resto = sorte()
  let alvo: Raridade = 'comum'
  for (const r of ORDEM) {
    resto -= MALETAS[tipo].chances[r]
    if (resto < 0) {
      alvo = r
      break
    }
  }
  const i = ORDEM.indexOf(alvo)
  const tentativas = [...ORDEM.slice(0, i + 1).reverse(), ...ORDEM.slice(i + 1)]
  const novas = COSMETICOS.filter((c) => !tenho.includes(c.id))
  for (const r of tentativas) {
    const pool = novas.filter((c) => c.raridade === r)
    if (pool.length) return { cosmetico: pool[Math.floor(sorte() * pool.length)], nova: true }
  }
  return { cosmetico: COSMETICOS[Math.floor(sorte() * COSMETICOS.length)], nova: false }
}

/**
 * O item de uma recompensa do JOGO (maleta e cofre, desde a v0.24). A
 * raridade sai das `chances` da recompensa, com a mesma queda das cartas:
 * sem peça na raridade, a de baixo, e só sem nenhuma a de cima.
 *
 * Desde a v0.29 a peça pode ser REPETIDA: o sorteio é entre todas, e a que
 * a pessoa já tem vira token na abertura (`tokens.ts`). Antes só vinha peça
 * nova, e a coleção se completava sozinha — o sorteio mirava justamente o
 * que faltava. `indisponiveis` são só as que já saíram NESTA recompensa:
 * duas iguais no mesmo cofre leriam como erro.
 */
export function sortearCosmetico(
  chances: Record<Raridade, number>,
  indisponiveis: readonly string[],
  sorte: () => number = Math.random,
  /** Só desta coleção sazonal (a abóbora dá só de Halloween). */
  tema?: Cosmetico['tema'],
): Cosmetico | null {
  const novas = COSMETICOS.filter((c) => !indisponiveis.includes(c.id) && (!tema || c.tema === tema))
  if (novas.length === 0) return null
  let resto = sorte()
  let alvo: Raridade = 'comum'
  for (const r of ORDEM) {
    resto -= chances[r]
    if (resto < 0) {
      alvo = r
      break
    }
  }
  const i = ORDEM.indexOf(alvo)
  for (const r of [...ORDEM.slice(0, i + 1).reverse(), ...ORDEM.slice(i + 1)]) {
    const pool = novas.filter((c) => c.raridade === r)
    if (pool.length) return pool[Math.floor(sorte() * pool.length)]
  }
  return null
}

export function cosmeticoPorId(id: string): Cosmetico | undefined {
  return COSMETICOS.find((c) => c.id === id)
}
