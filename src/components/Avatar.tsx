'use client'

import { useId, type ReactNode } from 'react'
import type {
  Avatar as Receita,
  CorCabelo,
  CorFundo,
  CorRoupa,
  Corpo,
  Corte,
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
 * borda é o `<span>` em volta, por CSS.
 *
 * **A CAIXA DO ROSTO é o esqueleto de tudo.** Os cortes antigos (`curto`,
 * `longo`) saem de uma elipse própria (`rx`/`ry`/`cy`), solta da cabeça, e é
 * por isso que eles cobrem a orelha, não cabem embaixo do boné e leem todos
 * como o mesmo cabelo comprido. Os cortes novos são desenhados a partir de
 * `larg`/`topo`/`queixo` — a MESMA caixa do rosto —, e é só isso que faz um
 * boné encaixar e uma orelha aparecer. Corte novo deve nascer assim.
 *
 * A construção do cabelo comprido custou três tentativas — quem for mexer
 * nos dois cortes antigos, leia antes:
 *
 *  1. A SILHUETA é uma forma fechada e inteira, desenhada ATRÁS do rosto. O
 *     miolo dela some debaixo do rosto, então não existe encaixe para errar.
 *  2. A FRANJA vem por cima do rosto, e a borda de fora dela é um arco da
 *     MESMA elipse da silhueta: as pontas encostam exatamente onde o cabelo
 *     já está e somem nele.
 *  3. As MECHAS do comprido sobem ACIMA da linha do cabelo (`cy-12`), não até
 *     ela — senão sobra uma faixa de pele na têmpora.
 *
 * Cada corte é de UMA cor só, pela mesma razão: com dois tons, toda emenda
 * entre silhueta, franja e mecha vira um retângulo visível. A exceção é o
 * degradê, e ele resolve isso sem emenda nenhuma — veja lá embaixo.
 */

/** (base, sombra, sombra forte) — a sombra pinta pescoço, nariz e boca. */
const PELES: Record<Pele, [string, string, string]> = {
  clara: ['#f3d5b8', '#e2bb96', '#c99873'],
  media: ['#c98d5d', '#b0764a', '#8e5c36'],
  escura: ['#7d4c2e', '#653a21', '#4d2b16'],
}

/** A madeira do manequim entra como se fosse mais um tom de pele. */
const MADEIRA: [string, string, string] = ['#d2a86b', '#bb8f52', '#9d743e']

/** (base, sombra) — a sombra aqui pinta a sobrancelha e o lado curto do degradê. */
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
 * Escurece um `#rrggbb`. Serve para a pele de teste do laboratório (as peles
 * do jogo vêm com os três tons escolhidos à mão) e para as dobras da roupa
 * nos troncos, que são variação da mesma cor e não cor nova.
 */
export function escurecer(hex: string, fator: number): string {
  const n = hex.replace('#', '')
  if (n.length !== 6) return hex
  const p = [0, 2, 4].map((i) => {
    const v = Math.round(parseInt(n.slice(i, i + 2), 16) * fator)
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
  })
  return `#${p.join('')}`
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
  /** Multiplica a cabeça inteira, ancorada no QUEIXO — assim ela cresce sem
   *  descolar do pescoço. 1 é o tamanho de sempre. */
  escalaCabeca: number
  /** Meia-largura do pescoço, e quanto dele aparece abaixo do queixo. */
  pescocoLarg: number
  pescocoAlt: number
  /** O quanto o ombro é arredondado: é o avanço horizontal da curva. Baixo
   *  vira ombro reto de manequim, alto vira ombro caído. */
  ombroBorda: number
  /** Multiplicadores das feições. 1 é o desenho de sempre; `sobrancelha` é a
   *  espessura em unidades do viewBox porque ela é uma barra, não uma forma. */
  nariz: number
  sobrancelha: number
  olho: number
  /** Altura da orelha. **Zero é o jogo de hoje**: o avatar do jogo não tem
   *  orelha, e é o laboratório que a liga. Ela nasce como medida, e não como
   *  peça, porque é um número só — e porque assim ela some sozinha nos cortes
   *  que a cobrem, bastando o cabelo ser mais largo que a cabeça. */
  orelha: number
}

export const MEDIDAS: Record<Corpo, Medidas> = {
  homem: { larg: 23.5, topo: 15, queixo: 72, rx: 29, ry: 27, cy: 35, ombro: 77, meioOmbro: 9, cantoY: 12, cantoX: 11, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1, orelha: 0 },
  mulher: { larg: 20, topo: 19, queixo: 72, rx: 26, ry: 25.5, cy: 38, ombro: 80, meioOmbro: 19, cantoY: 19, cantoX: 20, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1, orelha: 0 },
  manequim: { larg: 20, topo: 20, queixo: 70, rx: 26, ry: 25.5, cy: 38, ombro: 80, meioOmbro: 17, cantoY: 20, cantoX: 20, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1, orelha: 0 },
}

// ------------------------------------------------------------------ cabelo

/**
 * As FORMAS de cabelo, como tabela.
 *
 * Antes o corte era um `if` dentro do componente — `longo ? silhueta :
 * elipse` —, o que queria dizer que todo corte novo era mais um ramo. Hoje é
 * uma linha aqui, pela mesma razão que as cartas viraram dado.
 *
 * `teste: true` marca a forma que **o jogador não alcança**: ela existe só
 * para o `/lab/avatar` experimentar, porque a receita gravada no banco só
 * sabe dizer `curto` ou `longo`. Promover uma é acrescentar o valor em
 * `Corte` (`src/data/avatar.ts`) e um rótulo em `CORTES` — e nada mais,
 * porque `lerAvatar()` já cai no padrão diante de peça desconhecida.
 */
export type FormaDeCabelo =
  | Corte
  | 'quadrado'
  | 'careca'
  | 'degrade'
  | 'espetado'
  | 'topete'
  | 'cacheado'
  | 'chanel'
  | 'coque'

export interface DesenhoDeCabelo {
  m: Medidas
  cor: string
  sombra: string
  /** Único por avatar na página: o degradê precisa de um `id` de gradiente, e
   *  dois avatares com o mesmo id pintariam os dois com a primeira cor. */
  id: string
  /** A linha da aba do chapéu, quando há um cobrindo o topo da cabeça. */
  chapeuY?: number
}

export interface FormaCabelo {
  rotulo: string
  teste?: boolean
  /** Vai ATRÁS do rosto (e atrás do tronco). */
  atras: (d: DesenhoDeCabelo) => ReactNode
  /** Vai POR CIMA do rosto. */
  frente: (d: DesenhoDeCabelo) => ReactNode
  /** Substitui o corte INTEIRO (trás e frente) quando há chapéu cobrindo o
   *  topo. Só quem briga com a aba precisa disto — o resto aparece embaixo do
   *  boné como aparece sem ele, que é justamente a graça. Tem que levar o
   *  trás junto: era o bloco de trás do quadrado, e não a franja, que
   *  aparecia pelos cantos por cima do boné. */
  sobChapeu?: (d: DesenhoDeCabelo) => ReactNode
  /** Mechas caindo na frente do ombro, para o comprimento não sumir. */
  mechas?: boolean
}

// --- os dois cortes antigos, desenhados a partir da elipse solta (rx/ry/cy)

function franjaDe(m: Medidas): string {
  const { larg, topo, rx, ry, cy } = m
  const yp = cy + 7
  const dx = rx * Math.sqrt(Math.max(0, 1 - (7 / ry) ** 2))
  return `M${50 - dx} ${yp} A${rx} ${ry} 0 1 1 ${50 + dx} ${yp} C${50 + larg - 2} ${topo + 11} 60 ${topo + 6} 52 ${topo + 9} C44 ${topo + 12} 30 ${topo + 15} ${50 - dx} ${yp} Z`
}

function silhuetaDe(m: Medidas): string {
  const { topo, rx, cy } = m
  return `M50 ${topo - 10} C${50 + rx * 0.95} ${topo - 10} ${50 + rx + 3} ${topo + 14} ${50 + rx + 3} ${cy + 6} C${50 + rx + 5} ${cy + 30} ${50 + rx + 4} 80 ${50 + rx + 3} 100 L${50 - rx - 3} 100 C${50 - rx - 4} 80 ${50 - rx - 5} ${cy + 30} ${50 - rx - 3} ${cy + 6} C${50 - rx - 3} ${topo + 14} ${50 - rx * 0.95} ${topo - 10} 50 ${topo - 10} Z`
}

function mechaDe(m: Medidas, s: number): string {
  const { larg, rx, cy } = m
  return `M${50 + s * (rx - 2)} ${cy - 12} C${50 + s * (rx + 5)} ${cy + 28} ${50 + s * (rx + 4)} 80 ${50 + s * (rx + 3)} 100 L${50 + s * (larg - 2)} 100 C${50 + s * (larg - 1)} 78 ${50 + s * (larg + 1)} ${cy + 20} ${50 + s * (larg - 2)} ${cy - 12} Z`
}

// --- as peças dos cortes novos, todas presas à caixa do rosto

/** Meia-largura da massa de cabelo: a do rosto mais uma folga. */
function meia(m: Medidas, folga = 2): number {
  return m.larg + folga
}

/** A altura da cabeça, que é a régua vertical de todo corte novo. */
function altura(m: Medidas): number {
  return m.queixo - m.topo
}

/**
 * O bloco de cabelo por cima da testa: sobe acima do topo da cabeça e desce
 * até `k` da altura do rosto, com a borda de baixo mergulhando no meio. Esse
 * mergulho é o que separa testa de cabelo sem virar barra reta de peruca.
 */
function testaDe(m: Medidas, k: number, mergulho = 4, folga = 2): string {
  const L = meia(m, folga)
  const y = m.topo + altura(m) * k
  return `M${50 - L} ${y} L${50 - L} ${m.topo - 2} L${50 + L} ${m.topo - 2} L${50 + L} ${y} Q50 ${y + mergulho} ${50 - L} ${y} Z`
}

/** O topo da caixa do rosto, até `ate`. Serve ao degradê: ele precisa pintar
 *  a PELE, e só encaixa se seguir exatamente os cantos do rosto. */
function topoDoRosto(m: Medidas, ate: number): string {
  const { larg: L, topo: T, cantoX, cantoY } = m
  return `M${50 - L} ${ate} L${50 - L} ${T + cantoY} Q${50 - L} ${T} ${50 - L + cantoX} ${T} L${50 + L - cantoX} ${T} Q${50 + L} ${T} ${50 + L} ${T + cantoY} L${50 + L} ${ate} Z`
}

/** A franja reta dos cortes quadrados: uma barra na testa, sem arco. */
function franjaRetaDe(m: Medidas, alt: number): string {
  const { larg, topo } = m
  const x = larg + 1.5
  return `M${50 - x} ${topo - 2} h${x * 2} v${alt} q${-x} 3 ${-x * 2} 0 Z`
}

/** Volume atrás da cabeça, acompanhando a caixa do rosto. */
function coroaDe(m: Medidas, k: number, folga = 2.5, sobe = 5): ReactNode {
  const L = meia(m, folga)
  return (
    <rect
      x={50 - L}
      y={m.topo - sobe}
      width={L * 2}
      height={altura(m) * k + sobe}
      rx={L * 0.55}
    />
  )
}

const PONTAS = [7, 4.5, 6.5, 4]

function espetadoDe(m: Medidas): string {
  const L = meia(m, 1.5)
  const base = m.topo + altura(m) * 0.3
  const topo = m.topo + 1
  const passo = (2 * L) / PONTAS.length
  // as pontas têm alturas DIFERENTES e são curvas, não triângulos: cinco
  // triângulos iguais leem como coroa de rei, não como cabelo espetado
  let d = `M${50 - L} ${base} L${50 - L} ${topo}`
  PONTAS.forEach((h, i) => {
    const x = 50 - L + i * passo
    d += ` Q${x + passo * 0.5} ${m.topo - h * 2} ${x + passo} ${topo}`
  })
  return `${d} L${50 + L} ${base} Q50 ${base + 5} ${50 - L} ${base} Z`
}

function cachosDe(m: Medidas): string {
  const L = meia(m, 2)
  const base = m.topo + altura(m) * 0.31
  // quatro cachos, não cinco: com o bolo de trás na mesma cor, cacho pequeno
  // some dentro dele e o corte volta a ler como liso
  const n = 4
  const r = L / n
  let d = `M${50 - L} ${base} L${50 - L} ${m.topo + 2}`
  for (let i = 0; i < n; i += 1) d += ` a${r} ${r * 1.5} 0 0 1 ${r * 2} 0`
  return `${d} L${50 + L} ${base} Q50 ${base + 5} ${50 - L} ${base} Z`
}

function topeteDe(m: Medidas): string {
  const L = meia(m, 1.5)
  const a = altura(m)
  const base = m.topo + a * 0.3
  const T = m.topo
  return `M${50 - L} ${base} L${50 - L} ${T + 4} C${50 - L} ${T - 11} ${50 - L * 0.1} ${T - 21} ${50 + L * 0.72} ${T - 9} C${50 + L + 2} ${T - 3} ${50 + L} ${T + 6} ${50 + L} ${base} Q${50 - L * 0.35} ${base + 7} ${50 - L} ${base - 6} Z`
}

export const CABELOS_FORMA: Record<FormaDeCabelo, FormaCabelo> = {
  curto: {
    rotulo: 'Curto',
    atras: ({ m, cor }) => <ellipse cx="50" cy={m.cy} rx={m.rx} ry={m.ry} fill={cor} />,
    frente: ({ m, cor }) => <path d={franjaDe(m)} fill={cor} />,
  },
  longo: {
    rotulo: 'Longo',
    atras: ({ m, cor }) => <path d={silhuetaDe(m)} fill={cor} />,
    frente: ({ m, cor }) => <path d={franjaDe(m)} fill={cor} />,
    mechas: true,
  },
  espetado: {
    rotulo: 'Espetado',
    teste: true,
    // as pontas ficam na FRENTE, não atrás: espetado é uma silhueta, e
    // silhueta recortada pela cabeça deixa de ser espetado
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.34, 2.5, 0)}</g>,
    frente: ({ m, cor }) => <path d={espetadoDe(m)} fill={cor} />,
    sobChapeu: ({ m, cor }) => <path d={testaDe(m, 0.3, 5, 1.5)} fill={cor} />,
  },
  topete: {
    rotulo: 'Topete',
    teste: true,
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.34, 2, 0)}</g>,
    frente: ({ m, cor }) => <path d={topeteDe(m)} fill={cor} />,
    sobChapeu: ({ m, cor }) => <path d={testaDe(m, 0.3, 5, 1.5)} fill={cor} />,
  },
  cacheado: {
    rotulo: 'Cacheado',
    teste: true,
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.36, 3.5, 0)}</g>,
    frente: ({ m, cor }) => <path d={cachosDe(m)} fill={cor} />,
    sobChapeu: ({ m, cor }) => <path d={testaDe(m, 0.31, 5, 3.5)} fill={cor} />,
  },
  quadrado: {
    rotulo: 'Quadrado',
    teste: true,
    // um bloco de cantos duros: o oposto da elipse, e é isso que o faz ler
    // como corte de máquina em vez de "cabelo com pouco volume"
    atras: ({ m, cor }) => {
      const L = meia(m, 2)
      return (
        <path
          d={`M${50 - L} ${m.topo + altura(m) * 0.36} L${50 - L} ${m.topo - 5} L${50 + L} ${m.topo - 5} L${50 + L} ${m.topo + altura(m) * 0.36} Z`}
          fill={cor}
        />
      )
    },
    frente: ({ m, cor }) => <path d={franjaRetaDe(m, altura(m) * 0.19)} fill={cor} />,
    // era ele que não encaixava no boné: a barra reta da testa saía debaixo da
    // aba como um degrau. Embaixo de chapéu sobram só as costeletas
    sobChapeu: ({ m, cor, chapeuY }) => {
      const y = (chapeuY ?? m.topo) - 1
      const h = altura(m) * 0.15
      return (
        <g fill={cor}>
          <rect x={50 - m.larg} y={y} width={3} height={h} />
          <rect x={50 + m.larg - 3} y={y} width={3} height={h} />
        </g>
      )
    },
  },
  careca: {
    rotulo: 'Careca',
    teste: true,
    // careca não é "sem cabelo": é a coroa que sobra nas laterais. Uma elipse
    // baixa e mais larga que o rosto — o miolo some debaixo dele e só as
    // bordas aparecem, que é exatamente o que se vê numa cabeça careca
    atras: ({ m, cor }) => (
      <ellipse
        cx="50"
        cy={m.topo + altura(m) * 0.62}
        rx={m.larg + 3}
        ry={altura(m) * 0.33}
        fill={cor}
      />
    ),
    frente: () => null,
  },
  degrade: {
    rotulo: 'Degradê',
    teste: true,
    // **O degradê é o único corte que pinta a PELE.** A primeira versão eram
    // duas elipses atrás do rosto, e o resultado não era um degradê: era um
    // cabelo de dois tons, com a transição escondida debaixo da cabeça, que é
    // onde ela justamente não podia estar. Um fade de máquina acontece NA
    // TESTA e nas têmporas — então a peça é a caixa do rosto, pintada com um
    // gradiente que vai da cor do cabelo até transparente.
    // O `id` vem de fora (useId) porque dois avatares na mesma página com o
    // mesmo id de gradiente pintam os dois com a cor do primeiro.
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.3, 2, 3)}</g>,
    frente: ({ m, cor, id }) => (
      <>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="1" />
            <stop offset="34%" stopColor={cor} stopOpacity="1" />
            <stop offset="62%" stopColor={cor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={topoDoRosto(m, m.topo + altura(m) * 0.42)} fill={`url(#${id})`} />
      </>
    ),
  },
  chanel: {
    rotulo: 'Chanel',
    teste: true,
    atras: ({ m, cor }) => {
      const L = meia(m, 4)
      const yb = m.queixo + 3
      return (
        <path
          d={`M${50 - L} ${yb} L${50 - L} ${m.topo + 8} Q${50 - L} ${m.topo - 7} 50 ${m.topo - 7} Q${50 + L} ${m.topo - 7} ${50 + L} ${m.topo + 8} L${50 + L} ${yb} Q50 ${yb - 7} ${50 - L} ${yb} Z`}
          fill={cor}
        />
      )
    },
    frente: ({ m, cor }) => <path d={franjaRetaDe(m, altura(m) * 0.22)} fill={cor} />,
  },
  coque: {
    rotulo: 'Coque',
    teste: true,
    atras: ({ m, cor }) => (
      <g fill={cor}>
        <circle cx="50" cy={m.topo - 8} r={m.larg * 0.42} />
        {coroaDe(m, 0.3, 2, 4)}
      </g>
    ),
    frente: ({ m, cor }) => <path d={testaDe(m, 0.24, 5, 1.5)} fill={cor} />,
  },
}

