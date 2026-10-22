'use client'

import { useEffect, useRef, useState } from 'react'
import FacesDoDado, { faceDoValor } from './FacesDoDado'
import { solido, type TipoDeDado, type Vec } from './geometria'
import { css, deMatriz, eixoAngulo, matriz, normalizar, slerp, vezes, type Quat } from './quaternion'
import styles from './Dado3D.module.sass'

/**
 * Os dados rolando NA MESA: jogados de um lado, quicam, batem nas bordas,
 * rolam e param — com a face sorteada para cima e o número de pé para quem
 * olha. O resultado é do jogo, decidido antes; a física só leva o dado até
 * lá. Ela não precisa acertar a face sozinha: quando o dado quase parou,
 * a orientação dele é levada (slerp) até a da face sorteada, girada em
 * volta do "para cima" pelo ângulo mais perto de onde ele já estava. Por
 * isso cada dado assenta do seu jeito, e todos param certos.
 *
 * Dois jeitos de jogar: `auto` (a mesa joga sozinha) e `mao` (a pessoa
 * pega o dado com o mouse ou o dedo, arrasta e solta — a velocidade do
 * gesto é a da jogada).
 *
 * A mesa é um plano inclinado (`INCLINACAO`), visto em perspectiva; a
 * cena corta o que passa da borda (overflow na RAIZ da cena não achata o
 * 3D dos filhos — só no meio do caminho é que achata).
 */

export interface DadoNaMesa {
  tipo: TipoDeDado
  valor: number
  cor?: string
  corNumero?: string
  rotulo?: (numero: number) => string
}

const INCLINACAO = 38
const GRAVIDADE = 2200
const QUICA = 0.42
const BATE = 0.72

interface Corpo {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  q: Quat
  giroAr: Vec
  // o pouso: de `q0` até `alvo`, em `t` de 0 a 1
  pouso: { q0: Quat; alvo: Quat; t: number } | null
  parado: boolean
}

const aplicar = (m: number[][], v: Vec): Vec => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
]

function aleatorioQ(): Quat {
  return normalizar([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1])
}

/**
 * Quanto cada dado pousa "deitado" para trás, além de virar a face para
 * quem olha. A moeda cai reta; o d10, que é comprido, fica meio de lado,
 * como fica na mesa de verdade. Zero é a face olhando direto para a câmera.
 */
const REPOUSO: Record<TipoDeDado, number> = { d2: 0, d3: 0.05, d4: 0.2, d6: 0.05, d8: 0.16, d10: 0.32, d12: 0.12, d20: 0.12 }

const mult = (a: number[][], b: number[][]) => a.map((linha) => [0, 1, 2].map((j) => linha[0] * b[0][j] + linha[1] * b[1][j] + linha[2] * b[2][j]))
const rotX = (t: number) => [[1, 0, 0], [0, Math.cos(t), -Math.sin(t)], [0, Math.sin(t), Math.cos(t)]]

/** A orientação que deixa a face `i` virada para quem olha (a mesa é
 *  inclinada, então "para cima" na mesa ainda não é "para a gente": a
 *  face é desvirada da inclinação), com o número de pé, girada `giro` em
 *  volta da normal dela. */
function alvoDaFace(tipo: TipoDeDado, i: number, giro: number): Quat {
  const f = solido(tipo).faces[i]
  const base = [f.u, f.v, f.n] as number[][]
  const c = Math.cos(giro)
  const s = Math.sin(giro)
  const rz = [[c, -s, 0], [s, c, 0], [0, 0, 1]]
  const desvira = rotX(-(INCLINACAO * Math.PI) / 180 + REPOUSO[tipo])
  return deMatriz(mult(desvira, mult(rz, base)))
}

/** De todos os giros pequenos possíveis, o que está mais perto de onde o
 *  dado já está: o pouso fica curto, e o dado não dá meia-volta no fim. */
function melhorAlvo(tipo: TipoDeDado, face: number, atual: Quat): Quat {
  let melhor = alvoDaFace(tipo, face, 0)
  let maior = -1
  for (let k = -6; k <= 6; k++) {
    const giro = (k / 6) * 0.3 // até uns 17° para cada lado: de pé, mas não engessado
    const q = alvoDaFace(tipo, face, giro)
    const d = Math.abs(q[0] * atual[0] + q[1] * atual[1] + q[2] * atual[2] + q[3] * atual[3])
    if (d > maior) {
      maior = d
      melhor = q
    }
  }
  return melhor
}

