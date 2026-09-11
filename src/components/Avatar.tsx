'use client'

import type {
  Avatar as Receita,
  CorCabelo,
  CorFundo,
  CorRoupa,
  Corpo,
  Pele,
} from '@/data/avatar'
import styles from './Avatar.module.sass'

/**
 * O avatar desenhado. Nada de imagem: as peças são caminhos SVG montados a
 * partir da receita.
 *
 * **O fundo e a borda NÃO são SVG, e isso é de propósito.** Eram: um `rect`
 * pintado dentro de um `clipPath` e outro `rect` com `stroke` por cima. O
 * stroke de um retângulo colado na borda do viewBox é cortado ao meio pela
 * própria caixa, e o que sobrava era uma linha irregular — dá para ver o
 * efeito ampliando o avatar no perfil. Hoje quem faz fundo, canto redondo e
 * borda é o `<span>` em volta, por CSS: a borda fica nítida em qualquer
 * tamanho, o recorte é `overflow: hidden`, e sumiu junto o `clipPath` (que
 * ainda exigia um id único e limpo de pontuação para sobreviver ao
 * `url(#...)`). Menos SVG, menos armadilha.
 *
 * A construção do cabelo custou três tentativas — quem for mexer, leia antes:
 *
 *  1. A SILHUETA é uma forma fechada e inteira, desenhada ATRÁS do rosto. O
 *     miolo dela some debaixo do rosto, então não existe encaixe para errar.
 *     A primeira versão era um capacete com a borda recortada em franja, e o
 *     recorte abria buraco a cada ajuste: lia como tiara.
 *  2. A FRANJA vem por cima do rosto, e a borda de fora dela é um arco da
 *     MESMA elipse da silhueta: as pontas encostam exatamente onde o cabelo
 *     já está e somem nele. Sem isso sobra um corte reto de um lado e um
 *     risco de pele do outro.
 *  3. As MECHAS do comprido sobem ACIMA da linha do cabelo (`cy-12`), não até
 *     ela — senão sobra uma faixa de pele na têmpora. E a ponta de fora fica
 *     em `rx-2`, ainda dentro da massa de trás; mais para fora e volta um
 *     degrau na silhueta.
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

/** A madeira do manequim entra como se fosse mais um tom de pele. */
const MADEIRA: [string, string, string] = ['#d2a86b', '#bb8f52', '#9d743e']

/** (base, sombra) — a sombra aqui só pinta a sobrancelha. */
const CABELOS: Record<CorCabelo, [string, string]> = {
  preto: ['#2b2622', '#1a1713'],
  branco: ['#e8e3d8', '#cbc4b3'],
  castanho: ['#6b4326', '#502f18'],
  loiro: ['#d5a743', '#b3872a'],
  ruivo: ['#b0501f', '#8a3b12'],
}

const ROUPAS: Record<CorRoupa, string> = {
  azul: '#6f7f8c',
  oliva: '#7d8558',
  vinho: '#8c5a58',
  areia: '#c2ab86',
  grafite: '#4f4d48',
}

export const FUNDOS: Record<CorFundo, string> = {
  papel: '#d8cfba',
  kraft: '#c9b596',
  menta: '#b7c9bb',
  ceu: '#b3c3d1',
  poeira: '#cbbfc4',
}

/**
 * O rosto é paramétrico, e a silhueta do cabelo e a franja saem destes mesmos
 * números — é o que permite o homem ser maior e de queixo reto sem nada
 * desencaixar. `cantoY`/`cantoX` são o raio do canto do rosto: quanto maiores,
 * mais redondo; iguais a `larg`, o queixo vira ponta.
 */
export interface Medidas {
  larg: number
  topo: number
  queixo: number
  rx: number
  ry: number
  cy: number
  ombro: number
  meioOmbro: number
  cantoY: number
  cantoX: number
}

export const MEDIDAS: Record<Corpo, Medidas> = {
  homem: { larg: 23.5, topo: 15, queixo: 72, rx: 29, ry: 27, cy: 35, ombro: 77, meioOmbro: 9, cantoY: 12, cantoX: 11 },
  mulher: { larg: 20, topo: 19, queixo: 72, rx: 26, ry: 25.5, cy: 38, ombro: 80, meioOmbro: 19, cantoY: 19, cantoX: 20 },
  manequim: { larg: 20, topo: 20, queixo: 70, rx: 26, ry: 25.5, cy: 38, ombro: 80, meioOmbro: 17, cantoY: 20, cantoX: 20 },
}

/** Só o laboratório usa isto: trocar peça e medida sem editar o arquivo. */
export interface Ajustes {
  medidas?: Partial<Medidas>
  cores?: { cabelo?: string; roupa?: string; fundo?: string }
  pecas?: { silhueta?: string; franja?: string; mecha?: string }
}

