import { getCard, cartasDoJogo } from './catalogo'
import { copiasMaximas, ganharCopia } from './colecao'
import { COSMETICOS, cosmeticoPorId } from './cosmeticos'
import type { CardId, Collection, Raridade } from './types'

/**
 * Os tokens e a máquina de vendas (v0.29).
 *
 * Desde que a recompensa sorteia entre TODAS as cartas (e não só entre as
 * que ainda cabem), ela pode dar uma cópia acima do teto, ou um item que a
 * pessoa já tem. Essa sobra não some: vira token, na abertura, e o token
 * compra na máquina a carta ou o item que falta. É o caminho garantido e
 * lento para o que a sorte não deu.
 *
 * A troca não é de um para um, de propósito: a repetida vale o PESO da
 * raridade (`TOKENS_POR_RARIDADE`, uma comum dá 1), e a máquina cobra bem
 * mais (`PRECO_NA_MAQUINA`). Senão juntar repetidas viraria o jeito rápido
 * de completar a coleção, que é justamente o que isto existe para impedir.
 *
 * O saldo e a vitrine do dia moram na coleção (`Collection.tokens`,
 * `Collection.maquina`), como as recompensas: sobem em `saves.collection`
 * sem coluna nova.
 */
export const TOKENS_POR_RARIDADE: Record<Raridade, number> = {
  comum: 1,
  incomum: 2,
  rara: 3,
  epica: 4,
  lendaria: 5,
}

export const PRECO_NA_MAQUINA: Record<Raridade, number> = {
  comum: 10,
  incomum: 18,
  rara: 30,
  epica: 45,
  lendaria: 70,
}

/** Quantas cartas e quantos itens a máquina mostra por dia. */
export const VAGAS = { cartas: 3, cosmeticos: 3 }

/** A chance de cada raridade numa vaga de carta da máquina: mais comum do
 *  que rara, como tudo no jogo, mas a lendária aparece. */
const CHANCES_DA_VITRINE: Record<Raridade, number> = { comum: 0.35, incomum: 0.3, rara: 0.2, epica: 0.1, lendaria: 0.05 }
const ORDEM: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']

export function saldo(c: Collection): number {
  return c.tokens ?? 0
}

export function comTokens(c: Collection, n: number): Collection {
  return n ? { ...c, tokens: saldo(c) + n } : c
}

/** O que uma vaga da máquina guarda. */
export type Vaga = { tipo: 'carta'; id: CardId } | { tipo: 'cosmetico'; id: string } | { tipo: 'abobora'; id: 'abobora' }

export function chaveDaVaga(v: Vaga): string {
  return `${v.tipo}:${v.id}`
}

export function raridadeDaVaga(v: Vaga): Raridade {
  if (v.tipo === 'abobora') return 'epica'
  return v.tipo === 'carta' ? (getCard(v.id).raridade ?? 'comum') : (cosmeticoPorId(v.id)?.raridade ?? 'comum')
}

export function precoDaVaga(v: Vaga, c?: Collection): number {
  if (v.tipo === 'abobora') return c ? precoDaAbobora(c) : PRECO_DA_ABOBORA
  return PRECO_NA_MAQUINA[raridadeDaVaga(v)]
}

function sortearRaridade(sorte: () => number): Raridade {
  let resto = sorte()
  for (const r of ORDEM) {
    resto -= CHANCES_DA_VITRINE[r]
    if (resto < 0) return r
  }
  return 'comum'
}

/**
 * A vitrine de HOJE. Montada uma vez por dia e gravada na coleção: comprar
 * a última cópia não troca o que está na máquina, e recarregar não sorteia
 * outra. Só entra o que a pessoa ainda pode ter — carta abaixo do teto,
 * item que não tem —, sem repetir; com a coleção cheia, a vaga fica vazia.
 */
export function maquinaDeHoje(c: Collection, dia: string, sorte: () => number = Math.random): Collection {
  if (c.maquina?.dia === dia) return c
  const cartas: CardId[] = []
  const faltam = cartasDoJogo().filter((carta) => (c.tenho[carta.id] ?? 0) < copiasMaximas(carta))
  for (let n = 0; n < VAGAS.cartas; n++) {
    const livres = faltam.filter((carta) => !cartas.includes(carta.id))
    if (!livres.length) break
    const alvo = sortearRaridade(sorte)
    const i = ORDEM.indexOf(alvo)
    for (const r of [...ORDEM.slice(0, i + 1).reverse(), ...ORDEM.slice(i + 1)]) {
      const pool = livres.filter((carta) => (carta.raridade ?? 'comum') === r)
      if (pool.length) {
        cartas.push(pool[Math.floor(sorte() * pool.length)].id)
        break
      }
    }
  }
  const novos = COSMETICOS.filter((x) => !c.cosmeticos.includes(x.id))
  const cosmeticos: string[] = []
  for (let n = 0; n < VAGAS.cosmeticos && novos.length; n++) {
    cosmeticos.push(novos.splice(Math.floor(sorte() * novos.length), 1)[0].id)
  }
  return { ...c, maquina: { dia, cartas, cosmeticos, vendidos: [] } }
}

