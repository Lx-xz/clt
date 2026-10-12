/**
 * Os ids das cartas e dos eventos são UUID (v0.35).
 *
 * Eram o nome em hífens (`hora-extra`), e renomear a carta deixava o id
 * contando o nome velho. Hoje o id é um uuid e o nome muda à vontade.
 *
 * **O id antigo vira o uuid por uma CONTA, não por uma tabela:** é o uuid v5
 * do id antigo, num espaço de nomes fixo (`ESPACO`). O banco faz a mesma conta
 * (`uuid_generate_v5` no `schema.sql`), então o site e o banco chegam ao mesmo
 * uuid sem combinar nada — e qualquer id antigo esquecido num save, numa run
 * gravada ou no localStorage de alguém vira o uuid certo quando é LIDO. É a
 * mesma regra de sempre neste projeto: quem traduz é a leitura (`lerAvatar`,
 * `migrarAcoes`, `lerColecao`), e nada precisa ser reescrito de uma vez.
 *
 * Não mude `ESPACO`: com outro espaço, o mesmo id antigo daria outro uuid, e
 * as cartas de quem tem save antigo deixariam de existir.
 */

import { IDS_ANTIGOS_DO_CODIGO } from './idsAntigos'

/** O espaço de nomes dos ids de carta e de evento. Fixo para sempre. */
export const ESPACO = '3336ec3e-fbe1-4dfb-9b02-794d74311adc'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function ehUuid(id: string): boolean {
  return UUID.test(id)
}

/** SHA-1 síncrono, em bytes. A leitura dos saves é síncrona, e o
 *  `crypto.subtle` só sabe ser assíncrono. */
function sha1(bytes: Uint8Array): Uint8Array {
  const ml = bytes.length * 8
  const comPad = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6)
  comPad.set(bytes)
  comPad[bytes.length] = 0x80
  const dv = new DataView(comPad.buffer)
  dv.setUint32(comPad.length - 4, ml >>> 0)
  dv.setUint32(comPad.length - 8, Math.floor(ml / 2 ** 32))
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0
  const w = new Uint32Array(80)
  for (let i = 0; i < comPad.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4)
    for (let t = 16; t < 80; t++) {
      const x = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]
      w[t] = (x << 1) | (x >>> 31)
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4
    for (let t = 0; t < 80; t++) {
      const f = t < 20 ? (b & c) | (~b & d) : t < 40 ? b ^ c ^ d : t < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d
      const k = t < 20 ? 0x5a827999 : t < 40 ? 0x6ed9eba1 : t < 60 ? 0x8f1bbcdc : 0xca62c1d6
      const tmp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]) >>> 0
      e = d
      d = c
      c = (b << 30) | (b >>> 2)
      b = a
      a = tmp
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }
  const out = new Uint8Array(20)
  const ov = new DataView(out.buffer)
  ;[h0, h1, h2, h3, h4].forEach((h, i) => ov.setUint32(i * 4, h))
  return out
}

/** O uuid v5 de `nome` no espaço `ESPACO` (RFC 4122), igual ao
 *  `uuid_generate_v5` do Postgres. */
export function uuidV5(nome: string, espaco = ESPACO): string {
  const ns = espaco.replace(/-/g, '')
  const nsBytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) nsBytes[i] = parseInt(ns.slice(i * 2, i * 2 + 2), 16)
  const nomeBytes = new TextEncoder().encode(nome)
  const tudo = new Uint8Array(16 + nomeBytes.length)
  tudo.set(nsBytes)
  tudo.set(nomeBytes, 16)
  const h = sha1(tudo).slice(0, 16)
  h[6] = (h[6] & 0x0f) | 0x50
  h[8] = (h[8] & 0x3f) | 0x80
  const hex = Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const cache = new Map<string, string>()

/**
 * O id de HOJE de uma carta ou evento. O uuid passa direto; o id antigo vira
 * o uuid dele. Use em todo campo que se SABE que é id de carta ou de evento.
 */
export function idAtual(id: string): string
export function idAtual(id: string | null | undefined): string | null | undefined
export function idAtual(id: string | null | undefined): string | null | undefined {
  if (typeof id !== 'string' || id === '' || ehUuid(id)) return id
  let novo = cache.get(id)
  if (!novo) {
    novo = uuidV5(id)
    cache.set(id, novo)
  }
  return novo
}

/**
 * Os ids antigos que se CONHECE: os do baralho de referência e os que o
 * banco devolve em `id_antigo` (as cartas criadas no lab antes do uuid). É a
 * lista que `traduzirIds` procura num objeto qualquer — ali não se sabe quais
 * strings são id, então só as conhecidas são trocadas.
 */
const conhecidos = new Set<string>(IDS_ANTIGOS_DO_CODIGO)

export function registrarIdsAntigos(ids: Iterable<string>) {
  for (const id of ids) if (id && !ehUuid(id)) conhecidos.add(id)
}

/**
 * Troca, num objeto qualquer (um save, o `details` de uma run), todo id
 * antigo CONHECIDO pelo uuid dele — nos valores e nas chaves. Para os campos
 * que se sabe que são id, `idAtual` é mais seguro; isto é para o que não tem
 * formato fixo, como o `GameState` inteiro. `carta:<id>` (as vagas vendidas
 * da máquina) também é traduzido.
 */
export function traduzirIds<T>(valor: T): T {
  if (conhecidos.size === 0) return valor
  const troca = (s: string): string => {
    if (conhecidos.has(s)) return idAtual(s)
    if (s.startsWith('carta:') && conhecidos.has(s.slice(6))) return `carta:${idAtual(s.slice(6))}`
    return s
  }
  const andar = (v: unknown): unknown => {
    if (typeof v === 'string') return troca(v)
    if (Array.isArray(v)) return v.map(andar)
    if (v && typeof v === 'object') {
      const novo: Record<string, unknown> = {}
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) novo[troca(k)] = andar(x)
      return novo
    }
    return v
  }
  return andar(valor) as T
}