export default function Avatar({
  avatar,
  tamanho = 96,
  className,
  ajustes,
}: {
  avatar: Receita
  tamanho?: number
  className?: string
  /** Dev-only: usado pelo `/avatar-lab` para experimentar. */
  ajustes?: Ajustes
}) {
  const manequim = avatar.corpo === 'manequim'
  const [p, ps, pss] = manequim ? MADEIRA : PELES[avatar.pele]
  const [cBase, cs] = CABELOS[avatar.cor]
  const c = ajustes?.cores?.cabelo ?? cBase
  const roupa = ajustes?.cores?.roupa ?? ROUPAS[avatar.roupa]
  const fundo = ajustes?.cores?.fundo ?? FUNDOS[avatar.fundo]
  const homem = avatar.corpo === 'homem'
  const m = { ...MEDIDAS[avatar.corpo], ...ajustes?.medidas }
  const { larg, topo, queixo, rx, ry, cy, ombro, meioOmbro: mo, cantoY, cantoX } = m
  const alt = queixo - topo
  const longo = avatar.cabelo === 'longo' && !manequim

  // ponta da franja: onde ela encosta na silhueta, calculada na mesma elipse
  const yp = cy + 7
  const dx = rx * Math.sqrt(Math.max(0, 1 - (7 / ry) ** 2))

  const olhoX = larg * 0.47
  const olhoY = topo + alt * 0.53
  const sobY = topo + alt * 0.365
  const narizY = topo + alt * 0.62
  const bocaY = topo + alt * 0.81
  const sl = larg * 0.5

  const silhueta =
    ajustes?.pecas?.silhueta ??
    `M50 ${topo - 10} C${50 + rx * 0.95} ${topo - 10} ${50 + rx + 3} ${topo + 14} ${50 + rx + 3} ${cy + 6} C${50 + rx + 5} ${cy + 30} ${50 + rx + 4} 80 ${50 + rx + 3} 100 L${50 - rx - 3} 100 C${50 - rx - 4} 80 ${50 - rx - 5} ${cy + 30} ${50 - rx - 3} ${cy + 6} C${50 - rx - 3} ${topo + 14} ${50 - rx * 0.95} ${topo - 10} 50 ${topo - 10} Z`

  const franja =
    ajustes?.pecas?.franja ??
    `M${50 - dx} ${yp} A${rx} ${ry} 0 1 1 ${50 + dx} ${yp} C${50 + larg - 2} ${topo + 11} 60 ${topo + 6} 52 ${topo + 9} C44 ${topo + 12} 30 ${topo + 15} ${50 - dx} ${yp} Z`

  const mecha = (s: number) =>
    `M${50 + s * (rx - 2)} ${cy - 12} C${50 + s * (rx + 5)} ${cy + 28} ${50 + s * (rx + 4)} 80 ${50 + s * (rx + 3)} 100 L${50 + s * (larg - 2)} 100 C${50 + s * (larg - 1)} 78 ${50 + s * (larg + 1)} ${cy + 20} ${50 + s * (larg - 2)} ${cy - 12} Z`

  return (
    <span
      className={`${styles.moldura} ${className ?? ''}`}
      style={{ background: fundo, width: tamanho, height: tamanho }}
    >
      <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" role="img" aria-label="Avatar">
        {/* 1. silhueta do cabelo, atrás de tudo */}
        {manequim ? null : longo ? (
          <path d={silhueta} fill={c} />
        ) : (
          <ellipse cx="50" cy={cy} rx={rx} ry={ry} fill={c} />
        )}

        {/* 2. pescoço ANTES do ombro: é o ombro que o recorta. Depois dele,
               os cantos da gola deixavam lascas de pele aparecendo. */}
        <path d={`M43.5 ${queixo - 8} h13 v20 h-13 Z`} fill={ps} />

        {/* 3. tronco: só o topo, encostando na borda de baixo */}
        <path
          d={`M${mo} 100 C${mo} ${ombro + 6} ${mo + 17} ${ombro} 50 ${ombro} C${100 - mo - 17} ${ombro} ${100 - mo} ${ombro + 6} ${100 - mo} 100 Z`}
          fill={manequim ? ps : roupa}
        />

        {/* 4. gola: sem terno, é ela e o ombro que separam os dois corpos. O
               manequim não tem roupa — ele ganha a esfera da articulação. */}
        {manequim ? (
          <circle cx="50" cy={ombro + 1} r="7.5" fill={p} />
        ) : homem ? (
          <path d={`M41 ${ombro} L50 ${ombro + 12} L59 ${ombro} Z`} fill={p} />
        ) : (
          <rect x="41" y={queixo + 1} width="18" height={ombro + 6 - queixo} rx="5" fill={roupa} />
        )}

        {/* 5. rosto */}
        <path
          d={`M${50 - larg} ${topo + cantoY} Q${50 - larg} ${topo} ${50 - larg + cantoX} ${topo} L${50 + larg - cantoX} ${topo} Q${50 + larg} ${topo} ${50 + larg} ${topo + cantoY} L${50 + larg} ${queixo - cantoY} Q${50 + larg} ${queixo} ${50 + larg - cantoX} ${queixo} L${50 - larg + cantoX} ${queixo} Q${50 - larg} ${queixo} ${50 - larg} ${queixo - cantoY} Z`}
          fill={p}
        />

        {/* 6. franja — a borda de fora é um arco da própria silhueta */}
        {manequim ? null : <path d={franja} fill={c} />}

        {/* 7. mechas da frente, para o comprimento não sumir atrás do ombro */}
        {longo ? (
          ajustes?.pecas?.mecha ? (
            // no laboratório a mecha é escrita só para o lado direito; o
            // esquerdo é a mesma peça espelhada em torno do meio (x=50)
            <>
              <path d={ajustes.pecas.mecha} fill={c} />
              <g transform="translate(100,0) scale(-1,1)">
                <path d={ajustes.pecas.mecha} fill={c} />
              </g>
            </>
          ) : (
            [-1, 1].map((s) => <path key={s} d={mecha(s)} fill={c} />)
          )
        ) : null}

        {/* 8. rosto: olho, nariz, boca. O manequim não tem nenhum dos três —
               é justamente a cara vazia que diz "ainda não escolhi". */}
        {manequim ? null : (
          <>
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
          </>
        )}

        {/* o manequim ganha a emenda da cabeça, que é o que o identifica */}
        {manequim ? (
          <path
            d={`M${50 - larg} ${topo + alt * 0.55} h${larg * 2}`}
            stroke={pss}
            strokeWidth="1.6"
            opacity=".5"
          />
        ) : null}
      </svg>
    </span>
  )
}
