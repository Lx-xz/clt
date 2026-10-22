/**
 * Rotações para o dado que rola na mesa: um quatérnio por dado, girado a
 * cada quadro pelo quanto ele andou, e no fim levado (slerp) até a
 * orientação em que a face sorteada fica para cima. Só o que o dado usa.
 */

import type { Vec } from './geometria'

export type Quat = [number, number, number, number] // w, x, y, z

export const identidade: Quat = [1, 0, 0, 0]

export function eixoAngulo(eixo: Vec, angulo: number): Quat {
  const l = Math.hypot(...eixo) || 1
  const s = Math.sin(angulo / 2) / l
  return [Math.cos(angulo / 2), eixo[0] * s, eixo[1] * s, eixo[2] * s]
}

export function vezes(a: Quat, b: Quat): Quat {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ]
}

export function normalizar(q: Quat): Quat {
  const l = Math.hypot(...q) || 1
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]
}

export function slerp(a: Quat, b0: Quat, t: number): Quat {
  let b = b0
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
  // o caminho curto: q e −q são a mesma rotação
  if (d < 0) {
    b = [-b[0], -b[1], -b[2], -b[3]]
    d = -d
  }
  if (d > 0.9995) return normalizar([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t])
  const th = Math.acos(d)
  const s = Math.sin(th)
  const ka = Math.sin((1 - t) * th) / s
  const kb = Math.sin(t * th) / s
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb, a[3] * ka + b[3] * kb]
}

/** A matriz 3×3 (linhas) da rotação. */
export function matriz(q: Quat): number[][] {
  const [w, x, y, z] = q
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ]
}

/** O quatérnio de uma matriz de rotação (linhas). */
export function deMatriz(m: number[][]): Quat {
  const tr = m[0][0] + m[1][1] + m[2][2]
  let q: Quat
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2
    q = [s / 4, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s]
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2
    q = [(m[2][1] - m[1][2]) / s, s / 4, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s]
  } else if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2
    q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, s / 4, (m[1][2] + m[2][1]) / s]
  } else {
    const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2
    q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, s / 4]
  }
  return normalizar(q)
}

/** `matrix3d` do CSS (por colunas) de uma matriz 3×3 em linhas, mais a posição. */
export function css(m: number[][], t: Vec = [0, 0, 0]): string {
  return `matrix3d(${m[0][0]},${m[1][0]},${m[2][0]},0,${m[0][1]},${m[1][1]},${m[2][1]},0,${m[0][2]},${m[1][2]},${m[2][2]},0,${t[0]},${t[1]},${t[2]},1)`
}
