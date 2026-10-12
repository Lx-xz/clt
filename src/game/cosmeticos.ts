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
}

export const COSMETICOS: Cosmetico[] = [
  { id: 'oculos:sol', campo: 'oculos', valor: 'sol', nome: 'Óculos de sol', raridade: 'rara', aba: 'extras' },
  // as íris (v0.27): o feitio do olho por dentro da expressão. A cor continua
  // livre, e é ela que pinta a íris de gato e o olho de réptil
  { id: 'iris:gato', campo: 'iris', valor: 'gato', nome: 'Olho de gato', raridade: 'incomum', aba: 'olhos' },
  { id: 'iris:reptil', campo: 'iris', valor: 'reptil', nome: 'Olho de réptil', raridade: 'rara', aba: 'olhos' },
  { id: 'iris:colorido', campo: 'iris', valor: 'colorido', nome: 'Olho todo colorido', raridade: 'epica', aba: 'olhos' },
  { id: 'iris:preto', campo: 'iris', valor: 'preto', nome: 'Olho todo preto', raridade: 'epica', aba: 'olhos' },
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

export function idDoCosmetico(campo: string, valor: string): string {
  return `${campo}:${valor}`
}

/** A peça é trancada e a pessoa não a tem. Peça fora da tabela nunca é. */
export function trancado(campo: string, valor: string, tenho: readonly string[]): boolean {
  const id = idDoCosmetico(campo, valor)
  return COSMETICOS.some((c) => c.id === id) && !tenho.includes(id)
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
 * O item de uma recompensa do JOGO (maleta e cofre, desde a v0.24): uma
 * peça que a pessoa ainda não tem e que nenhuma outra recompensa fechada já
 * prometeu (`indisponiveis`). A raridade sai das `chances` da recompensa,
 * com a mesma queda das cartas: esgotada, a de baixo, e só sem nenhuma a de
 * cima.
 *
 * Diferente da maleta do lab, aqui NÃO há repetida: peça repetida não vale
 * nada, e um item que não é item seria o recibo mentindo. Sem peça nova no
 * jogo, `null`, e a recompensa vem só com as cartas.
 */
export function sortearCosmetico(
  chances: Record<Raridade, number>,
  indisponiveis: readonly string[],
  sorte: () => number = Math.random,
): Cosmetico | null {
  const novas = COSMETICOS.filter((c) => !indisponiveis.includes(c.id))
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
