'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { solido, type TipoDeDado, type Vec } from './geometria'
import FacesDoDado from './FacesDoDado'
import styles from './Dado3D.module.sass'

/**
 * Um dado de verdade, em CSS 3D (d2 a d20; o d100 é `DadoPercentual`).
 *
 * Nenhuma biblioteca: as faces vêm do fecho convexo (`geometria.ts`), cada
 * uma vira um `div` com um SVG dentro, posta no lugar por um `matrix3d`. O
 * resultado é decidido ANTES (quem sorteia é o jogo, não a física): o dado
 * termina na rotação que leva a face sorteada para a frente, e a cambalhota
 * é um invólucro que gira em volta de um eixo qualquer e desacelera até
 * zero — por isso ele sempre pousa exatamente nela.
 *
 * Nada entre a cena e as faces pode ter `overflow`, `filter`, `opacity` ou
 * `clip-path`: o 3D do CSS se achata em silêncio (veja CLAUDE.md).
 */

const INCLINACAO_X = -24
const INCLINACAO_Y = 20

function rot(eixo: 'x' | 'y', graus: number): number[][] {
  const t = (graus * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  return eixo === 'x' ? [[1, 0, 0], [0, c, -s], [0, s, c]] : [[c, 0, s], [0, 1, 0], [-s, 0, c]]
}
const aplicar = (m: number[][], v: Vec): Vec => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
]

export default function Dado3D({
  tipo,
  valor,
  jogada = 0,
  tamanho = 64,
  cor = '#2b2722',
  corNumero = '#f6f2e8',
  rotulo,
  onParar,
}: {
  tipo: TipoDeDado
  /** A face que tem que ficar para cima (1 a N). */
  valor: number
  /** Muda para rolar de novo (a mesma face pode sair duas vezes seguidas). */
  jogada?: number
  tamanho?: number
  cor?: string
  corNumero?: string
  /** O que se escreve em cada face, a partir do número dela (o d100 usa). */
  rotulo?: (numero: number) => string
  onParar?: () => void
}) {
  const s = solido(tipo)
  const parar = useRef(onParar)
  parar.current = onParar

  // a face sorteada: no d3 há duas com o mesmo número, e tanto faz qual
  const face = useMemo(() => {
    const candidatas = s.numeros.map((n, i) => (n === valor ? i : -1)).filter((i) => i >= 0)
    return candidatas[(jogada * 7) % candidatas.length] ?? 0
  }, [s, valor, jogada])

  // o eixo e o tanto da cambalhota mudam a cada jogada
  const giro = useMemo(() => {
    const a = Math.random() * Math.PI * 2
    const b = Math.acos(Math.random() * 2 - 1)
    return { x: Math.sin(b) * Math.cos(a), y: Math.sin(b) * Math.sin(a), z: Math.cos(b), voltas: 720 + Math.random() * 540 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogada])

  const [parado, setParado] = useState(false)
  useEffect(() => {
    setParado(false)
    const t = setTimeout(() => {
      setParado(true)
      parar.current?.()
    }, 1500)
    return () => clearTimeout(t)
  }, [jogada])

  // a rotação final leva (u, v, n) da face sorteada para (x, y, z) da tela
  // no d4 a face sorteada vai para TRÁS, e a ponta que vale vem para a frente
  const f = s.faces[face]
  const R = s.apoiaNaFace ? [f.u, f.v.map((x) => -x) as Vec, f.n.map((x) => -x) as Vec] : [f.u, f.v, f.n]
  const final = `matrix3d(${R[0][0]},${R[1][0]},${R[2][0]},0,${R[0][1]},${R[1][1]},${R[2][1]},0,${R[0][2]},${R[1][2]},${R[2][2]},0,0,0,0,1)`

  // a luz é calculada para a posição FINAL: na cambalhota ninguém repara
  const inclina = (v: Vec) => aplicar(rot('x', INCLINACAO_X), aplicar(rot('y', INCLINACAO_Y), v))

  return (
    <div className={styles.cena} style={{ width: tamanho * 1.6, height: tamanho * 1.6 }}>
      <div className={styles.pulo} key={`p${jogada}`}>
        <div
          className={styles.inclinado}
          style={{ transform: `rotateX(${INCLINACAO_X}deg) rotateY(${INCLINACAO_Y}deg)` }}
        >
          <div
            key={`g${jogada}`}
            className={styles.giro}
            style={{ '--ex': giro.x, '--ey': giro.y, '--ez': giro.z, '--voltas': `${giro.voltas}deg` } as CSSProperties}
          >
            <div className={styles.dado} style={{ transform: final }}>
              <FacesDoDado
                tipo={tipo}
                tamanho={tamanho}
                cor={cor}
                corNumero={corNumero}
                rotulo={rotulo}
                orientacao={(n) => inclina(aplicar(R, n))}
                destaque={parado && !s.apoiaNaFace ? face : null}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** O d100 da mesa de RPG: dois d10, um das dezenas (00–90) e um das
 *  unidades (0–9). 00 com 0 é 100. */
export function DadoPercentual({ valor, jogada = 0, tamanho = 56, onParar }: {
  valor: number
  jogada?: number
  tamanho?: number
  onParar?: () => void
}) {
  const v = valor % 100
  const dezena = Math.floor(v / 10)
  const unidade = v % 10
  return (
    <div className={styles.par}>
      <Dado3D
        tipo="d10"
        valor={dezena === 0 ? 10 : dezena}
        jogada={jogada}
        tamanho={tamanho}
        cor="#7a2d24"
        rotulo={(n) => `${n % 10}0`}
        onParar={onParar}
      />
      <Dado3D tipo="d10" valor={unidade === 0 ? 10 : unidade} jogada={jogada} tamanho={tamanho} rotulo={(n) => String(n % 10)} />
    </div>
  )
}