export default function RolagemNaMesa({ dados, modo = 'auto', jogada = 0, tamanho = 64, onParar, onJogar }: {
  dados: DadoNaMesa[]
  modo?: 'auto' | 'mao'
  /** Muda para jogar de novo. */
  jogada?: number
  tamanho?: number
  onParar?: () => void
  /** No modo `mao`, avisa quando a pessoa soltou o dado. */
  onJogar?: () => void
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const corpos = useRef<Corpo[]>([])
  // o chão é mais comprido que a caixa: inclinado, ele encolhe para caber
  const [tela, setTela] = useState({ w: 300, h: 200 })
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const medir = () => setTela({ w: el.clientWidth, h: el.clientHeight })
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [, setQuadro] = useState(0)
  const [esperando, setEsperando] = useState(modo === 'mao')
  const arraste = useRef<{ pontos: { x: number; y: number; t: number }[] } | null>(null)
  const parar = useRef(onParar)
  parar.current = onParar
  const jogar = useRef(onJogar)
  jogar.current = onJogar

  const raio = tamanho * 0.48
  const faces = dados.map((d, i) => faceDoValor(d.tipo, d.valor, jogada + i))

  // o tamanho da mesa, em px, no plano dela
  const medida = () => {
    const r = caixa.current?.getBoundingClientRect()
    return { w: r?.width ?? 300, h: (r?.height ?? 200) / Math.cos((INCLINACAO * Math.PI) / 180) }
  }

  function lancar(vx: number, vy: number, de?: { x: number; y: number }) {
    const { h } = medida()
    corpos.current = dados.map((_, i) => ({
      x: de ? de.x + i * raio * 1.2 : raio + 6 + i * raio * 1.3,
      y: de ? de.y : h * (0.45 + 0.2 * Math.random()) - i * raio,
      z: tamanho * 0.9,
      vx: vx * (0.9 + Math.random() * 0.25),
      vy: vy * (0.9 + Math.random() * 0.4) + (Math.random() - 0.5) * 120,
      vz: 160,
      q: aleatorioQ(),
      giroAr: [Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 8 - 4],
      pouso: null,
      parado: false,
    }))
    setEsperando(false)
  }

  // a jogada: automática, ou esperando a mão
  useEffect(() => {
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const { w, h } = medida()
    if (reduzido) {
      corpos.current = dados.map((d, i) => ({
        x: w / 2 + (i - (dados.length - 1) / 2) * raio * 2.4, y: h / 2, z: 0, vx: 0, vy: 0, vz: 0,
        q: alvoDaFace(d.tipo, faces[i], 0), giroAr: [0, 0, 0], pouso: null, parado: true,
      }))
      setQuadro((n) => n + 1)
      parar.current?.()
      return
    }
    if (modo === 'mao') {
      // parados num canto, esperando alguém pegar
      corpos.current = dados.map((_, i) => ({
        x: w * 0.18 + i * raio * 2.3, y: h * 0.62, z: 0, vx: 0, vy: 0, vz: 0,
        q: aleatorioQ(), giroAr: [0, 0, 0], pouso: null, parado: true,
      }))
      setEsperando(true)
      setQuadro((n) => n + 1)
      return
    }
    lancar(480 + Math.random() * 260, (Math.random() - 0.6) * 160)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogada, modo])

  // o laço da física
  useEffect(() => {
    let quadro = 0
    let antes = 0
    let tempo = 0
    let avisou = false
    const passo = (agora: number) => {
      const dt = antes ? Math.min(0.033, (agora - antes) / 1000) : 0
      antes = agora
      const { w, h } = medida()
      const cs = corpos.current
      if (!arraste.current && cs.length && !cs.every((c) => c.parado)) {
        tempo += dt
        for (let i = 0; i < cs.length; i++) {
          const c = cs[i]
          if (c.parado) continue
          // altura: cai e quica, cada vez menos
          c.vz -= GRAVIDADE * dt
          c.z += c.vz * dt
          if (c.z <= 0) {
            c.z = 0
            c.vz = Math.abs(c.vz) > 140 ? -c.vz * QUICA : 0
          }
          c.x += c.vx * dt
          c.y += c.vy * dt
          // as bordas da mesa devolvem o dado
          if (c.x < raio) { c.x = raio; c.vx = Math.abs(c.vx) * BATE }
          if (c.x > w - raio) { c.x = w - raio; c.vx = -Math.abs(c.vx) * BATE }
          if (c.y < raio) { c.y = raio; c.vy = Math.abs(c.vy) * BATE }
          if (c.y > h - raio) { c.y = h - raio; c.vy = -Math.abs(c.vy) * BATE }
          // no chão ele arrasta: perde velocidade
          if (c.z === 0) {
            const k = Math.exp(-2.6 * dt)
            c.vx *= k
            c.vy *= k
          }
          const v = Math.hypot(c.vx, c.vy)
          if (!c.pouso) {
            // rolando: gira em volta de (cima × direção); no ar, gira solto
            if (c.z > 0) {
              const ang = Math.hypot(...c.giroAr) * dt
              if (ang > 0) c.q = normalizar(vezes(eixoAngulo(c.giroAr, ang), c.q))
            }
            if (v > 1) c.q = normalizar(vezes(eixoAngulo([-c.vy, c.vx, 0], (v / raio) * dt * 0.75), c.q))
            if ((v < 110 && c.z === 0 && tempo > 0.5) || tempo > 3.2) {
              c.pouso = { q0: c.q, alvo: melhorAlvo(dados[i].tipo, faces[i], c.q), t: 0 }
            }
          } else {
            c.pouso.t = Math.min(1, c.pouso.t + dt / 0.5)
            const e = 1 - (1 - c.pouso.t) ** 3
            c.q = slerp(c.pouso.q0, c.pouso.alvo, e)
            if (c.pouso.t >= 1 && v < 8) {
              c.vx = 0
              c.vy = 0
              c.parado = true
            }
          }
        }
        // um dado não atravessa o outro: separa e troca o empurrão
        for (let i = 0; i < cs.length; i++)
          for (let j = i + 1; j < cs.length; j++) {
            const a = cs[i]
            const b = cs[j]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const d = Math.hypot(dx, dy) || 1
            if (d < raio * 2) {
              const nx = dx / d
              const ny = dy / d
              const s = (raio * 2 - d) / 2
              a.x -= nx * s
              a.y -= ny * s
              b.x += nx * s
              b.y += ny * s
              const va = a.vx * nx + a.vy * ny
              const vb = b.vx * nx + b.vy * ny
              const troca = (vb - va) * 0.85
              a.vx += troca * nx
              a.vy += troca * ny
              b.vx -= troca * nx
              b.vy -= troca * ny
            }
          }
        if (!avisou && cs.every((c) => c.parado)) {
          avisou = true
          parar.current?.()
        }
      }
      setQuadro((n) => (n + 1) % 1e6)
      quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogada, modo])

  // ---------------------------------------------------- jogar com a mão
  const ponto = (e: React.PointerEvent) => {
    const r = caixa.current!.getBoundingClientRect()
    const { h } = medida()
    // a mesa está inclinada em volta do meio: o y da tela vira y da mesa
    const sy = e.clientY - r.top - r.height / 2
    return { x: e.clientX - r.left, y: h / 2 + sy / Math.cos((INCLINACAO * Math.PI) / 180), t: performance.now() }
  }

  function pegar(e: React.PointerEvent) {
    if (modo !== 'mao' || !esperando) return
    caixa.current?.setPointerCapture(e.pointerId)
    arraste.current = { pontos: [ponto(e)] }
  }

  function mover(e: React.PointerEvent) {
    if (!arraste.current) return
    const p = ponto(e)
    arraste.current.pontos.push(p)
    arraste.current.pontos = arraste.current.pontos.filter((x) => p.t - x.t < 90)
    // na mão: os dados vão junto, um pouco erguidos e balançando
    corpos.current.forEach((c, i) => {
      c.x = p.x + i * raio * 1.2
      c.y = p.y
      c.z = tamanho * 0.7
      c.q = normalizar(vezes(eixoAngulo([0.3, 1, 0.2], 0.08), c.q))
    })
  }

  function soltar(e: React.PointerEvent) {
    const a = arraste.current
    if (!a) return
    arraste.current = null
    const p = ponto(e)
    const primeiro = a.pontos[0]
    const dt = Math.max(0.016, (p.t - primeiro.t) / 1000)
    let vx = (p.x - primeiro.x) / dt
    let vy = (p.y - primeiro.y) / dt
    const v = Math.hypot(vx, vy)
    // gesto fraco demais vira um empurrãozinho decente; forte demais, o teto
    if (v < 350) {
      const ang = v > 1 ? Math.atan2(vy, vx) : -0.4
      vx = Math.cos(ang) * 500
      vy = Math.sin(ang) * 500
    } else if (v > 2600) {
      vx *= 2600 / v
      vy *= 2600 / v
    }
    lancar(vx, vy, { x: p.x, y: p.y })
    jogar.current?.()
  }

  // ------------------------------------------------------------- desenho
  const tilt = (INCLINACAO * Math.PI) / 180
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  const naTela = (v: Vec): Vec => [v[0], v[1] * ct - v[2] * st, v[1] * st + v[2] * ct]

  return (
    <div
      ref={caixa}
      className={`${styles.mesaFisica} ${modo === 'mao' && esperando ? styles.pegavel : ''}`}
      onPointerDown={pegar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <div
        className={styles.chao}
        style={{ height: tela.h / ct, top: (tela.h - tela.h / ct) / 2, transform: `rotateX(${INCLINACAO}deg)` }}
      >
        {corpos.current.map((c, i) => {
          const m = matriz(c.q)
          const d = dados[i]
          // a sombra: no chão, embaixo do dado, menor quanto mais alto ele está
          const sombra = Math.max(0.3, 1 - c.z / (tamanho * 2))
          return (
            <div key={i}>
              <div
                className={styles.sombra}
                style={{ width: tamanho, height: tamanho, transform: `translate3d(${c.x - tamanho / 2}px, ${c.y - tamanho / 2}px, 0) scale(${sombra})`, opacity: 0.35 * sombra }}
              />
              <div className={styles.corpo} style={{ transform: css(m, [c.x, c.y, raio + c.z]) }}>
                <FacesDoDado
                  tipo={d.tipo}
                  tamanho={tamanho}
                  cor={d.cor ?? '#2b2722'}
                  corNumero={d.corNumero ?? '#f6f2e8'}
                  rotulo={d.rotulo}
                  orientacao={(n) => naTela(aplicar(m, n))}
                  destaque={c.parado && c.pouso ? faces[i] : null}
                />
              </div>
            </div>
          )
        })}
      </div>
      {modo === 'mao' && esperando ? <p className={styles.dica}>Pegue o dado e jogue</p> : null}
    </div>
  )
}

/**
 * Os dados que a mesa joga para mostrar UM valor de um dado de `lados`
 * lados: o d100 são dois d10 (dezena, vermelho, e unidade), a moeda é
 * dourada. Lados que não são de dado de verdade não têm desenho (nulo).
 */
export function dadosDoValor(lados: number, valor: number, moeda?: 'cara-coroa'): DadoNaMesa[] | null {
  if (lados === 100) {
    const v = valor % 100
    const dez = Math.floor(v / 10)
    const uni = v % 10
    return [
      { tipo: 'd10', valor: dez === 0 ? 10 : dez, cor: '#7a2d24', rotulo: (n) => `${n % 10}0` },
      { tipo: 'd10', valor: uni === 0 ? 10 : uni, rotulo: (n) => String(n % 10) },
    ]
  }
  if (lados === 2) {
    return [{
      tipo: 'd2', valor, cor: '#d9b24a', corNumero: '#5a3f0c',
      rotulo: moeda ? (n) => (n === 1 ? 'cara' : 'coroa') : undefined,
    }]
  }
  const tipo = `d${lados}` as TipoDeDado
  if (!['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'].includes(tipo)) return null
  return [{ tipo, valor }]
}
