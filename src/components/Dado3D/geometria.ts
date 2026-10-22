/**
 * A geometria dos dados (d2 a d20), para o `Dado3D` desenhar com CSS 3D.
 *
 * Cada sólido é dado só pelos VÉRTICES, e as faces saem de um fecho convexo
 * ingênuo (todo trio de pontos que deixa os outros de um lado é uma face).
 * Com no máximo 48 pontos isso roda num instante, e poupa escrever à mão as
 * listas de faces do dodecaedro e do icosaedro — que é onde se erra.
 *
 * Coordenadas no espaço do CSS (x para a direita, y para BAIXO, z para quem
 * olha), com o sólido centrado na origem e raio perto de 1.
 */

export type Vec = [number, number, number]

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = (a: Vec) => Math.sqrt(dot(a, a))
const norm = (a: Vec): Vec => mul(a, 1 / len(a))

export interface Face {
  /** O centro da face e a base dela: `u` para a direita, `v` para baixo
   *  (no papel da face), `n` para fora do sólido. `u × v = n`. */
  c: Vec
  u: Vec
  v: Vec
  n: Vec
  /** Os cantos no plano da face, em (u, v). */
  pontos: [number, number][]
  /** Onde o número mora: o centro do MAIOR círculo que cabe na face, e o
   *  raio dele. A média dos cantos não serve: na pipa do d10 ela escorrega
   *  para o bico comprido, e o número saía do meio. */
  meio: [number, number]
  raio: number
  /** Os cantos em 3D, na ordem de `pontos`. */
  cantos: Vec[]
}

/** A distância de um ponto à borda de um polígono convexo (negativa fora). */
function folga(px: number, py: number, pts: [number, number][]): number {
  let menor = Infinity
  for (let k = 0; k < pts.length; k++) {
    const [ax, ay] = pts[k]
    const [bx, by] = pts[(k + 1) % pts.length]
    const ex = bx - ax
    const ey = by - ay
    const l = Math.hypot(ex, ey)
    // o lado de dentro: o centro (0,0) da face está sempre dentro
    const lado = Math.sign(ex * (0 - ay) - ey * (0 - ax)) || 1
    menor = Math.min(menor, (lado * (ex * (py - ay) - ey * (px - ax))) / l)
  }
  return menor
}

/** O maior círculo dentro do polígono: uma grade e depois um refino. */
function circuloDentro(pts: [number, number][]): { meio: [number, number]; raio: number } {
  let melhor: [number, number] = [0, 0]
  let raio = folga(0, 0, pts)
  let passo = 0.25
  for (let rodada = 0; rodada < 6; rodada++) {
    const [cx, cy] = melhor
    for (let i = -4; i <= 4; i++)
      for (let j = -4; j <= 4; j++) {
        const x = cx + i * passo
        const y = cy + j * passo
        const f = folga(x, y, pts)
        if (f > raio) {
          raio = f
          melhor = [x, y]
        }
      }
    passo /= 3
  }
  return { meio: melhor, raio }
}

/** O fecho convexo de um punhado de pontos, como lista de faces. */
function fecho(pontos: Vec[]): Face[] {
  const eps = 1e-6
  const centro = mul(pontos.reduce(add, [0, 0, 0] as Vec), 1 / pontos.length)
  const faces: Face[] = []
  const vistos: Vec[] = []
  for (let i = 0; i < pontos.length; i++)
    for (let j = i + 1; j < pontos.length; j++)
      for (let k = j + 1; k < pontos.length; k++) {
        let n = cross(sub(pontos[j], pontos[i]), sub(pontos[k], pontos[i]))
        if (len(n) < eps) continue
        n = norm(n)
        if (dot(n, sub(pontos[i], centro)) < 0) n = mul(n, -1)
        const d = dot(n, pontos[i])
        if (pontos.some((p) => dot(n, p) > d + eps)) continue
        if (vistos.some((m) => dot(m, n) > 1 - 1e-6)) continue
        vistos.push(n)
        const naFace = pontos.filter((p) => Math.abs(dot(n, p) - d) < 1e-5)
        const c = mul(naFace.reduce(add, [0, 0, 0] as Vec), 1 / naFace.length)
        // o "alto" da face: o vértice mais longe do centro (o bico da pipa
        // do d10, a ponta do triângulo) ou, num quadrado, o meio de um lado
        const dist = naFace.map((p) => len(sub(p, c)))
        const max = Math.max(...dist)
        const regular = dist.every((x) => Math.abs(x - max) < 1e-4)
        // ordena em volta da normal para o polígono não se cruzar
        const ref = norm(sub(naFace[0], c))
        const lado = cross(n, ref)
        const ordenados = [...naFace].sort((a, b) => {
          const pa = sub(a, c)
          const pb = sub(b, c)
          return Math.atan2(dot(pa, lado), dot(pa, ref)) - Math.atan2(dot(pb, lado), dot(pb, ref))
        })
        let alto: Vec
        if (regular && naFace.length === 4) alto = norm(sub(mul(add(ordenados[0], ordenados[1]), 0.5), c))
        else alto = norm(sub(naFace[dist.indexOf(max)], c))
        const v = mul(alto, -1)
        const u = cross(v, n)
        const pontos2d = ordenados.map((p) => [dot(sub(p, c), u), dot(sub(p, c), v)] as [number, number])
        faces.push({ c, u, v, n, pontos: pontos2d, ...circuloDentro(pontos2d), cantos: ordenados })
      }
  return faces
}