// -------------------------------------------------------------- acessórios

/**
 * Acessórios são a peça BARATA: vão soltos por cima de tudo, sem encaixe com
 * o cabelo nem com o rosto para errar — o oposto exato do cabelo, que custou
 * três tentativas. Todos são de teste por enquanto: a receita no banco não
 * tem campo para eles.
 *
 * `aba` é o único acordo entre chapéu e cabelo: a linha onde o chapéu pousa.
 * Quem tem `aba` cobre o topo da cabeça, e o corte pode trocar o que mostra
 * embaixo dele (veja `sobChapeu`). Sem esse número, "o boné não encaixa" vira
 * um ajuste à mão por corte, que é o caminho de volta para o `if`.
 */
export type Acessorio = 'nenhum' | 'bone' | 'chapeu'

export const ACESSORIOS: Record<Acessorio, {
  rotulo: string
  teste?: boolean
  aba?: (m: Medidas) => number
  desenhar: (m: Medidas, cor: string, sombra: string) => ReactNode
}> = {
  nenhum: { rotulo: 'Nenhum', desenhar: () => null },
  bone: {
    rotulo: 'Boné',
    teste: true,
    aba: (m) => m.topo + altura(m) * 0.3,
    // ele é medido pela CABEÇA (larg/topo/queixo), não pela elipse do cabelo:
    // era isso que fazia o boné flutuar num corte e afundar em outro
    desenhar: (m, cor, sombra) => {
      const L = m.larg + 2.5
      const a = altura(m)
      const y = m.topo + a * 0.3
      return (
        <>
          <path
            d={`M${50 + L - 5} ${y - 3.5} q${L * 0.8} -1 ${L * 0.95} 5 q${-L * 0.22} 3 ${-L * 0.95} 1 Z`}
            fill={sombra}
          />
          <path d={`M${50 - L} ${y} A${L} ${a * 0.37} 0 0 1 ${50 + L} ${y} Z`} fill={cor} />
          <path d={`M${50 - L} ${y} h${L * 2} v-3.5 h${-L * 2} Z`} fill={sombra} />
          <circle cx="50" cy={y - a * 0.37} r="1.8" fill={sombra} />
        </>
      )
    },
  },
  chapeu: {
    rotulo: 'Chapéu',
    teste: true,
    aba: (m) => m.topo + altura(m) * 0.28,
    desenhar: (m, cor, sombra) => {
      const L = m.larg
      const a = altura(m)
      const y = m.topo + a * 0.28
      return (
        <>
          <ellipse cx="50" cy={y} rx={L + 13} ry={5.5} fill={cor} />
          <path
            d={`M${50 - L * 0.95} ${y} A${L * 0.95} ${a * 0.36} 0 0 1 ${50 + L * 0.95} ${y} Z`}
            fill={cor}
          />
          <path d={`M${50 - L * 0.95} ${y - 3} h${L * 1.9} v3 h${-L * 1.9} Z`} fill={sombra} />
        </>
      )
    },
  },
}

