'use client'

import { useId, type ReactNode } from 'react'
import type {
  Acessorio,
  Avatar as Receita,
  Barba,
  CorCabelo,
  CorFundo,
  CorRoupa,
  Corte,
  Oculos,
  Olhos,
  Pele,
  Rosto,
  Tronco,
} from '@/data/avatar'

// os tipos das peças moram na RECEITA (src/data/avatar.ts), porque é ela que
// vai para o banco; o lab os importa daqui por conveniência
export type { Acessorio, Barba, Oculos, Olhos, Rosto, Tronco }
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

/**
 * (base, sombra, sombra forte) — a sombra pinta pescoço, nariz e boca.
 *
 * Os três tons de cada pele são escolhidos À MÃO, e não derivados da base:
 * a sombra calculada funciona nos tons claros e some nos escuros, onde o nariz
 * e a boca precisam de contraste de verdade para continuarem existindo.
 */
export const TONS_DE_PELE: Record<Pele, [string, string, string]> = {
  clara: ['#f3d5b8', '#e2bb96', '#c99873'],
  areia: ['#edcaa4', '#dab186', '#bd9064'],
  mel: ['#d9a066', '#c48a52', '#a06a36'],
  media: ['#c98d5d', '#b0764a', '#8e5c36'],
  canela: ['#a9713f', '#935f31', '#6f4420'],
  escura: ['#7d4c2e', '#653a21', '#4d2b16'],
  ebano: ['#5c3622', '#4a2a19', '#2e1a0e'],
}

/** A madeira do manequim entra como se fosse mais um tom de pele. */
const MADEIRA: [string, string, string] = ['#d2a86b', '#bb8f52', '#9d743e']

/** (base, sombra) — a sombra aqui pinta a sobrancelha e o lado curto do degradê. */
export const TONS_DE_CABELO: Record<CorCabelo, [string, string]> = {
  preto: ['#2b2622', '#1a1713'],
  branco: ['#e8e3d8', '#cbc4b3'],
  castanho: ['#6b4326', '#502f18'],
  mel: ['#a3733f', '#83592c'],
  loiro: ['#d5a743', '#b3872a'],
  ruivo: ['#b0501f', '#8a3b12'],
  grisalho: ['#9a948a', '#7a7469'],
}

export const TONS_DE_ROUPA: Record<CorRoupa, string> = {
  azul: '#6f7f8c',
  petroleo: '#3f5a60',
  oliva: '#7d8558',
  mostarda: '#c19a3e',
  terracota: '#b06a44',
  vinho: '#8c5a58',
  areia: '#c2ab86',
  grafite: '#4f4d48',
}