const PHI = (1 + Math.sqrt(5)) / 2

function d10(): Vec[] {
  // trapezoedro pentagonal: duas pontas e dois anéis de 5, defasados de 36°.
  // A altura das pontas sai da condição de as pipas serem PLANAS
  const a = 0.105
  const anel = (k: number, z: number, fase: number): Vec => {
    const t = ((72 * k + fase) * Math.PI) / 180
    return [Math.cos(t), Math.sin(t), z]
  }
  const plano = (h: number) => {
    const T: Vec = [0, 0, h]
    const n = cross(sub(anel(0, a, 0), T), sub(anel(1, a, 0), T))
    return dot(n, sub(anel(0, -a, 36), T))
  }
  let lo = 0.2
  let hi = 5
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2
    if (Math.sign(plano(m)) === Math.sign(plano(lo))) lo = m
    else hi = m
  }
  const h = (lo + hi) / 2
  const pts: Vec[] = [[0, 0, h], [0, 0, -h]]
  for (let k = 0; k < 5; k++) pts.push(anel(k, a, 0), anel(k, -a, 36))
  return pts
}

function moeda(): Vec[] {
  const pts: Vec[] = []
  for (let k = 0; k < 24; k++) {
    const t = (k / 24) * Math.PI * 2
    pts.push([Math.cos(t), Math.sin(t), 0.12], [Math.cos(t), Math.sin(t), -0.12])
  }
  return pts
}

const VERTICES: Record<string, Vec[]> = {
  d2: moeda(),
  d4: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  d6: [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as Vec))),
  d8: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  d10: d10(),
  d12: [
    ...[-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as Vec))),
    ...[-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [
      [0, a / PHI, b * PHI] as Vec, [a / PHI, b * PHI, 0] as Vec, [a * PHI, 0, b / PHI] as Vec,
    ])),
  ],
  d20: [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [
    [0, a, b * PHI] as Vec, [a, b * PHI, 0] as Vec, [a * PHI, 0, b] as Vec,
  ])),
}

export type TipoDeDado = 'd2' | 'd3' | 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'

/** Quantos lados conta cada dado (o d3 é um d6 com 1–3 duas vezes, como
 *  nas mesas de RPG). */
export const LADOS: Record<TipoDeDado, number> = { d2: 2, d3: 3, d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 }

export interface Solido {
  faces: Face[]
  /** O número de cada face (nulo na borda da moeda). No d4, o número que
   *  a face dá quando é a de BAIXO. */
  numeros: (number | null)[]
  /** Os vértices, no mesmo tamanho das faces: quem diz a que altura o
   *  centro fica quando o dado está apoiado na mesa. */
  vertices: Vec[]
  /** Só no d4: o número de cada canto de cada face (o do vértice). O d4
   *  não para com uma face para cima — para numa face e com uma PONTA para
   *  cima —, então o número mora nos cantos, como no dado de verdade, e o
   *  resultado é o da ponta de cima. */
  cantos?: number[][]
  /** A face sorteada fica para BAIXO (o d4), e não para cima. */
  apoiaNaFace?: boolean
}

const cache = new Map<string, Solido>()

export function solido(tipo: TipoDeDado): Solido {
  const achado = cache.get(tipo)
  if (achado) return achado
  const base = tipo === 'd3' ? 'd6' : tipo
  let faces = fecho(VERTICES[base])
  // normaliza o tamanho: o raio maior vira 1
  const raio = Math.max(...VERTICES[base].map(len))
  faces = faces.map((f) => ({
    ...f,
    c: mul(f.c, 1 / raio),
    cantos: f.cantos.map((p) => mul(p, 1 / raio)),
    pontos: f.pontos.map(([x, y]) => [x / raio, y / raio] as [number, number]),
    meio: [f.meio[0] / raio, f.meio[1] / raio] as [number, number],
    raio: f.raio / raio,
  }))
  const vertices = VERTICES[base].map((p) => mul(p, 1 / raio))
  const mesmo = (a: Vec, b: Vec) => len(sub(a, b)) < 1e-6
  let numeros: (number | null)[]
  let cantos: number[][] | undefined
  if (tipo === 'd4') {
    // o vértice k vale k + 1; a face vale o vértice que NÃO está nela
    cantos = faces.map((f) => f.cantos.map((p) => vertices.findIndex((v) => mesmo(v, p)) + 1))
    numeros = cantos.map((cs) => [1, 2, 3, 4].find((n) => !cs.includes(n)) ?? null)
  } else if (tipo === 'd2') {
    // só as duas tampas têm número; a borda é a borda
    let n = 0
    numeros = faces.map((f) => (f.pontos.length > 4 ? ++n : null))
  } else if (tipo === 'd3') {
    numeros = faces.map((_, i) => (i % 3) + 1)
  } else {
    numeros = faces.map((_, i) => i + 1)
  }
  const s: Solido = { faces, numeros, vertices, cantos, apoiaNaFace: tipo === 'd4' }
  cache.set(tipo, s)
  return s
}