// ------------------------------------------------------------------ tronco

/**
 * O que existe do queixo para baixo, como tabela.
 *
 * Antes era código solto no meio do componente com um `if` por corpo, e a
 * consequência é que "roupa nova" e "sem pescoço" eram mudanças na máquina.
 * Aqui cada linha desenha o conjunto INTEIRO — pescoço, tronco e gola —
 * porque os três se recortam: a gola só fecha se souber onde o pescoço
 * acabou, e um pescoço desenhado depois do ombro deixa lascas de pele nos
 * cantos da gola.
 *
 * O `padrao` é o jogo de hoje, e é o único que olha o corpo. Os outros são de
 * teste, e nenhum deles pergunta se é homem ou mulher — quem responde isso é
 * o cabelo e o rosto.
 */
export type Tronco = 'padrao' | 'colado' | 'golaAlta' | 'camiseta' | 'social'

export interface DesenhoDeTronco {
  m: Medidas
  roupa: string
  pele: string
  sombra: string
  sombraForte: string
  corpo: Corpo
}

function pescocoDe(m: Medidas): string {
  return `M${50 - m.pescocoLarg} ${m.queixo - 8} h${m.pescocoLarg * 2} v${m.pescocoAlt} h${-m.pescocoLarg * 2} Z`
}

