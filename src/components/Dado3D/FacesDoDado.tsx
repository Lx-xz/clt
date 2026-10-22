'use client'

import { solido, type TipoDeDado, type Vec } from './geometria'
import styles from './Dado3D.module.sass'

/**
 * As faces de um dado, cada uma um `div` com SVG posto no lugar por
 * `matrix3d`. A luz vem de quem chama (`orientacao`: para onde cada face
 * aponta AGORA, já com a câmera), para o dado que rola na mesa ter a luz
 * certa a cada quadro, e não só na pose final.
 */
export default function FacesDoDado({ tipo, tamanho, cor, corNumero, rotulo, orientacao, destaque }: {
  tipo: TipoDeDado
  tamanho: number
  cor: string
  corNumero: string
  rotulo?: (numero: number) => string
  /** Leva a normal de uma face (no dado) para a direção dela na tela. */
  orientacao: (n: Vec) => Vec
  /** A face que acende depois de parar. */
  destaque?: number | null
}) {
  const s = solido(tipo)
  const metade = tamanho / 2
  const luz: Vec = [-0.35, -0.6, 0.72]
  return (
    <>
      {s.faces.map((fc, i) => {
        const nTela = orientacao(fc.n)
        const brilho = Math.max(0, nTela[0] * luz[0] + nTela[1] * luz[1] + nTela[2] * luz[2])
        const escuro = Math.round(34 - brilho * 30)
        const numero = s.numeros[i]
        const texto = numero === null ? null : rotulo ? rotulo(numero) : String(numero)
        const fonte = texto ? Math.min(fc.raio * (texto.length > 1 ? 1 : 1.3), 0.62, 1.5 / texto.length) : 0
        const m = `matrix3d(${fc.u[0]},${fc.u[1]},${fc.u[2]},0,${fc.v[0]},${fc.v[1]},${fc.v[2]},0,${fc.n[0]},${fc.n[1]},${fc.n[2]},0,${fc.c[0] * metade},${fc.c[1] * metade},${fc.c[2] * metade},1)`
        const sublinha = texto === '6' || texto === '9'
        // um tantinho maior que a face de verdade: as faces vizinhas se
        // sobrepõem na aresta, e a fresta de meio pixel entre elas some
        const pontos = fc.pontos.map(([x, y]) => `${x * 1.012},${y * 1.012}`).join(' ')
        return (
          <div
            key={i}
            className={`${styles.face} ${i === destaque ? styles.sorteada : ''}`}
            style={{ width: tamanho, height: tamanho, marginLeft: -metade, marginTop: -metade, transform: m }}
          >
            <svg viewBox="-1 -1 2 2" width={tamanho} height={tamanho} aria-hidden>
              <polygon
                points={pontos}
                fill={`color-mix(in srgb, ${cor}, #000 ${escuro}%)`}
                stroke={`color-mix(in srgb, ${cor}, #fff 18%)`}
                strokeWidth={0.022}
                strokeLinejoin="round"
              />
              {texto ? (
                <g transform={`translate(${fc.meio[0]} ${fc.meio[1]})`}>
                  {/* `dy`, e não `dominant-baseline`: o Safari ignora o
                      segundo, e o número descia meia altura no iPhone */}
                  <text x={0} y={0} dy="0.35em" fill={corNumero} fontSize={fonte} fontWeight={700} textAnchor="middle" fontFamily="var(--mono), monospace">
                    {texto}
                  </text>
                  {sublinha ? (
                    <line x1={-fonte * 0.22} x2={fonte * 0.22} y1={fonte * 0.55} y2={fonte * 0.55} stroke={corNumero} strokeWidth={fonte * 0.07} />
                  ) : null}
                </g>
              ) : null}
            </svg>
          </div>
        )
      })}
    </>
  )
}

/** Qual face mostra o número pedido (no d3, há duas; tanto faz qual). */
export function faceDoValor(tipo: TipoDeDado, valor: number, sorte = 0): number {
  const s = solido(tipo)
  const candidatas = s.numeros.map((n, i) => (n === valor ? i : -1)).filter((i) => i >= 0)
  return candidatas[sorte % Math.max(1, candidatas.length)] ?? 0
}