/**
 * Compra uma vaga. Devolve a coleção nova, ou o MOTIVO de não dar, em
 * português, para a máquina escrever no visor.
 */
export function comprar(c: Collection, v: Vaga): Collection | string {
  if (v.tipo === 'abobora') return comprarAbobora(c)
  const m = c.maquina
  const naVitrine = v.tipo === 'carta' ? m?.cartas.includes(v.id) : m?.cosmeticos.includes(v.id)
  if (!m || !naVitrine) return 'Fora da máquina hoje'
  if (m.vendidos.includes(chaveDaVaga(v))) return 'Esgotado'
  const preco = precoDaVaga(v)
  if (saldo(c) < preco) return 'Saldo insuficiente'
  let depois: Collection
  if (v.tipo === 'carta') {
    depois = ganharCopia(c, v.id)
    if (depois === c) return 'Você já tem o máximo'
  } else {
    if (c.cosmeticos.includes(v.id)) return 'Você já tem'
    depois = { ...c, cosmeticos: [...c.cosmeticos, v.id] }
  }
  return { ...depois, tokens: saldo(c) - preco, maquina: { ...m, vendidos: [...m.vendidos, chaveDaVaga(v)] } }
}

// ------------------------------------------------------------- a abóbora

/** O preço da abóbora na máquina (v0.34). Cara de propósito: ela GARANTE um
 *  item de Halloween que a pessoa ainda não tem, e o item avulso mais raro
 *  custa 70. */
export const PRECO_DA_ABOBORA = 40

/**
 * A temporada de Halloween: outubro inteiro e os dois primeiros dias de
 * novembro. Fora dela a máquina não vende abóbora e o início não mostra o
 * aviso. `dia` é a data LOCAL (`hoje()`), como a das missões.
 */
export function temporadaDeHalloween(dia: string): boolean {
  const [, mes, d] = dia.split('-').map(Number)
  return mes === 10 || (mes === 11 && d <= 2)
}

/** Os itens de Halloween que a pessoa ainda não tem: é deles que a abóbora
 *  da máquina sorteia, e por isso ela nunca repete. */
export function halloweenQueFalta(c: Collection): string[] {
  // o que já está prometido numa recompensa fechada também conta como tido:
  // senão a segunda abóbora, comprada antes de abrir a primeira, repetiria
  const prometidos = c.envelopes.flatMap((e) => e.cosmeticos ?? [])
  return COSMETICOS.filter((x) => x.tema === 'halloween' && !c.cosmeticos.includes(x.id) && !prometidos.includes(x.id)).map((x) => x.id)
}

/** Quanto a abóbora custa para esta pessoa agora: zero na primeira. */
export function precoDaAbobora(c: Collection): number {
  return c.aboboraGratis ? PRECO_DA_ABOBORA : 0
}

/**
 * Compra a abóbora: ela entra FECHADA na frente da fila de recompensas, já
 * com o item sorteado dentro (um que a pessoa não tem), e quem compra a abre
 * na hora. Devolve a coleção nova ou o motivo, como `comprar`.
 */
export function comprarAbobora(c: Collection, sorte: () => number = Math.random): Collection | string {
  const falta = halloweenQueFalta(c)
  if (!falta.length) return 'Você já tem toda a coleção'
  const preco = precoDaAbobora(c)
  if (saldo(c) < preco) return 'Saldo insuficiente'
  const item = falta[Math.floor(sorte() * falta.length)]
  return {
    ...c,
    tokens: saldo(c) - preco,
    aboboraGratis: true,
    envelopes: [{ tipo: 'abobora', id: `maquina:${Date.now()}`, cartas: [], cosmeticos: [item] }, ...c.envelopes],
  }
}

// ---------------------------------------------------------- as conquistas

/**
 * Credita os tokens das conquistas ganhas que ainda não pagaram. Quem confere
 * a conquista é o banco; o saldo mora na coleção, e `conquistasPagas` é o que
 * impede de pagar duas vezes. Quem ganhou conquista antes de elas valerem
 * token recebe tudo de uma vez, na primeira leitura.
 */
export function creditarConquistas(c: Collection, ganhas: { id: string; tokens: number }[]): Collection {
  const pagas = new Set(c.conquistasPagas ?? [])
  const novas = ganhas.filter((g) => !pagas.has(g.id))
  if (!novas.length) return c
  return {
    ...comTokens(c, novas.reduce((t, g) => t + (g.tokens || 0), 0)),
    conquistasPagas: [...pagas, ...novas.map((g) => g.id)],
  }
}