function troncoDe(m: Medidas, y: number, borda = m.ombroBorda): string {
  const mo = m.meioOmbro
  return `M${mo} 100 C${mo} ${y + 6} ${mo + borda} ${y} 50 ${y} C${100 - mo - borda} ${y} ${100 - mo} ${y + 6} ${100 - mo} 100 Z`
}

export const TRONCOS: Record<Tronco, {
  rotulo: string
  teste?: boolean
  desenhar: (d: DesenhoDeTronco) => ReactNode
}> = {
  padrao: {
    rotulo: 'Do jogo',
    desenhar: ({ m, roupa, pele, sombra, corpo }) => {
      const manequim = corpo === 'manequim'
      return (
        <>
          {/* o pescoço vem ANTES do ombro: é o ombro que o recorta */}
          <path d={pescocoDe(m)} fill={sombra} />
          <path d={troncoDe(m, m.ombro)} fill={manequim ? sombra : roupa} />
          {manequim ? (
            <circle cx="50" cy={m.ombro + 1} r="7.5" fill={pele} />
          ) : corpo === 'homem' ? (
            <path d={`M41 ${m.ombro} L50 ${m.ombro + 12} L59 ${m.ombro} Z`} fill={pele} />
          ) : (
            <rect x="41" y={m.queixo + 1} width="18" height={m.ombro + 6 - m.queixo} rx="5" fill={roupa} />
          )}
        </>
      )
    },
  },
  colado: {
    rotulo: 'Sem pescoço',
    teste: true,
    // o corpo encosta no queixo e não há pescoço nenhum. É o que faz a cabeça
    // parecer maior sem mexer em medida nenhuma, e é de graça: uma curva a
    // menos, não uma peça a mais
    desenhar: ({ m, roupa }) => (
      <>
        <path d={troncoDe(m, m.queixo - 1, m.ombroBorda + 9)} fill={roupa} />
        <path
          d={`M${50 - m.larg * 0.55} ${m.queixo - 1} Q50 ${m.queixo + 5} ${50 + m.larg * 0.55} ${m.queixo - 1}`}
          fill="none"
          stroke={escurecer(roupa, 0.85)}
          strokeWidth="1.6"
        />
      </>
    ),
  },
  golaAlta: {
    rotulo: 'Gola alta',
    teste: true,
    desenhar: ({ m, roupa }) => (
      <>
        <rect
          x={50 - m.pescocoLarg - 2.5}
          y={m.queixo - 7}
          width={(m.pescocoLarg + 2.5) * 2}
          height={m.ombro + 10 - m.queixo}
          rx="3"
          fill={escurecer(roupa, 0.88)}
        />
        <path d={troncoDe(m, m.ombro)} fill={roupa} />
      </>
    ),
  },
  camiseta: {
    rotulo: 'Camiseta',
    teste: true,
    desenhar: ({ m, roupa, sombra }) => (
      <>
        <path d={pescocoDe(m)} fill={sombra} />
        <path d={troncoDe(m, m.ombro)} fill={roupa} />
        <path
          d={`M${50 - 11} ${m.ombro - 2} Q50 ${m.ombro + 9} ${50 + 11} ${m.ombro - 2} Z`}
          fill={sombra}
        />
        <path
          d={`M${50 - 11} ${m.ombro - 2} Q50 ${m.ombro + 9} ${50 + 11} ${m.ombro - 2}`}
          fill="none"
          stroke={escurecer(roupa, 0.85)}
          strokeWidth="2"
        />
      </>
    ),
  },
  social: {
    rotulo: 'Social',
    teste: true,
    desenhar: ({ m, roupa, sombra }) => {
      const y = m.ombro
      return (
        <>
          <path d={pescocoDe(m)} fill={sombra} />
          <path d={troncoDe(m, y)} fill={escurecer(roupa, 0.78)} />
          <path d={`M${50 - 13} ${y - 1} L50 ${y + 15} L${50 + 13} ${y - 1} L${50 + 13} 100 L${50 - 13} 100 Z`} fill="#ded9cd" />
          <path d={`M${50 - 13} ${y - 1} L50 ${y + 15} L${50 - 5} ${y + 17} L${50 - 17} ${y + 5} Z`} fill={roupa} />
          <path d={`M${50 + 13} ${y - 1} L50 ${y + 15} L${50 + 5} ${y + 17} L${50 + 17} ${y + 5} Z`} fill={roupa} />
        </>
      )
    },
  },
}