export const TONS_DE_FUNDO: Record<CorFundo, string> = {
  papel: '#d8cfba',
  kraft: '#c9b596',
  menta: '#b7c9bb',
  ceu: '#b3c3d1',
  lavanda: '#c1bcd1',
  pessego: '#dcc0a8',
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

/**
 * Um conjunto de medidas por FORMATO de rosto — e não por gênero, como até a
 * v0.12. `quadrado` é o antigo "homem" e `oval` a antiga "mulher", número por
 * número: quem tinha avatar abre com o mesmo rosto de antes. A orelha entrou
 * para os três rostos de gente de uma vez; o manequim continua sem ela.
 */
export const MEDIDAS: Record<Rosto, Medidas> = {
  quadrado: { larg: 23.5, topo: 15, queixo: 72, rx: 29, ry: 27, cy: 35, ombro: 77, meioOmbro: 9, cantoY: 12, cantoX: 11, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1, orelha: 4.2 },
  redondo: { larg: 22.5, topo: 16, queixo: 71, rx: 28, ry: 27, cy: 36, ombro: 78, meioOmbro: 14, cantoY: 21, cantoX: 21, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1, orelha: 4.2 },
  oval: { larg: 20, topo: 19, queixo: 72, rx: 26, ry: 25.5, cy: 38, ombro: 80, meioOmbro: 19, cantoY: 19, cantoX: 20, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1, orelha: 4 },
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
 * para o `/lab/avatar` experimentar. Hoje nenhuma está marcada — os dez cortes
 * entraram na receita na v0.13. Promover uma peça nova é acrescentar o valor
 * em `Corte` (`src/data/avatar.ts`) e um rótulo em `CORTES` — e nada mais,
 * porque `lerAvatar()` já cai no padrão diante de peça desconhecida.
 */
/** Todos os cortes do lab entraram na receita (v0.13); o nome antigo fica
 *  como apelido para o laboratório, que experimenta peças por ele. */
export type FormaDeCabelo = Corte

export interface DesenhoDeCabelo {
  m: Medidas
  cor: string
  sombra: string
  /** A pele, para o risco da divisão das tranças. */
  pele: string
  /** Único por avatar na página: o degradê precisa de um `id` de gradiente, e
   *  dois avatares com o mesmo id pintariam os dois com a primeira cor. */
  id: string
}

export interface FormaCabelo {
  rotulo: string
  teste?: boolean
  /** Vai ATRÁS do rosto (e atrás do tronco). */
  atras: (d: DesenhoDeCabelo) => ReactNode
  /** Vai POR CIMA do rosto. */
  frente: (d: DesenhoDeCabelo) => ReactNode
  /** Mechas caindo na frente do ombro, para o comprimento não sumir. */
  mechas?: boolean
  /** Desenho por cima de TUDO do cabelo, mechas inclusive — o trançado. */
  textura?: (d: DesenhoDeCabelo) => ReactNode
}

// O chapéu não tem mais um caso por corte. Havia um `sobChapeu` para cada
// corte que brigava com a aba, e mesmo assim cinco vazavam (cantos pretos do
// espetado e do cacheado, o coque por cima do chapéu, um halo em volta da
// copa no curto e no chanel). Hoje TODO o cabelo é recortado da aba para
// baixo — veja o `clipPath` no componente —, e corte novo já nasce cabendo.

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

/**
 * Uma borda CRESPA: a elipse com `n` ondas para fora. É o que faz o black
 * power e o puff lerem como cabelo crespo e não como uma bola lisa — a
 * textura mora no contorno, que é a única coisa que aparece em 24px.
 */
function bordaCrespa(cx: number, cy: number, rx: number, ry: number, n: number, onda: number): string {
  const ponto = (t: number, k = 1) => [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]
  let d = ''
  for (let i = 0; i <= n; i += 1) {
    const t = (i / n) * Math.PI * 2
    const [x, y] = ponto(t)
    if (i === 0) {
      d = `M${x.toFixed(2)} ${y.toFixed(2)}`
      continue
    }
    const [cx2, cy2] = ponto(t - Math.PI / n, 1 + onda * 2)
    d += ` Q${cx2.toFixed(2)} ${cy2.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return `${d} Z`
}

/**
 * A linha do cabelo dos cortes crespos: vai de têmpora a têmpora e sobe no
 * meio, e a borda é feita de ondas pequenas. Lisa, ela lia como a aba de uma
 * boina — o puff virava gorro. As ondas são a mesma ideia da `bordaCrespa`:
 * a textura mora no contorno.
 */
function linhaRedondaDe(m: Medidas, k: number, folga = 1, ondas = 7): string {
  const L = meia(m, folga)
  const y = m.topo + altura(m) * k
  const T = m.topo
  const meio = T + altura(m) * 0.05
  // a curva de antes (uma quadrática de têmpora a têmpora), agora percorrida
  // em `ondas` pedaços, cada um com o controle puxado para dentro do rosto
  const curva = (t: number) => {
    const u = 1 - t
    return [u * u * (50 + L) + 2 * u * t * 50 + t * t * (50 - L), u * u * y + 2 * u * t * meio + t * t * y]
  }
  let borda = ''
  for (let i = 1; i <= ondas; i += 1) {
    const [x, yy] = curva(i / ondas)
    const [cx, cy] = curva((i - 0.5) / ondas)
    borda += ` Q${cx.toFixed(2)} ${(cy + 2.2).toFixed(2)} ${x.toFixed(2)} ${yy.toFixed(2)}`
  }
  return `M${50 - L} ${y} L${50 - L} ${T + 4} Q${50 - L} ${T - 3} 50 ${T - 3} Q${50 + L} ${T - 3} ${50 + L} ${T + 4} L${50 + L} ${y}${borda} Z`
}

/**
 * O curto, refeito a partir da caixa do rosto. O antigo era a elipse solta
 * (rx/ry/cy): mais larga que a cabeça, ela cobria a orelha e lia como
 * capacete ao lado dos cortes novos. Este tem franja de lado — mais baixa à
 * esquerda, subindo para a direita —, que é o que o separa do topete e do
 * espetado sem precisar de volume.
 */
function curtoDe(m: Medidas): string {
  const L = meia(m, 1.5)
  const a = altura(m)
  const T = m.topo
  const esq = T + a * 0.3
  const dir = T + a * 0.22
  return `M${50 - L} ${esq} L${50 - L} ${T + 3} Q${50 - L} ${T - 4} ${50 - L + 8} ${T - 4} L${50 + L - 8} ${T - 4} Q${50 + L} ${T - 4} ${50 + L} ${T + 3} L${50 + L} ${dir} Q${50 + L * 0.15} ${T + a * 0.05} ${50 - L * 0.4} ${T + a * 0.17} Q${50 - L * 0.8} ${T + a * 0.23} ${50 - L} ${esq} Z`
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
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.32, 2, 2)}</g>,
    frente: ({ m, cor }) => <path d={curtoDe(m)} fill={cor} />,
  },
  longo: {
    rotulo: 'Longo',
    atras: ({ m, cor }) => <path d={silhuetaDe(m)} fill={cor} />,
    frente: ({ m, cor }) => <path d={franjaDe(m)} fill={cor} />,
    mechas: true,
  },
  espetado: {
    rotulo: 'Espetado',
    // as pontas ficam na FRENTE, não atrás: espetado é uma silhueta, e
    // silhueta recortada pela cabeça deixa de ser espetado
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.34, 2.5, 0)}</g>,
    frente: ({ m, cor }) => <path d={espetadoDe(m)} fill={cor} />,
  },
  topete: {
    rotulo: 'Topete',
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.34, 2, 0)}</g>,
    frente: ({ m, cor }) => <path d={topeteDe(m)} fill={cor} />,
  },
  cacheado: {
    rotulo: 'Cacheado',
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.36, 3.5, 0)}</g>,
    frente: ({ m, cor }) => <path d={cachosDe(m)} fill={cor} />,
  },
  quadrado: {
    rotulo: 'Quadrado',
    // um bloco de cantos duros: o oposto da elipse, e é isso que o faz ler
    // como corte de máquina. "Duros" não é "vivos": com o canto em ângulo
    // reto ele lia como chapéu de lego, e um raio pequeno basta para virar
    // cabelo sem perder a forma
    atras: ({ m, cor }) => {
      const L = meia(m, 2)
      const base = m.topo + altura(m) * 0.36
      const T = m.topo - 5
      return (
        <path
          d={`M${50 - L} ${base} L${50 - L} ${T + 4} Q${50 - L} ${T} ${50 - L + 4} ${T} L${50 + L - 4} ${T} Q${50 + L} ${T} ${50 + L} ${T + 4} L${50 + L} ${base} Z`}
          fill={cor}
        />
      )
    },
    frente: ({ m, cor }) => <path d={franjaRetaDe(m, altura(m) * 0.19)} fill={cor} />,
  },
  careca: {
    rotulo: 'Careca',
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
    // **O degradê é o único corte que pinta a PELE.** A primeira versão eram
    // duas elipses atrás do rosto — um cabelo de dois tons, com a transição
    // escondida debaixo da cabeça. A segunda pintava a testa INTEIRA com um
    // gradiente, e o centro da testa lia como mancha. A terceira pôs faixas
    // nas têmporas com a borda de dentro dura, e elas liam como listras.
    // Num fade de máquina o topo é cabelo de verdade, com linha de cabelo
    // marcada, e quem some na pele são as têmporas — nas DUAS direções: para
    // baixo, até a orelha, e para dentro, até a testa. Então o topo é sólido
    // (`frente`, e é ele que leva o contorno de baixo contraste) e o fade mora
    // na `textura`: um gradiente para dentro, mascarado por outro para baixo.
    // O `id` vem de fora (useId) porque dois avatares na mesma página com o
    // mesmo id de gradiente pintam os dois com a cor do primeiro.
    atras: ({ m, cor }) => <g fill={cor}>{coroaDe(m, 0.3, 2, 3)}</g>,
    frente: ({ m, cor }) => <path d={topoDoRosto(m, m.topo + altura(m) * 0.13)} fill={cor} />,
    textura: ({ m, cor, id }) => {
      const a = altura(m)
      const largura = m.larg * 0.42
      const de = m.topo + a * 0.1
      const ate = m.topo + a * 0.52
      return (
        <>
          <defs>
            <linearGradient id={`${id}-fe`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={cor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={cor} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-fd`} x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor={cor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={cor} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-fv`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="45%" stopColor="#fff" />
              <stop offset="100%" stopColor="#000" />
            </linearGradient>
            <mask id={`${id}-fm`}>
              <rect x={0} y={de} width={100} height={ate - de} fill={`url(#${id}-fv)`} />
            </mask>
          </defs>
          <g mask={`url(#${id}-fm)`}>
            <rect x={50 - m.larg} y={de} width={largura} height={ate - de} fill={`url(#${id}-fe)`} />
            <rect x={50 + m.larg - largura} y={de} width={largura} height={ate - de} fill={`url(#${id}-fd)`} />
          </g>
        </>
      )
    },
  },
  chanel: {
    rotulo: 'Chanel',
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
    atras: ({ m, cor }) => (
      <g fill={cor}>
        <circle cx="50" cy={m.topo - 8} r={m.larg * 0.42} />
        {coroaDe(m, 0.3, 2, 4)}
      </g>
    ),
    frente: ({ m, cor }) => <path d={testaDe(m, 0.24, 5, 1.5)} fill={cor} />,
  },
  // os três crespos. Faltavam: a receita tem sete tons de pele, até o ébano,
  // e nenhum cabelo crespo — o cacheado é um cacho curto, liso por baixo
  blackPower: {
    rotulo: 'Black power',
    atras: ({ m, cor }) => (
      <path
        d={bordaCrespa(50, m.topo + altura(m) * 0.3, m.larg + 10, altura(m) * 0.55, 16, 0.045)}
        fill={cor}
      />
    ),
    frente: ({ m, cor }) => <path d={linhaRedondaDe(m, 0.24, 1)} fill={cor} />,
  },
  puff: {
    rotulo: 'Puff',
    atras: ({ m, cor }) => (
      <g fill={cor}>
        <path d={bordaCrespa(50, m.topo - 3, m.larg * 0.55, m.larg * 0.5, 11, 0.06)} />
        {coroaDe(m, 0.26, 1.5, 2)}
      </g>
    ),
    frente: ({ m, cor }) => <path d={linhaRedondaDe(m, 0.19, 1)} fill={cor} />,
  },
  trancas: {
    rotulo: 'Tranças',
    // o comprimento do longo, com divisão no meio e o trançado desenhado por
    // cima das mechas: sem o trançado, era só o longo de novo
    atras: ({ m, cor }) => <path d={silhuetaDe(m)} fill={cor} />,
    frente: ({ m, cor, pele }) => {
      const L = meia(m, 1.5)
      const a = altura(m)
      const T = m.topo
      return (
        <>
          <path
            d={`M${50 - L} ${T + a * 0.34} L${50 - L} ${T + 3} Q${50 - L} ${T - 4} 50 ${T - 4} Q${50 + L} ${T - 4} ${50 + L} ${T + 3} L${50 + L} ${T + a * 0.34} Q${50 + L * 0.35} ${T + a * 0.11} 50 ${T + a * 0.08} Q${50 - L * 0.35} ${T + a * 0.11} ${50 - L} ${T + a * 0.34} Z`}
            fill={cor}
          />
          <path d={`M50 ${T - 3} L50 ${T + a * 0.07}`} stroke={pele} strokeWidth={1.1} strokeLinecap="round" />
        </>
      )
    },
    mechas: true,
    textura: ({ m, sombra }) => {
      const riscos: string[] = []
      for (const s of [-1, 1]) {
        for (let y = m.cy + 2; y < 100; y += 3.4) {
          // acima do queixo o rosto ocupa até `larg`: o risco começa fora dele
          const x1 = 50 + s * (y < m.queixo ? m.larg + 0.6 : m.larg - 1.5)
          const x2 = 50 + s * (m.rx + 3)
          riscos.push(`M${x1} ${y} L${(x1 + x2) / 2} ${y + 1.6} L${x2} ${y}`)
        }
      }
      return <path d={riscos.join(' ')} fill="none" stroke={sombra} strokeWidth={0.8} strokeLinejoin="round" />
    },
  },
}

// -------------------------------------------------------------- acessórios

/**
 * Acessórios são a peça BARATA: vão soltos por cima de tudo, sem encaixe com
 * o cabelo nem com o rosto para errar — o oposto exato do cabelo, que custou
 * três tentativas. O chapéu herda a cor da roupa: uma sétima escolha de cor só
 * para ele seria um controle a mais para quase ninguém.
 *
 * `aba` é o único acordo entre chapéu e cabelo: a linha onde o chapéu pousa.
 * Quem tem `aba` cobre o topo da cabeça, e o corte pode trocar o que mostra
 * embaixo dele (veja `sobChapeu`). Sem esse número, "o boné não encaixa" vira
 * um ajuste à mão por corte, que é o caminho de volta para o `if`.
 */
export const ACESSORIOS: Record<Acessorio, {
  rotulo: string
  teste?: boolean
  aba?: (m: Medidas) => number
  desenhar: (m: Medidas, cor: string, sombra: string) => ReactNode
}> = {
  nenhum: { rotulo: 'Nenhum', desenhar: () => null },
  bone: {
    rotulo: 'Boné',
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
    // a aba ficava em 0.28 da cabeça e, com 5.5 de raio, cobria a
    // sobrancelha — e a sobrancelha é metade da expressão (é ela que fica
    // aflita com o estresse). Em 0.22 ela passa por cima, rente
    aba: (m) => m.topo + altura(m) * 0.22,
    desenhar: (m, cor, sombra) => {
      const L = m.larg
      const a = altura(m)
      const y = m.topo + a * 0.22
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
  headset: {
    rotulo: 'Headset',
    // o fone de call center: arco por cima da cabeça, as duas conchas na
    // altura da orelha e o microfone descendo até a boca. Sem `aba`: ele não
    // cobre o topo, e o cabelo aparece inteiro por baixo do arco. A cor é
    // grafite fixa, como a armação dos óculos — equipamento não veste roupa
    desenhar: (m) => {
      const L = m.larg + 2
      const a = altura(m)
      const y = m.topo + a * 0.55
      const boca = m.topo + a * 0.81
      const cor = '#33302b'
      return (
        <g>
          <path
            d={`M${50 - L} ${y - 2} C${50 - L} ${m.topo - 13} ${50 + L} ${m.topo - 13} ${50 + L} ${y - 2}`}
            fill="none"
            stroke={cor}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <rect x={50 - L - 3.2} y={y - 5.5} width={6} height={11} rx={2.6} fill={cor} />
          <rect x={50 + L - 2.8} y={y - 5.5} width={6} height={11} rx={2.6} fill={cor} />
          <path
            d={`M${50 - L + 1} ${y + 4} Q${50 - L + 2} ${boca + 1} ${50 - 7} ${boca}`}
            fill="none"
            stroke={cor}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle cx={50 - 6.5} cy={boca} r={1.9} fill={cor} />
        </g>
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
 * **Nenhuma linha pergunta gênero.** Até a v0.12 havia um `padrao` com um
 * `if` por corpo — gola em V para o homem, gola fechada para a mulher. Hoje
 * as duas são linhas como qualquer outra, que qualquer rosto escolhe, e
 * `lerAvatar()` dá a cada avatar antigo a gola que ele já tinha. O manequim
 * tem a sua, fora da escolha do jogador.
 */
export interface DesenhoDeTronco {
  m: Medidas
  roupa: string
  pele: string
  sombra: string
  sombraForte: string
}

/** As cores fixas das roupas de trabalho: elas não acompanham a roupa
 *  escolhida porque é a cor que diz o que a peça é. */
const CAMISA_BRANCA = '#e4dfd3'
const JALECO = '#eeebe4'
const COLETE = '#e2782c'
const FAIXA_REFLETIVA = '#d9d8cf'

function pescocoDe(m: Medidas): string {
  return `M${50 - m.pescocoLarg} ${m.queixo - 8} h${m.pescocoLarg * 2} v${m.pescocoAlt} h${-m.pescocoLarg * 2} Z`
}

function troncoDe(m: Medidas, y: number, borda = m.ombroBorda): string {
  const mo = m.meioOmbro
  return `M${mo} 100 C${mo} ${y + 6} ${mo + borda} ${y} 50 ${y} C${100 - mo - borda} ${y} ${100 - mo} ${y + 6} ${100 - mo} 100 Z`
}

export const TRONCOS: Record<Tronco | 'manequim', {
  rotulo: string
  teste?: boolean
  desenhar: (d: DesenhoDeTronco) => ReactNode
}> = {
  manequim: {
    rotulo: 'Manequim',
    // a madeira não veste nada: o tronco é da cor da sombra, e a esfera da
    // articulação é o que diz "boneco de ateliê"
    desenhar: ({ m, pele, sombra }) => (
      <>
        <path d={pescocoDe(m)} fill={sombra} />
        <path d={troncoDe(m, m.ombro)} fill={sombra} />
        <circle cx="50" cy={m.ombro + 1} r="7.5" fill={pele} />
      </>
    ),
  },
  golaV: {
    rotulo: 'Gola V',
    // o pescoço vem ANTES do ombro: é o ombro que o recorta
    desenhar: ({ m, roupa, pele, sombra }) => (
      <>
        <path d={pescocoDe(m)} fill={sombra} />
        <path d={troncoDe(m, m.ombro)} fill={roupa} />
        <path d={`M41 ${m.ombro} L50 ${m.ombro + 12} L59 ${m.ombro} Z`} fill={pele} />
      </>
    ),
  },
  decote: {
    rotulo: 'Decote',
    // um recorte em U na roupa, mostrando o colo: o oposto da gola alta. O
    // colo é da cor da PELE, não da sombra: na sombra ele lia como uma
    // camiseta de baixo de outra cor. A sombra fica com o pescoço, que está
    // debaixo do queixo
    desenhar: ({ m, roupa, pele, sombra }) => (
      <>
        <path d={pescocoDe(m)} fill={sombra} />
        <path d={troncoDe(m, m.ombro)} fill={roupa} />
        <path
          d={`M${50 - 12} ${m.ombro - 1} Q${50 - 11} ${m.ombro + 11} 50 ${m.ombro + 11} Q${50 + 11} ${m.ombro + 11} ${50 + 12} ${m.ombro - 1} Z`}
          fill={pele}
        />
      </>
    ),
  },
  // três roupas de TRABALHO — o jogo é sobre um emprego, e até aqui o
  // guarda-roupa era só camisa lisa
  gravata: {
    rotulo: 'Gravata',
    // camisa branca e a gravata na cor da roupa: é ela que carrega a escolha
    desenhar: ({ m, roupa, sombra }) => {
      const y = m.ombro
      const gola = escurecer(CAMISA_BRANCA, 0.86)
      const noDaGravata = escurecer(roupa, 0.82)
      return (
        <>
          <path d={pescocoDe(m)} fill={sombra} />
          <path d={troncoDe(m, y)} fill={CAMISA_BRANCA} />
          <path d={`M${50 - 9} ${y - 2} L50 ${y + 3} L${50 - 3} ${y + 8} Z`} fill={gola} />
          <path d={`M${50 + 9} ${y - 2} L50 ${y + 3} L${50 + 3} ${y + 8} Z`} fill={gola} />
          <path d={`M${50 - 2.6} ${y + 1.5} L${50 + 2.6} ${y + 1.5} L${50 + 1.8} ${y + 5.5} L${50 - 1.8} ${y + 5.5} Z`} fill={noDaGravata} />
          <path d={`M${50 - 1.8} ${y + 5.5} L${50 + 1.8} ${y + 5.5} L${50 + 4} ${y + 19} L50 ${y + 23} L${50 - 4} ${y + 19} Z`} fill={roupa} />
        </>
      )
    },
  },
  jaleco: {
    rotulo: 'Jaleco',
    // o avental branco por cima, a roupa escolhida aparecendo no V
    desenhar: ({ m, roupa, sombra }) => {
      const y = m.ombro
      const dobra = escurecer(JALECO, 0.84)
      return (
        <>
          <path d={pescocoDe(m)} fill={sombra} />
          <path d={troncoDe(m, y)} fill={JALECO} />
          <path d={`M${50 - 11} ${y - 1} L50 ${y + 15} L${50 + 11} ${y - 1} Z`} fill={roupa} />
          <path
            d={`M${50 - 11} ${y - 1} L50 ${y + 15} L${50 - 4} ${y + 17} L${50 - 15} ${y + 5} Z M${50 + 11} ${y - 1} L50 ${y + 15} L${50 + 4} ${y + 17} L${50 + 15} ${y + 5} Z`}
            fill={JALECO}
            stroke={dobra}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
          <path d={`M${50 + 9} ${y + 17} h7`} stroke={dobra} strokeWidth={0.9} strokeLinecap="round" />
        </>
      )
    },
  },
  colete: {
    rotulo: 'Colete',
    // o colete refletivo de obra e de pátio, por cima da camiseta na cor da
    // roupa. Laranja e faixa prata fixos: um colete de outra cor não é colete
    desenhar: ({ m, roupa, sombra }) => {
      const y = m.ombro
      const mo = m.meioOmbro
      const faixas = [y + 10, y + 16.5]
      return (
        <>
          <path d={pescocoDe(m)} fill={sombra} />
          <path d={troncoDe(m, y)} fill={COLETE} />
          <path d={`M${50 - 6.5} ${y - 0.5} L${50 + 6.5} ${y - 0.5} L${50 + 5} 100 L${50 - 5} 100 Z`} fill={roupa} />
          <path d={`M${50 - 9} ${y - 1.5} Q50 ${y + 6} ${50 + 9} ${y - 1.5} Z`} fill={sombra} />
          {faixas.map((fy) => (
            <g key={fy} fill={FAIXA_REFLETIVA}>
              <rect x={mo + 4} y={fy} width={50 - 6.5 - (mo + 4)} height={2.6} />
              <rect x={50 + 6.5} y={fy} width={50 - 6.5 - (mo + 4)} height={2.6} />
            </g>
          ))}
        </>
      )
    },
  },
  colado: {
    rotulo: 'Sem pescoço',
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
  // `desenho` e `deitado` saíram da receita: em 40px eles eram a amêndoa.
  // Continuam aqui, de teste, para o lab experimentar
  desenho: {
    rotulo: 'Desenho',
    teste: true,
    desenhar: (o) =>
      olhoComIris(o, { rx: 5.8, ry: 4, giro: 16, ix: 1.5, iy: 0.2, irx: 2.4, iry: 3, brilho: 1 }),
  },
  amendoa: {
    rotulo: 'Amêndoa',
    // o menos redondo de todos: largo e baixo. É o olho mais neutro do
    // conjunto, e o melhor candidato a virar o padrão
    desenhar: (o) =>
      olhoComIris(o, { rx: 6.2, ry: 3.5, giro: 11, ix: 1.4, iy: 0.1, irx: 2.3, iry: 2.8, brilho: 0.95 }),
  },
  emPe: {
    rotulo: 'Em pé',
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
    desenhar: (o) =>
      olhoComIris(o, { rx: 4.6, ry: 5.2, ix: 0.8, iy: -0.5, irx: 2.2, iry: 2.8, brilho: 1 }),
  },
  esperto: {
    rotulo: 'De lado',
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

// ------------------------------------------------------------------- barba

/**
 * A barba, como tabela — da família do acessório: vai por cima do rosto, na
 * cor do cabelo, sem encaixe com o corte para errar.
 *
 * A peça que decide se ela encaixa é a MANDÍBULA: a metade de baixo da caixa
 * do rosto, com os mesmos cantos. É a mesma regra do degradê — só encaixa no
 * rosto o que segue os cantos dele —, e é por isso que a barba cheia fecha
 * certinho no queixo quadrado e no redondo sem uma linha por rosto.
 *
 * A boca fica à mostra de dois jeitos: a barba rala é translúcida, e a cheia
 * leva por cima uma elipse da COR DA PELE onde a boca é desenhada depois —
 * o truque da pálpebra do "De lado" de novo, sem recorte nenhum.
 */
export interface DesenhoDeBarba {
  m: Medidas
  cor: string
  pele: string
  /** A linha da boca: a barba se organiza em volta dela. */
  bocaY: number
  /** Para o padrão de pontos da barba por fazer, único por avatar. */
  id: string
}

function mandibulaDe(m: Medidas, lados: number, meio: number, desce = 0): string {
  const { larg: L, queixo: Q, cantoX, cantoY } = m
  const fundo = Q + desce
  return `M${50 - L} ${lados} L${50 - L} ${Q - cantoY} Q${50 - L} ${fundo} ${50 - L + cantoX} ${fundo} L${50 + L - cantoX} ${fundo} Q${50 + L} ${fundo} ${50 + L} ${Q - cantoY} L${50 + L} ${lados} Q50 ${meio} ${50 - L} ${lados} Z`
}

// mais largo e mais grosso do que era: com 12 de largura e 3 de altura ele
// sumia em 32px, e é nesse tamanho que o avatar vive na mesa
function bigodeDe(b: number): string {
  return `M42.5 ${b - 0.8} C43.5 ${b - 5.8} 48.6 ${b - 5.8} 50 ${b - 3.9} C51.4 ${b - 5.8} 56.5 ${b - 5.8} 57.5 ${b - 0.8} Q50 ${b - 2.9} 42.5 ${b - 0.8} Z`
}

export const BARBAS: Record<Barba, {
  rotulo: string
  teste?: boolean
  desenhar: (d: DesenhoDeBarba) => ReactNode
}> = {
  nenhuma: { rotulo: 'Nenhuma', desenhar: () => null },
  rala: {
    rotulo: 'Por fazer',
    // era a cor do cabelo a 24% de opacidade — uma sombra, e sombra só existe
    // quando o cabelo é mais escuro que a pele: em pele escura ela sumia, e
    // branca sobre o ébano virava uma máscara cinza. Barba por fazer é
    // PONTO, então é um padrão de pontos na cor do cabelo por cima de um
    // véu leve. Em 24px os pontos viram o véu, que é o que deve acontecer
    desenhar: ({ m, cor, bocaY, id }) => {
      const d = mandibulaDe(m, m.topo + altura(m) * 0.64, bocaY - 4)
      return (
        <>
          <defs>
            {/* três pontos fora de grade por ladrilho: com dois, alinhados,
                o padrão lia como uma rede na pele clara */}
            <pattern id={`${id}-rala`} width="2.6" height="2.6" patternUnits="userSpaceOnUse">
              <circle cx="0.6" cy="0.8" r="0.36" fill={cor} />
              <circle cx="1.9" cy="0.4" r="0.3" fill={cor} />
              <circle cx="1.4" cy="1.9" r="0.34" fill={cor} />
            </pattern>
          </defs>
          <path d={d} fill={cor} opacity={0.14} />
          <path d={d} fill={`url(#${id}-rala)`} opacity={0.7} />
        </>
      )
    },
  },
  bigode: {
    rotulo: 'Bigode',
    desenhar: ({ cor, bocaY }) => <path d={bigodeDe(bocaY)} fill={cor} />,
  },
  cavanhaque: {
    rotulo: 'Cavanhaque',
    desenhar: ({ m, cor, bocaY: b }) => (
      <g fill={cor}>
        <path d={bigodeDe(b)} />
        <path d={`M46.5 ${b + 3.6} Q50 ${b + 2.6} 53.5 ${b + 3.6} L53 ${m.queixo - 1.5} Q50 ${m.queixo + 1.5} 47 ${m.queixo - 1.5} Z`} />
      </g>
    ),
  },
  cheia: {
    rotulo: 'Cheia',
    desenhar: ({ m, cor, pele, bocaY }) => (
      <>
        {/* desce 3 abaixo do queixo: barba tem volume, e sem isso ela
            pareceria pintada no rosto */}
        <path d={mandibulaDe(m, m.topo + altura(m) * 0.62, bocaY - 4.5, 3)} fill={cor} />
        {/* as costeletas ligam a barba ao cabelo. Sem elas sobrava um vão de
            pele na altura da orelha, e a barba cheia lia como barba de queixo */}
        <rect x={50 - m.larg} y={m.topo + altura(m) * 0.3} width={3.4} height={altura(m) * 0.36} fill={cor} />
        <rect x={50 + m.larg - 3.4} y={m.topo + altura(m) * 0.3} width={3.4} height={altura(m) * 0.36} fill={cor} />
        <ellipse cx="50" cy={bocaY + 1.2} rx="6" ry="2.8" fill={pele} />
      </>
    ),
  },
}

// ------------------------------------------------------------------ óculos

/**
 * Óculos: armação escura FIXA, e não na cor da roupa como o chapéu. Óculos
 * da cor da camisa lê como fantasia; armação escura lê como óculos em
 * qualquer roupa.
 */
export interface DesenhoDeOculos {
  m: Medidas
  /** O centro de cada olho — os óculos se medem pelos olhos, não pelo rosto. */
  olhoX: number
  olhoY: number
  t: number
}

const ARMACAO = '#2b2622'

function lentes(d: DesenhoDeOculos, lente: (x: number) => ReactNode, meia: number): ReactNode {
  const { m, olhoX, olhoY: y } = d
  const e = 50 - olhoX
  const dd = 50 + olhoX
  return (
    <g stroke={ARMACAO} strokeWidth={1.3} strokeLinecap="round">
      {lente(e)}
      {lente(dd)}
      {/* a ponte e as hastes: é a haste chegando na orelha que faz o objeto
          ler como óculos e não como dois círculos soltos */}
      <path d={`M${e + meia} ${y - 0.5} Q50 ${y - 2.5} ${dd - meia} ${y - 0.5}`} fill="none" />
      <path d={`M${e - meia} ${y - 1} L${50 - m.larg} ${y - 1.8}`} fill="none" />
      <path d={`M${dd + meia} ${y - 1} L${50 + m.larg} ${y - 1.8}`} fill="none" />
    </g>
  )
}

export const OCULOS: Record<Oculos, {
  rotulo: string
  teste?: boolean
  desenhar: (d: DesenhoDeOculos) => ReactNode
}> = {
  nenhum: { rotulo: 'Sem óculos', desenhar: () => null },
  redondo: {
    rotulo: 'Redondo',
    desenhar: (d) =>
      lentes(d, (x) => <circle cx={x} cy={d.olhoY} r={5.6 * d.t} fill="#ffffff" fillOpacity={0.16} />, 5.6 * d.t),
  },
  quadrado: {
    rotulo: 'Quadrado',
    desenhar: (d) =>
      lentes(
        d,
        (x) => (
          <rect
            x={x - 6.2 * d.t}
            y={d.olhoY - 4.6 * d.t}
            width={12.4 * d.t}
            height={9.2 * d.t}
            rx={1.8}
            fill="#ffffff"
            fillOpacity={0.16}
          />
        ),
        6.2 * d.t,
      ),
  },
}

// ------------------------------------------------------------------- humor

/**
 * O avatar SENTE o estresse.
 *
 * O jogo inteiro gira em torno de uma conta — `Energia = 10 − Estresse` — que
 * o jogador não via acontecer. O humor põe essa conta na cara do avatar: ele
 * aparece ao lado do nick na mesa e vai cansando junto com o jogador, até a
 * lágrima no 9 (o "Tears" do nome) e os olhos em X no burnout.
 *
 * Nada disto é peça da receita: é uma camada por cima do rosto que a mesa
 * pede. Sem `humor`, o avatar é o de sempre — é o que o perfil e o ranking
 * mostram.
 */
export type Humor = 'tranquilo' | 'cansado' | 'suando' | 'chorando' | 'burnout' | 'vitoria'

/** Uma gota com a ponta para cima, a partir da ponta. */
function gotaDe(x: number, y: number, t: number): string {
  return `M${x} ${y} C${x + 2.2 * t} ${y + 3.4 * t} ${x + 2.1 * t} ${y + 6 * t} ${x} ${y + 6 * t} C${x - 2.1 * t} ${y + 6 * t} ${x - 2.2 * t} ${y + 3.4 * t} ${x} ${y} Z`
}

/** Em FRAÇÕES do estresse máximo, e não em números: um modo de jogo com outro
 *  teto de estresse leva as caras junto. Com o máximo em 10: 0–3 tranquilo,
 *  4–6 cansado, 7–8 suando, 9 chorando, 10 burnout. */
export function humorDoEstresse(estresse: number, maximo: number): Humor {
  if (estresse >= maximo) return 'burnout'
  const f = estresse / maximo
  if (f >= 0.9) return 'chorando'
  if (f >= 0.7) return 'suando'
  if (f >= 0.4) return 'cansado'
  return 'tranquilo'
}

const HUMORES: Record<Humor, {
  /** A curva da boca: positivo sorri, zero é reto, negativo desce. */
  boca: number
  olheira?: boolean
  suor?: boolean
  lagrima?: boolean
  /** Sobrancelha com a ponta de dentro subida: o jeito mais barato de
   *  desenhar preocupação, e o que mais se lê em 24 px. */
  aflito?: boolean
  olhosX?: boolean
  sorriso?: boolean
  /** O fundo do humor, por cima do fundo escolhido. Na mesa o avatar tem
   *  ~24px, e ali olheira e suor não se leem — a COR do fundo se lê: ela
   *  esquenta conforme o estresse sobe. */
  fundo?: string
}> = {
  tranquilo: { boca: 4.5 },
  cansado: { boca: 1.8, olheira: true, fundo: '#ddc9a4' },
  suando: { boca: 0, olheira: true, suor: true, aflito: true, fundo: '#e3b48a' },
  chorando: { boca: -3, olheira: true, lagrima: true, aflito: true, fundo: '#df9a84' },
  burnout: { boca: -1.5, olhosX: true, aflito: true, fundo: '#c9705f' },
  vitoria: { boca: 7, sorriso: true, fundo: '#bcd3a3' },
}

/** Luminância relativa de um `#rrggbb` (WCAG), para comparar cabelo e pele. */
function luminancia(hex: string): number {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/**
 * O crachá no cordão — o objeto que mais diz "carteira assinada". Ele vai por
 * cima de qualquer roupa e não ocupa a cabeça, então convive com chapéu, boné
 * e headset. Cordão vermelho e cartão branco são fixos, como a armação dos
 * óculos: um crachá na cor da camisa sumiria nela.
 */
function crachaDe(m: Medidas, semPescoco: boolean): ReactNode {
  const de = semPescoco ? m.queixo - 2 : m.queixo + 1
  const x = m.pescocoLarg - 0.5
  const y = m.ombro + 7
  return (
    <g>
      <path
        d={`M${50 - x} ${de} L${50 - 2.2} ${y} M${50 + x} ${de} L${50 + 2.2} ${y}`}
        stroke="#b2463a"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <rect x={43.5} y={y} width={13} height={15} rx={1.6} fill="#f6f3ec" stroke="#8d877c" strokeWidth={0.5} />
      <path d={`M43.5 ${y + 3.6} V${y + 1.6} Q43.5 ${y} 45.1 ${y} H54.9 Q56.5 ${y} 56.5 ${y + 1.6} V${y + 3.6} Z`} fill="#3f6f95" />
      <rect x={45.4} y={y + 5.2} width={4.2} height={5} rx={0.6} fill="#c9c2b4" />
      <path d={`M51 ${y + 6.4} h3.8 M51 ${y + 8.6} h2.6`} stroke="#a39d91" strokeWidth={0.8} strokeLinecap="round" />
    </g>
  )
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
  /** Uma camada POR CIMA da receita, para o lab experimentar uma peça sem
   *  mexer no avatar. Desde a v0.13 as peças daqui também existem na receita;
   *  a camada continua para as peças futuras nascerem no lab antes do jogo. */
  teste?: {
    cabelo?: FormaDeCabelo
    acessorio?: Acessorio
    olhos?: Olhos
    tronco?: Tronco
    barba?: Barba
    oculos?: Oculos
  }
}

export default function Avatar({
  avatar,
  tamanho = 96,
  className,
  ajustes,
  humor,
}: {
  avatar: Receita
  tamanho?: number
  className?: string
  /** Dev-only: usado pelo `/lab/avatar` para experimentar. */
  ajustes?: Ajustes
  /** A cara do momento — a mesa passa o do estresse. Sem ele, o de sempre. */
  humor?: Humor
}) {
  // o degradê precisa de um id de gradiente, e o perfil desenha vários
  // avatares na mesma página: com id repetido, todos seriam pintados com a
  // cor do primeiro. Os dois-pontos do useId não sobrevivem a um `url(#...)`
  const id = `deg-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const manequim = avatar.rosto === 'manequim'
  const peleBase = manequim ? MADEIRA : TONS_DE_PELE[avatar.pele]
  const [p, ps, pss] = ajustes?.cores?.pele
    ? [ajustes.cores.pele, escurecer(ajustes.cores.pele, 0.88), escurecer(ajustes.cores.pele, 0.74)]
    : peleBase
  const [cBase, csBase] = TONS_DE_CABELO[avatar.cor]
  const c = ajustes?.cores?.cabelo ?? cBase
  const cs = ajustes?.cores?.cabelo ? escurecer(ajustes.cores.cabelo, 0.75) : csBase
  const roupa = ajustes?.cores?.roupa ?? TONS_DE_ROUPA[avatar.roupa]
  const fundo = ajustes?.cores?.fundo ?? TONS_DE_FUNDO[avatar.fundo]
  // o chapéu herda a roupa, um pouco mais escuro: da mesma cor, ele some na
  // camisa; de outra cor, ele vira uma escolha a mais que ninguém pediu
  const corAcessorio = ajustes?.cores?.acessorio ?? escurecer(roupa, 0.85)
  const m = { ...MEDIDAS[avatar.rosto], ...ajustes?.medidas }
  const { larg, topo, queixo, cantoY, cantoX } = m
  const alt = queixo - topo

  // o manequim não veste nada nem tem rosto: é justamente o que diz "ainda
  // não escolhi", e óculos ou chapéu nele seria fingir uma pessoa
  const forma = CABELOS_FORMA[ajustes?.teste?.cabelo ?? avatar.cabelo] ?? CABELOS_FORMA.curto
  const acessorio = manequim
    ? ACESSORIOS.nenhum
    : (ACESSORIOS[ajustes?.teste?.acessorio ?? avatar.acessorio] ?? ACESSORIOS.nenhum)
  const olhos = OLHOS[ajustes?.teste?.olhos ?? avatar.olhos] ?? OLHOS.amendoa
  const tronco = manequim
    ? TRONCOS.manequim
    : (TRONCOS[ajustes?.teste?.tronco ?? avatar.tronco] ?? TRONCOS.colado)
  const barba = BARBAS[ajustes?.teste?.barba ?? avatar.barba] ?? BARBAS.nenhuma
  const oculos = OCULOS[ajustes?.teste?.oculos ?? avatar.oculos] ?? OCULOS.nenhum
  const cara = humor ? HUMORES[humor] : undefined

  const chapeuY = acessorio.aba?.(m)
  const cabelo: DesenhoDeCabelo = { m, cor: c, sombra: cs, pele: p, id }
  // com chapéu, TODO o cabelo é recortado da aba para baixo: embaixo do boné
  // o corte continua aparecendo (é isso que faz o boné parecer vestido e não
  // colado), e o que passaria por cima da copa simplesmente não existe
  const recorteDoChapeu = chapeuY !== undefined ? `url(#${id}-chapeu)` : undefined
  const atrasDoCabelo = forma.atras(cabelo)
  const frenteDoCabelo = forma.frente(cabelo)
  const corDaBarba =
    avatar.corBarba && avatar.corBarba !== 'cabelo' ? TONS_DE_CABELO[avatar.corBarba][0] : c

  // CONTRASTE. Dez das 49 combinações de cabelo e pele ficavam abaixo de
  // 1,35:1 (mel em canela é 1,01:1): o corte sumia no rosto e a cabeça virava
  // uma mancha só. Nesses casos — e só neles, para o resto continuar chapado
  // como sempre foi — o cabelo ganha um contorno, e o rosto também. A cor do
  // contorno sai do MAIS ESCURO dos dois, para ela se separar dos dois
  const contrasteBaixo = !manequim && contraste(c, p) < 1.45
  const barbaBaixa = !manequim && avatar.barba !== 'rala' && contraste(corDaBarba, p) < 1.45
  const contorno = escurecer(luminancia(c) < luminancia(p) ? c : p, 0.55)
  const filtroContorno = `url(#${id}-contorno)`
  const rostoD = `M${50 - larg} ${topo + cantoY} Q${50 - larg} ${topo} ${50 - larg + cantoX} ${topo} L${50 + larg - cantoX} ${topo} Q${50 + larg} ${topo} ${50 + larg} ${topo + cantoY} L${50 + larg} ${queixo - cantoY} Q${50 + larg} ${queixo} ${50 + larg - cantoX} ${queixo} L${50 - larg + cantoX} ${queixo} Q${50 - larg} ${queixo} ${50 - larg} ${queixo - cantoY} Z`

  // em 32px ou menos a figura ocupava metade do quadrado, e o resto era
  // fundo e ombro. Ali o desenho se aproxima da cabeça
  const caixa = tamanho <= 32 ? '8 0 84 84' : '0 0 100 100'
  const fundoDoHumor = cara?.fundo ?? fundo

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
      style={{ background: fundoDoHumor, width: tamanho, height: tamanho }}
    >
      <svg width={tamanho} height={tamanho} viewBox={caixa} role="img" aria-label="Avatar">
        <defs>
          {chapeuY !== undefined ? (
            <clipPath id={`${id}-chapeu`}>
              <rect x={-20} y={chapeuY} width={140} height={140} />
            </clipPath>
          ) : null}
          {contrasteBaixo || barbaBaixa ? (
            <>
              {/* o contorno da barba: a peça engrossada, na cor do contorno,
                  com a peça por cima */}
              <filter id={`${id}-contorno`} x="-20%" y="-20%" width="140%" height="140%">
                <feMorphology in="SourceAlpha" operator="dilate" radius={0.9} result="grosso" />
                <feFlood floodColor={contorno} />
                <feComposite in2="grosso" operator="in" result="borda" />
                <feMerge>
                  <feMergeNode in="borda" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* o do cabelo: SÓ a peça engrossada, sem ela por cima. Ela é
                  desenhada depois, normal, e o que sobra é o anel */}
              <filter id={`${id}-anel`} x="-20%" y="-20%" width="140%" height="140%">
                <feMorphology in="SourceAlpha" operator="dilate" radius={0.9} result="grosso" />
                <feFlood floodColor={contorno} />
                <feComposite in2="grosso" operator="in" />
              </filter>
              <clipPath id={`${id}-rosto`}>
                <path d={rostoD} />
              </clipPath>
            </>
          ) : null}
        </defs>

        {/* 1. cabelo de trás, atrás de tudo */}
        <g transform={escalar}>
          <g clipPath={recorteDoChapeu}>
            {manequim ? null : ajustes?.pecas?.silhueta ? (
              <path d={ajustes.pecas.silhueta} fill={c} />
            ) : (
              atrasDoCabelo
            )}
          </g>
        </g>

        {/* 2. pescoço, tronco e gola — os três juntos, porque se recortam */}
        {tronco.desenhar({ m, roupa, pele: p, sombra: ps, sombraForte: pss })}

        {/* 2b. o crachá no cordão, por cima da roupa */}
        {avatar.cracha && !manequim ? crachaDe(m, tronco === TRONCOS.colado) : null}

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

          {/* 4. rosto. Com contraste baixo ele ganha a borda: é ela que separa
                 o rosto do cabelo de TRÁS, que fica em volta dele */}
          <path
            d={rostoD}
            fill={p}
            stroke={contrasteBaixo ? contorno : undefined}
            strokeWidth={contrasteBaixo ? 0.9 : undefined}
          />

          {/* 5 e 6. cabelo da frente e mechas, num grupo só, com o recorte do
                 chapéu valendo para todos. O contorno de baixo contraste é uma
                 camada ANTES, recortada pelo rosto: contornando a peça
                 inteira, o anel aparecia também onde a franja passa por cima
                 do cabelo de trás — uma tiara dentro do black power. Recortado
                 pelo rosto, sobra só a linha do cabelo, que é onde o contraste
                 faltava */}
          <g clipPath={recorteDoChapeu}>
            {contrasteBaixo && !ajustes?.pecas?.franja ? (
              <g clipPath={`url(#${id}-rosto)`}>
                <g filter={`url(#${id}-anel)`}>
                  {frenteDoCabelo}
                  {forma.mechas ? [-1, 1].map((s) => <path key={s} d={mechaDe(m, s)} fill={c} />) : null}
                </g>
              </g>
            ) : null}
            {manequim ? null : ajustes?.pecas?.franja ? (
              <path d={ajustes.pecas.franja} fill={c} />
            ) : (
              frenteDoCabelo
            )}

            {/* mechas da frente, para o comprimento não sumir atrás do ombro */}
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
            {forma.textura && !manequim ? forma.textura(cabelo) : null}
          </g>

          {/* 7. barba, ANTES das feições: o nariz e a boca vêm por cima dela */}
          {manequim ? null : (
            <g filter={barbaBaixa ? filtroContorno : undefined}>
              {barba.desenhar({ m, cor: corDaBarba, pele: p, bocaY, id })}
            </g>
          )}

          {/* 8. rosto: sobrancelha, olho, nariz, boca. O manequim não tem
                 nenhum deles — é justamente a cara vazia que diz "ainda não
                 escolhi". */}
          {manequim ? null : (
            <>
              {[-1, 1].map((s) => {
                const x = 50 + s * olhoX
                return (
                  <g key={s}>
                    <rect
                      x={x - sl / 2}
                      y={sobY}
                      width={sl}
                      height={m.sobrancelha}
                      rx={m.sobrancelha / 2}
                      fill={cs}
                      // aflito: a ponta de DENTRO sobe. Em SVG o giro positivo é
                      // horário, e o lado de dentro de cada olho é o oposto do
                      // seu `s` — por isso o ângulo tem o sinal do próprio lado
                      transform={cara?.aflito ? `rotate(${12 * s} ${x} ${sobY + m.sobrancelha / 2})` : undefined}
                    />
                    {cara?.olhosX ? (
                      <path
                        d={`M${x - 3.2} ${olhoY - 3.2} L${x + 3.2} ${olhoY + 3.2} M${x + 3.2} ${olhoY - 3.2} L${x - 3.2} ${olhoY + 3.2}`}
                        stroke="#241f1b"
                        strokeWidth={1.9}
                        strokeLinecap="round"
                      />
                    ) : (
                      (cara?.sorriso ? OLHOS.feliz : olhos).desenhar({
                        x,
                        y: olhoY,
                        t: m.olho,
                        cor: ajustes?.cores?.olho ?? '#4a3524',
                        lado: s,
                        pele: p,
                        sombra: ps,
                      })
                    )}
                    {cara?.olheira ? (
                      // um degrau mais escura que a sombra da pele: na sombra
                      // pura ela sumia nas peles escuras, onde a sombra já
                      // é quase a cor do rosto
                      <path
                        d={`M${x - 4 * m.olho} ${olhoY + 4.2 * m.olho} Q${x} ${olhoY + 6.6 * m.olho} ${x + 4 * m.olho} ${olhoY + 4.2 * m.olho}`}
                        fill="none"
                        stroke={escurecer(pss, 0.7)}
                        strokeWidth={1.3}
                        strokeLinecap="round"
                        opacity={0.75}
                      />
                    ) : null}
                  </g>
                )
              })}
              <path
                d={`M50 ${narizY} q${3.2 * m.nariz} ${5 * m.nariz} 0 ${5.6 * m.nariz} q${-3.2 * m.nariz} ${-0.6 * m.nariz} 0 ${-5.6 * m.nariz} Z`}
                fill={pss}
              />
              {cara?.sorriso ? (
                // a vitória é a única boca aberta do jogo, e é isso que a faz
                // ler como alegria em 24 px — uma curva mais funda não bastaria
                <path d={`M44 ${bocaY - 0.5} Q50 ${bocaY + 9} 56 ${bocaY - 0.5} Z`} fill={pss} />
              ) : (
                <path
                  d={`M44.5 ${bocaY} Q50 ${bocaY + (cara?.boca ?? 4.5)} 55.5 ${bocaY}`}
                  fill="none"
                  stroke={pss}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}

              {/* 9. óculos, por cima dos olhos */}
              {oculos.desenhar({ m, olhoX, olhoY, t: m.olho })}

              {/* 10. o que o estresse deixa no rosto, por cima de tudo que é
                      rosto — mas embaixo do chapéu, que é roupa */}
              {cara?.suor ? (
                <path
                  d={gotaDe(50 + larg - 5, topo + alt * 0.3, 1)}
                  fill="#bfe3f2"
                  stroke="#8cbfd8"
                  strokeWidth={0.6}
                />
              ) : null}
              {cara?.lagrima ? (
                <path d={gotaDe(50 - olhoX + 1.5, olhoY + 4.5, 0.95)} fill="#9fd3ee" />
              ) : null}
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

          {/* 11. acessório, por cima de tudo — é o que o torna barato */}
          {acessorio.desenhar(m, corAcessorio, escurecer(corAcessorio, 0.72))}
        </g>
      </svg>
    </span>
  )
}
