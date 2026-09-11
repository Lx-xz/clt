'use client'

import { useId } from 'react'
import type { Avatar as Receita, CorCabelo, Corpo, Pele } from '@/data/avatar'

/**
 * O avatar desenhado. Nada de imagem: as peças são caminhos SVG montados a
 * partir das quatro escolhas da receita.
 *
 * A construção do cabelo é o que faz isso funcionar, e ela custou três
 * tentativas — quem for mexer, leia antes:
 *
 *  1. A SILHUETA do cabelo é uma forma fechada e inteira, desenhada ATRÁS do
 *     rosto. O miolo dela some debaixo do rosto, então não existe encaixe
 *     para errar. Foi a primeira versão, "capacete com a borda recortada em
 *     franja", que abria buraco a cada ajuste.
 *  2. A FRANJA vem por cima do rosto, e a borda de fora dela é um arco da
 *     MESMA elipse da silhueta: as pontas encostam exatamente onde o cabelo
 *     já está e somem nele. Sem isso sobra um corte reto de um lado e um
 *     risco de pele do outro.
 *  3. As MECHAS do cabelo comprido sobem acima da linha do cabelo (`cy-12`),
 *     não até ela — senão sobra uma faixa de pele na têmpora. E a ponta de
 *     fora fica em `rx-2`, ainda dentro da massa de trás; mais para fora e
 *     aparece um degrau na silhueta.
 *
 * O cabelo é de uma cor só de propósito: com dois tons, toda emenda entre
 * silhueta, franja e mecha virava um retângulo visível.
 */

/** (base, sombra, sombra forte) — a sombra pinta pescoço, nariz e boca. */
const PELES: Record<Pele, [string, string, string]> = {
  clara: ['#f3d5b8', '#e2bb96', '#c99873'],
  media: ['#c98d5d', '#b0764a', '#8e5c36'],
  escura: ['#7d4c2e', '#653a21', '#4d2b16'],
}

/** (base, sombra) — a sombra aqui só pinta a sobrancelha. */
const CABELOS: Record<CorCabelo, [string, string]> = {
  preto: ['#2b2622', '#1a1713'],
  branco: ['#e8e3d8', '#cbc4b3'],
  castanho: ['#6b4326', '#502f18'],
  loiro: ['#d5a743', '#b3872a'],
  ruivo: ['#b0501f', '#8a3b12'],
}

const FUNDO = '#d8cfba'
const ROUPA: Record<Corpo, string> = { homem: '#6f7f8c', mulher: '#7d8558' }

/**
 * O rosto é paramétrico, e a silhueta do cabelo e a franja saem destes
 * mesmos números — é o que permite o homem ser maior e de queixo reto sem
 * nada desencaixar.
 */
const MEDIDAS: Record<Corpo, Record<string, number>> = {
  homem: { larg: 23.5, topo: 15, queixo: 72, rx: 29, ry: 27, cy: 35, ombro: 77, meioOmbro: 9 },
  mulher: { larg: 20, topo: 19, queixo: 72, rx: 26, ry: 25.5, cy: 38, ombro: 80, meioOmbro: 19 },
}