// ------------------------------------------------------------------- olhos

/**
 * Os olhos, como tabela — para "com mais expressão" não ser um `if`.
 *
 * **A régua aqui é desenho, não anatomia.** A primeira tentativa foi
 * realista (branco, íris, pupila e um brilho grande) e ficou pior: parecia
 * decalque de outro jogo. O que dá expressão num rosto chapado como este é:
 *
 *  1. **Forma grande e sólida**, e de preferência NÃO redonda: uma amêndoa
 *     deitada ou um oval em pé leem como olhar; um círculo lê como botão.
 *  2. **Inclinação espelhada.** É o ângulo do olho, não o que tem dentro
 *     dele, que diz curioso, desconfiado ou surpreso.
 *  3. **A íris fora do centro**, encostada no lado do nariz: o olhar converge
 *     e o rosto passa a olhar para quem vê.
 *
 * O **brilho** entra como quarta coisa, e só depois das três: é um ponto
 * claro no canto de cima da íris. Ele some em 24px, e é por isso que nenhum
 * olho depende dele para se ler — mas no tamanho do perfil é o que tira o
 * olhar de "chapado" para "vivo". Por isso ele é um número (`brilho`) e não
 * um desenho: zero desliga.
 */
export type Olhos =
  | 'simples'
  | 'desenho'
  | 'amendoa'
  | 'emPe'
  | 'deitado'
  | 'surpreso'
  | 'esperto'
  | 'feliz'

