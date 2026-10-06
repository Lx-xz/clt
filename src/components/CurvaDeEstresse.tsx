'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import styles from './CurvaDeEstresse.module.sass'

export interface PontoDaCurva {
  dia: number
  valor: number
  /** O que a dica diz além do número — "38 runs", por exemplo. */
  nota?: string
}

/**
 * O estresse ao longo dos dias, como LINHA.
 *
 * Isto é uma série no tempo, e série no tempo se lê da esquerda para a
 * direita: a Análise mostrava a mesma coisa como vinte barras deitadas, uma
 * embaixo da outra, e a "curva" do título não aparecia em lugar nenhum. Aqui
 * o teto do burnout é uma linha fina no alto, e é a distância até ela que
 * conta a história.
 *
 * Uma série só, então sem legenda (o título diz o que é). A cor é a do
 * medidor de estresse, a mesma do HUD; texto nunca usa essa cor. O desenho é
 * medido em pixels de verdade (ResizeObserver) em vez de esticado por
 * `viewBox`: esticar deformaria o ponto do fim e engrossaria a linha.
 */
export default function CurvaDeEstresse({
  pontos,
  maximo,
  titulo,
  altura = 132,
  diasPorSemana = 5,
  formatar = (v) => String(v),
}: {
  pontos: PontoDaCurva[]
  maximo: number
  titulo: string
  altura?: number
  diasPorSemana?: number
  formatar?: (valor: number) => string
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(0)
  const [foco, setFoco] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = caixa.current
    if (!el) return
    const medir = () => setLargura(el.clientWidth)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (pontos.length === 0) return null

  // margens: à esquerda para os números do eixo, à direita para o rótulo do
  // último ponto, que é o único valor escrito direto na linha
  const m = { esq: 26, dir: 34, cima: 12, baixo: 20 }
  const w = Math.max(0, largura - m.esq - m.dir)
  const h = altura - m.cima - m.baixo
  const ultimoDia = Math.max(...pontos.map((p) => p.dia), 2)
  const x = (dia: number) => m.esq + ((dia - 1) / Math.max(1, ultimoDia - 1)) * w
  const y = (v: number) => m.cima + h - (Math.min(v, maximo) / maximo) * h

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.dia).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ')
  const area = `${linha} L${x(pontos[pontos.length - 1].dia).toFixed(1)} ${y(0)} L${x(pontos[0].dia).toFixed(1)} ${y(0)} Z`
  const fim = pontos[pontos.length - 1]
  const marcas = [0, Math.round(maximo / 2), maximo]
  // os rótulos do eixo x caem no fim de cada semana: é a régua que o jogador
  // já usa ("morri na quarta da semana 2")
  const semanas: number[] = []
  for (let d = diasPorSemana; d <= ultimoDia; d += diasPorSemana) semanas.push(d)
  const focado = foco === null ? null : pontos[foco]

  function aoMover(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const dia = 1 + ((e.clientX - r.left) / Math.max(1, r.width)) * (ultimoDia - 1)
    let melhor = 0
    pontos.forEach((p, i) => {
      if (Math.abs(p.dia - dia) < Math.abs(pontos[melhor].dia - dia)) melhor = i
    })
    setFoco(melhor)
  }

  return (
    <figure className={styles.curva}>
      <figcaption className={styles.titulo}>{titulo}</figcaption>
      <div ref={caixa} className={styles.caixa} style={{ height: altura }}>
        {largura > 0 ? (
          <svg width={largura} height={altura} aria-hidden>
            {marcas.map((v) => (
              <g key={v}>
                <line x1={m.esq} x2={m.esq + w} y1={y(v)} y2={y(v)} className={styles.grade} />
                <text x={m.esq - 6} y={y(v) + 3.5} className={styles.eixo} textAnchor="end">
                  {v}
                </text>
              </g>
            ))}
            {/* à ESQUERDA: a run que morre de burnout termina exatamente no
                teto, e o rótulo à direita trombava com o valor do fim */}
            <text x={m.esq + 4} y={y(maximo) - 4} className={styles.eixo} textAnchor="start">
              burnout
            </text>
            {semanas.length > 0
              ? semanas.map((d) => (
                  <text key={d} x={x(d)} y={altura - 5} className={styles.eixo} textAnchor="middle">
                    S{d / diasPorSemana}
                  </text>
                ))
              : // uma run que acabou antes da primeira sexta não tem semana
                // para marcar: a régua vira o primeiro e o último dia
                [pontos[0].dia, ultimoDia].map((d, i) => (
                  <text
                    key={d}
                    x={x(d)}
                    y={altura - 5}
                    className={styles.eixo}
                    textAnchor={i === 0 ? 'start' : 'end'}
                  >
                    dia {d}
                  </text>
                ))}

            <path d={area} className={styles.area} />
            <path d={linha} className={styles.linha} />

            {focado ? (
              <line x1={x(focado.dia)} x2={x(focado.dia)} y1={m.cima} y2={m.cima + h} className={styles.mira} />
            ) : null}
            <circle
              cx={x((focado ?? fim).dia)}
              cy={y((focado ?? fim).valor)}
              r={4}
              className={styles.ponto}
            />
            {focado ? null : (
              <text x={x(fim.dia) + 8} y={y(fim.valor) + 4} className={styles.valorFim}>
                {formatar(fim.valor)}
              </text>
            )}

            {/* o alvo do ponteiro é a área inteira, não a linha: acertar uma
                linha de 2px com o dedo é loteria */}
            <rect
              x={m.esq}
              y={0}
              width={w}
              height={altura}
              fill="transparent"
              onPointerMove={aoMover}
              onPointerDown={aoMover}
              onPointerLeave={() => setFoco(null)}
            />
          </svg>
        ) : null}
        {focado && largura > 0 ? (
          <span
            className={styles.dica}
            style={{ left: Math.min(Math.max(x(focado.dia), 70), largura - 70) }}
            role="status"
          >
            <b>Dia {focado.dia}</b> · {formatar(focado.valor)}
            {focado.nota ? <span className={styles.nota}> · {focado.nota}</span> : null}
          </span>
        ) : null}
      </div>
      {/* a mesma série como tabela, para quem não enxerga o desenho */}
      <table className={styles.soLeitor}>
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Estresse</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((p) => (
            <tr key={p.dia}>
              <td>{p.dia}</td>
              <td>{formatar(p.valor)}{p.nota ? ` (${p.nota})` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