export default function Avatar({
  avatar,
  tamanho = 96,
  className,
}: {
  avatar: Receita
  tamanho?: number
  className?: string
}) {
  // O clipPath precisa de id único: dois avatares na mesma página com o
  // mesmo id fazem o segundo usar o recorte do primeiro. E o `useId` devolve
  // id com pontuação (`:r0:` no React 18, `«r0»` no 19) — dentro de
  // `url(#...)`, que é lido como CSS, isso não sobrevive. Só letra e número.
  const id = `av${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [p, ps, pss] = PELES[avatar.pele]
  const [c, cs] = CABELOS[avatar.cor]
  const homem = avatar.corpo === 'homem'
  const { larg, topo, queixo, rx, ry, cy, ombro, meioOmbro: mo } = MEDIDAS[avatar.corpo]
  const alt = queixo - topo
  const longo = avatar.cabelo === 'longo'

  // ponta da franja: onde ela encosta na silhueta, calculado na elipse
  const yp = cy + 7
  const dx = rx * Math.sqrt(1 - (7 / ry) ** 2)

  const olhoX = larg * 0.47
  const olhoY = topo + alt * 0.53
  const sobY = topo + alt * 0.365
  const narizY = topo + alt * 0.62
  const bocaY = topo + alt * 0.81
  const sl = larg * 0.5

  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Avatar"
    >
      <clipPath id={id}>
        <rect width="100" height="100" rx="16" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="100" height="100" fill={FUNDO} />

        {/* 1. silhueta do cabelo, atrás de tudo */}
        {longo ? (
          <path
            d={`M50 ${topo - 10} C${50 + rx * 0.95} ${topo - 10} ${50 + rx + 3} ${topo + 14} ${50 + rx + 3} ${cy + 6} C${50 + rx + 5} ${cy + 30} ${50 + rx + 4} 80 ${50 + rx + 3} 100 L${50 - rx - 3} 100 C${50 - rx - 4} 80 ${50 - rx - 5} ${cy + 30} ${50 - rx - 3} ${cy + 6} C${50 - rx - 3} ${topo + 14} ${50 - rx * 0.95} ${topo - 10} 50 ${topo - 10} Z`}
            fill={c}
          />
        ) : (
          <ellipse cx="50" cy={cy} rx={rx} ry={ry} fill={c} />
        )}

        {/* 2. pescoço ANTES do ombro: é o ombro que o recorta. Depois dele,
               os cantos da gola deixavam lascas de pele aparecendo. */}
        <path d={`M43.5 ${queixo - 8} h13 v20 h-13 Z`} fill={ps} />

        {/* 3. tronco: só o topo, encostando na borda de baixo */}
        <path
          d={`M${mo} 100 C${mo} ${ombro + 6} ${mo + 17} ${ombro} 50 ${ombro} C${100 - mo - 17} ${ombro} ${100 - mo} ${ombro + 6} ${100 - mo} 100 Z`}
          fill={ROUPA[avatar.corpo]}
        />

        {/* 4. gola: sem terno, é ela e o ombro que separam os dois corpos */}
        {homem ? (
          <path d={`M41 ${ombro} L50 ${ombro + 12} L59 ${ombro} Z`} fill={p} />
        ) : (
          <rect x="41" y={queixo + 1} width="18" height={ombro + 6 - queixo} rx="5" fill={ROUPA[avatar.corpo]} />
        )}

        {/* 5. rosto: queixo reto no homem, redondo na mulher */}
        {homem ? (
          <path
            d={`M${50 - larg} ${topo + 12} Q${50 - larg} ${topo} ${50 - larg + 11} ${topo} L${50 + larg - 11} ${topo} Q${50 + larg} ${topo} ${50 + larg} ${topo + 12} L${50 + larg} ${queixo - 12} Q${50 + larg} ${queixo} ${50 + larg - 11} ${queixo} L${50 - larg + 11} ${queixo} Q${50 - larg} ${queixo} ${50 - larg} ${queixo - 12} Z`}
            fill={p}
          />
        ) : (
          <path
            d={`M${50 - larg} ${topo + 13} Q${50 - larg} ${topo} 50 ${topo} Q${50 + larg} ${topo} ${50 + larg} ${topo + 13} L${50 + larg} ${queixo - 19} Q${50 + larg} ${queixo} 50 ${queixo} Q${50 - larg} ${queixo} ${50 - larg} ${queixo - 19} Z`}
            fill={p}
          />
        )}

        {/* 6. franja — a borda de fora é um arco da própria silhueta */}
        <path
          d={`M${50 - dx} ${yp} A${rx} ${ry} 0 1 1 ${50 + dx} ${yp} C${50 + larg - 2} ${topo + 11} 60 ${topo + 6} 52 ${topo + 9} C44 ${topo + 12} 30 ${topo + 15} ${50 - dx} ${yp} Z`}
          fill={c}
        />

        {/* 7. mechas da frente, para o comprimento não sumir atrás do ombro */}
        {longo
          ? [-1, 1].map((s) => (
              <path
                key={s}
                d={`M${50 + s * (rx - 2)} ${cy - 12} C${50 + s * (rx + 5)} ${cy + 28} ${50 + s * (rx + 4)} 80 ${50 + s * (rx + 3)} 100 L${50 + s * (larg - 2)} 100 C${50 + s * (larg - 1)} 78 ${50 + s * (larg + 1)} ${cy + 20} ${50 + s * (larg - 2)} ${cy - 12} Z`}
                fill={c}
              />
            ))
          : null}

        {/* 8. rosto: olho, nariz, boca. Nada além disso. */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <rect x={50 + s * olhoX - sl / 2} y={sobY} width={sl} height={2.4} rx={1.2} fill={cs} />
            <ellipse cx={50 + s * olhoX} cy={olhoY} rx={3} ry={3.6} fill="#241f1b" />
          </g>
        ))}
        <path d={`M50 ${narizY} q3.2 5 0 5.6 q-3.2 -0.6 0 -5.6 Z`} fill={pss} />
        <path
          d={`M44.5 ${bocaY} Q50 ${bocaY + 4.5} 55.5 ${bocaY}`}
          fill="none"
          stroke={pss}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <rect width="100" height="100" rx="16" fill="none" stroke="var(--linha)" />
    </svg>
  )
}