export interface DesenhoDeOlho {
  x: number
  y: number
  /** Multiplicador de tamanho (a medida `olho`). */
  t: number
  /** A cor da íris. */
  cor: string
  /** -1 é o olho da esquerda, 1 o da direita: espelha a inclinação. */
  lado: number
  /** Para a pálpebra, que é pele por cima. */
  pele: string
  sombra: string
}

const BRANCO_DO_OLHO = '#fbf7ee'

/** Forma de um olho de branco + íris. Todos os olhos com íris saem daqui. */
interface FormaDeOlho {
  /** O branco. */
  rx: number
  ry: number
  /** Giro em graus, espelhado entre os dois olhos. */
  giro?: number
  /** A íris: deslocamento em direção ao nariz, e tamanho. */
  ix: number
  iy: number
  irx: number
  iry: number
  /** Raio do brilho. Zero desliga. */
  brilho?: number
}

function olhoComIris(o: DesenhoDeOlho, f: FormaDeOlho): ReactNode {
  const giro = (f.giro ?? 0) * -o.lado
  return (
    <g transform={`translate(${o.x} ${o.y}) rotate(${giro}) scale(${o.t})`}>
      <ellipse rx={f.rx} ry={f.ry} fill={BRANCO_DO_OLHO} />
      <ellipse cx={f.ix * -o.lado} cy={f.iy} rx={f.irx} ry={f.iry} fill={o.cor} />
      {f.brilho ? (
        <circle
          cx={f.ix * -o.lado - f.irx * 0.42}
          cy={f.iy - f.iry * 0.45}
          r={f.brilho}
          fill={BRANCO_DO_OLHO}
        />
      ) : null}
    </g>
  )
}

export const OLHOS: Record<Olhos, {
  rotulo: string
  teste?: boolean
  desenhar: (o: DesenhoDeOlho) => ReactNode
}> = {
  simples: {
    rotulo: 'Simples',
    desenhar: ({ x, y, t }) => <ellipse cx={x} cy={y} rx={3 * t} ry={3.6 * t} fill="#241f1b" />,
  },
  desenho: {
    rotulo: 'Desenho',
    teste: true,
    desenhar: (o) =>
      olhoComIris(o, { rx: 5.8, ry: 4, giro: 16, ix: 1.5, iy: 0.2, irx: 2.4, iry: 3, brilho: 1 }),
  },
  amendoa: {
    rotulo: 'Amêndoa',
    teste: true,
    // o menos redondo de todos: largo e baixo. É o olho mais neutro do
    // conjunto, e o melhor candidato a virar o padrão
    desenhar: (o) =>
      olhoComIris(o, { rx: 6.2, ry: 3.5, giro: 11, ix: 1.4, iy: 0.1, irx: 2.3, iry: 2.8, brilho: 0.95 }),
  },
  emPe: {
    rotulo: 'Em pé',
    teste: true,
    desenhar: (o) =>
      olhoComIris(o, { rx: 4, ry: 5.4, giro: 6, ix: 0.9, iy: 0.2, irx: 2.5, iry: 3.4, brilho: 1 }),
  },
  deitado: {
    rotulo: 'Deitado',
    teste: true,
    desenhar: (o) =>
      olhoComIris(o, { rx: 6.8, ry: 3, giro: 8, ix: 1.8, iy: 0, irx: 2.3, iry: 2.5, brilho: 0.85 }),
  },
  surpreso: {
    rotulo: 'Surpreso',
    teste: true,
    desenhar: (o) =>
      olhoComIris(o, { rx: 4.6, ry: 5.2, ix: 0.8, iy: -0.5, irx: 2.2, iry: 2.8, brilho: 1 }),
  },
  esperto: {
    rotulo: 'De lado',
    teste: true,
    // a pálpebra é um retângulo da COR DA PELE por cima: como o olho mora
    // dentro do rosto, o que sobra dela fora do olho é pele também e some
    // sozinho — sem recorte nenhum
    desenhar: (o) => (
      <g transform={`translate(${o.x} ${o.y}) rotate(${-8 * o.lado}) scale(${o.t})`}>
        <ellipse rx={5.8} ry={4.3} fill={BRANCO_DO_OLHO} />
        <ellipse cx={-2.2 * o.lado} cy={0.9} rx={2.4} ry={3.1} fill={o.cor} />
        <circle cx={-2.2 * o.lado - 1} cy={-0.4} r={0.95} fill={BRANCO_DO_OLHO} />
        <rect x={-6.8} y={-5.8} width={13.6} height={4.5} fill={o.pele} />
        <path d="M-5.5 -1.3 h11" stroke={o.sombra} strokeWidth={1.1} strokeLinecap="round" fill="none" />
      </g>
    ),
  },
  feliz: {
    rotulo: 'Feliz',
    teste: true,
    // sem branco, sem íris e sem brilho: só o arco. É o olho mais expressivo
    // do conjunto e o que tem menos desenho — a prova de que expressão aqui
    // não é detalhe
    desenhar: ({ x, y, t }) => (
      <path
        d={`M${x - 4.4 * t} ${y + 1.4 * t} Q${x} ${y - 4 * t} ${x + 4.4 * t} ${y + 1.4 * t}`}
        fill="none"
        stroke="#241f1b"
        strokeWidth={2.3 * t}
        strokeLinecap="round"
      />
    ),
  },
}

/** Só o laboratório usa isto: trocar peça, cor e medida sem editar o arquivo. */
export interface Ajustes {
  medidas?: Partial<Medidas>
  cores?: {
    cabelo?: string
    roupa?: string
    fundo?: string
    /** Cor livre de pele: as duas sombras saem dela por `escurecer()`. */
    pele?: string
    acessorio?: string
    /** A íris dos olhos que têm íris (todos menos Simples e Feliz). */
    olho?: string
  }
  pecas?: { silhueta?: string; franja?: string; mecha?: string }
  /** As peças de TESTE. Nenhuma delas é alcançável pelo jogador: a receita
   *  gravada no banco não tem como pedi-las. */
  teste?: {
    cabelo?: FormaDeCabelo
    acessorio?: Acessorio
    olhos?: Olhos
    tronco?: Tronco
  }
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
  /** Dev-only: usado pelo `/lab/avatar` para experimentar. */
  ajustes?: Ajustes
}) {
  // o degradê precisa de um id de gradiente, e o perfil desenha vários
  // avatares na mesma página: com id repetido, todos seriam pintados com a
  // cor do primeiro. Os dois-pontos do useId não sobrevivem a um `url(#...)`
  const id = `deg-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const manequim = avatar.corpo === 'manequim'
  const peleBase = manequim ? MADEIRA : PELES[avatar.pele]
  const [p, ps, pss] = ajustes?.cores?.pele
    ? [ajustes.cores.pele, escurecer(ajustes.cores.pele, 0.88), escurecer(ajustes.cores.pele, 0.74)]
    : peleBase
  const [cBase, csBase] = CABELOS[avatar.cor]
  const c = ajustes?.cores?.cabelo ?? cBase
  const cs = ajustes?.cores?.cabelo ? escurecer(ajustes.cores.cabelo, 0.75) : csBase
  const roupa = ajustes?.cores?.roupa ?? ROUPAS[avatar.roupa]
  const fundo = ajustes?.cores?.fundo ?? FUNDOS[avatar.fundo]
  const corAcessorio = ajustes?.cores?.acessorio ?? '#8c5a58'
  const m = { ...MEDIDAS[avatar.corpo], ...ajustes?.medidas }
  const { larg, topo, queixo, cantoY, cantoX } = m
  const alt = queixo - topo

  const forma = CABELOS_FORMA[ajustes?.teste?.cabelo ?? avatar.cabelo] ?? CABELOS_FORMA.curto
  const acessorio = ACESSORIOS[ajustes?.teste?.acessorio ?? 'nenhum'] ?? ACESSORIOS.nenhum
  const olhos = OLHOS[ajustes?.teste?.olhos ?? 'simples'] ?? OLHOS.simples
  const tronco = TRONCOS[ajustes?.teste?.tronco ?? 'padrao'] ?? TRONCOS.padrao

  const chapeuY = acessorio.aba?.(m)
  const cabelo: DesenhoDeCabelo = { m, cor: c, sombra: cs, id, chapeuY }
  // embaixo de chapéu o corte continua aparecendo — é isso que faz o boné
  // parecer vestido e não colado. Só troca quem declarou que a própria frente
  // briga com a aba
  const trocaPeloChapeu = chapeuY !== undefined && forma.sobChapeu !== undefined
  const atrasDoCabelo = trocaPeloChapeu ? null : forma.atras(cabelo)
  const frenteDoCabelo = trocaPeloChapeu ? forma.sobChapeu!(cabelo) : forma.frente(cabelo)

  const olhoX = larg * 0.47
  const olhoY = topo + alt * 0.53
  const sobY = topo + alt * 0.365
  const narizY = topo + alt * 0.62
  const bocaY = topo + alt * 0.81
  const sl = larg * 0.5
  const orelhaY = topo + alt * 0.55

  // a cabeça inteira escala ancorada no QUEIXO: crescendo a partir dali ela
  // não descola do pescoço, que é o que aconteceria escalando pelo centro do
  // viewBox. São dois grupos com a MESMA transformação porque o cabelo de
  // trás precisa continuar atrás do tronco — juntar tudo num grupo só
  // trocaria a ordem de pintura
  const escalar = m.escalaCabeca === 1
    ? undefined
    : `translate(50 ${queixo}) scale(${m.escalaCabeca}) translate(-50 ${-queixo})`

  return (
    <span
      className={`${styles.moldura} ${className ?? ''}`}
      style={{ background: fundo, width: tamanho, height: tamanho }}
    >
      <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" role="img" aria-label="Avatar">
        {/* 1. cabelo de trás, atrás de tudo */}
        <g transform={escalar}>
          {manequim ? null : ajustes?.pecas?.silhueta ? (
            <path d={ajustes.pecas.silhueta} fill={c} />
          ) : (
            atrasDoCabelo
          )}
        </g>

        {/* 2. pescoço, tronco e gola — os três juntos, porque se recortam */}
        {tronco.desenhar({ m, roupa, pele: p, sombra: ps, sombraForte: pss, corpo: avatar.corpo })}

        <g transform={escalar}>
          {/* 3. orelhas, entre o cabelo de trás e o rosto: metade some
                 debaixo do rosto, então não há encaixe para errar. Corte mais
                 largo que a cabeça cobre elas sozinho */}
          {m.orelha > 0 && !manequim
            ? [-1, 1].map((s) => (
                <g key={s}>
                  <ellipse
                    cx={50 + s * (larg + m.orelha * 0.35)}
                    cy={orelhaY}
                    rx={m.orelha * 0.62}
                    ry={m.orelha}
                    fill={p}
                  />
                  <path
                    d={`M${50 + s * (larg + m.orelha * 0.5)} ${orelhaY - m.orelha * 0.34} q${s * m.orelha * 0.22} ${m.orelha * 0.34} 0 ${m.orelha * 0.68}`}
                    fill="none"
                    stroke={ps}
                    strokeWidth={m.orelha * 0.2}
                    strokeLinecap="round"
                  />
                </g>
              ))
            : null}

          {/* 4. rosto */}
          <path
            d={`M${50 - larg} ${topo + cantoY} Q${50 - larg} ${topo} ${50 - larg + cantoX} ${topo} L${50 + larg - cantoX} ${topo} Q${50 + larg} ${topo} ${50 + larg} ${topo + cantoY} L${50 + larg} ${queixo - cantoY} Q${50 + larg} ${queixo} ${50 + larg - cantoX} ${queixo} L${50 - larg + cantoX} ${queixo} Q${50 - larg} ${queixo} ${50 - larg} ${queixo - cantoY} Z`}
            fill={p}
          />

          {/* 5. cabelo da frente */}
          {manequim ? null : ajustes?.pecas?.franja ? (
            <path d={ajustes.pecas.franja} fill={c} />
          ) : (
            frenteDoCabelo
          )}

          {/* 6. mechas da frente, para o comprimento não sumir atrás do ombro */}
          {forma.mechas && !manequim ? (
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
              [-1, 1].map((s) => <path key={s} d={mechaDe(m, s)} fill={c} />)
            )
          ) : null}

          {/* 7. rosto: olho, nariz, boca. O manequim não tem nenhum dos três —
                 é justamente a cara vazia que diz "ainda não escolhi". */}
          {manequim ? null : (
            <>
              {[-1, 1].map((s) => (
                <g key={s}>
                  <rect
                    x={50 + s * olhoX - sl / 2}
                    y={sobY}
                    width={sl}
                    height={m.sobrancelha}
                    rx={m.sobrancelha / 2}
                    fill={cs}
                  />
                  {olhos.desenhar({
                    x: 50 + s * olhoX,
                    y: olhoY,
                    t: m.olho,
                    cor: ajustes?.cores?.olho ?? '#4a3524',
                    lado: s,
                    pele: p,
                    sombra: ps,
                  })}
                </g>
              ))}
              <path
                d={`M50 ${narizY} q${3.2 * m.nariz} ${5 * m.nariz} 0 ${5.6 * m.nariz} q${-3.2 * m.nariz} ${-0.6 * m.nariz} 0 ${-5.6 * m.nariz} Z`}
                fill={pss}
              />
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

          {/* 8. acessório, por cima de tudo — é o que o torna barato */}
          {acessorio.desenhar(m, corAcessorio, escurecer(corAcessorio, 0.72))}
        </g>
      </svg>
    </span>
  )
}
