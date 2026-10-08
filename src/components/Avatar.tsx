'use client'

import { useId, type ReactNode } from 'react'
import type {
  Acessorio,
  Avatar as Receita,
  Barba,
  CorCabelo,
  CorDoChapeu,
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

/** As cores de boné e chapéu — mais vivas que as de roupa, de propósito. */
export const TONS_DE_CHAPEU: Record<Exclude<CorDoChapeu, 'roupa'>, string> = {
  roxo: '#7d5aa8',
  vermelho: '#b5443a',
  azul: '#3d6a9e',
  verde: '#4d8552',
  amarelo: '#d6a838',
  preto: '#2e2b28',
  branco: '#e9e5dc',
}

/** A cor do boné como o editor mostra na amostra: "a da roupa" é a roupa um
 *  pouco mais escura, igual ao desenho. */
export function corDoChapeu(cor: CorDoChapeu, roupa: CorRoupa): string {
  return cor === 'roupa' ? escurecer(TONS_DE_ROUPA[roupa], 0.85) : TONS_DE_CHAPEU[cor]
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

/** Mistura um `#rrggbb` com branco: `fator` 0 é a cor, 1 é branco. */
export function clarear(hex: string, fator: number): string {
  const n = hex.replace('#', '')
  if (n.length !== 6) return hex
  const p = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16)
    return Math.round(v + (255 - v) * fator).toString(16).padStart(2, '0')
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
/** O contorno do rosto: a caixa com os quatro cantos arredondados. */
function rostoDe(m: Medidas): string {
  const { larg, topo, queixo, cantoY, cantoX } = m
  return `M${50 - larg} ${topo + cantoY} Q${50 - larg} ${topo} ${50 - larg + cantoX} ${topo} L${50 + larg - cantoX} ${topo} Q${50 + larg} ${topo} ${50 + larg} ${topo + cantoY} L${50 + larg} ${queixo - cantoY} Q${50 + larg} ${queixo} ${50 + larg - cantoX} ${queixo} L${50 - larg + cantoX} ${queixo} Q${50 - larg} ${queixo} ${50 - larg} ${queixo - cantoY} Z`
}

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
  /** O cabelo tem COMPRIMENTO abaixo da cabeça. É o único que continua
   *  aparecendo embaixo do boné e do chapéu — veja o componente. */
  comprido?: boolean
}

// Boné e chapéu SOMEM com o cabelo, como no Duolingo. Já houve um
// `sobChapeu` por corte, e depois o cabelo inteiro recortado da aba para
// baixo — e o que sobrava embaixo da aba (franja, laterais, pontas) brigava
// com ela em quase todo corte. Hoje o chapéu cobre a cabeça e embaixo dele é
// testa; só os cortes `comprido` mostram o comprimento, recortado da aba para
// baixo, porque sem ele o cabelo comprido viraria careca de boné.

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
 * O TOPO do cabelo: a caixa da cabeça com folga e cantos bem redondos, de
 * têmpora a têmpora. Devolve só o trecho de cima, começando na lateral
 * esquerda em `yEsq` e terminando na direita em `yDir` — quem chama fecha o
 * resto (a nuca, ou a linha do cabelo na testa).
 *
 * **A peça de trás e a da frente usam ESTE MESMO trecho.** O chanel tinha uma
 * franja de cantos retos sobre uma silhueta de cantos redondos, e os cantos
 * da franja saíam por cima como duas pontas. Com o mesmo topo, as duas peças
 * coincidem na borda e não há canto para sobrar.
 */
function capaDe(m: Medidas, folga: number, sobe: number, yEsq: number, yDir: number): string {
  const L = meia(m, folga)
  const T = m.topo - sobe
  const r = L * 0.62
  return `M${50 - L} ${yEsq} L${50 - L} ${T + r} Q${50 - L} ${T} ${50 - L + r} ${T} L${50 + L - r} ${T} Q${50 + L} ${T} ${50 + L} ${T + r} L${50 + L} ${yDir}`
}

/** Onde a lateral do cabelo curto acaba: perto da orelha, por cima da metade
 *  de cima dela. As laterais já terminaram retas na altura da têmpora, e a
 *  quina lia como peruca encaixada na cabeça. */
function fimDoLado(m: Medidas): number {
  return m.topo + altura(m) * 0.55 - Math.max(m.orelha, 3) * 0.45
}

/**
 * O cabelo curto inteiro numa peça só, como no Duolingo: a capa por cima da
 * cabeça, as LATERAIS descendo rente ao rosto até a orelha — afinando numa
 * ponta, e não cortadas retas —, e a linha do cabelo na testa, que é o que
 * mais muda de um corte para outro. Não há peça de trás: a capa já passa da
 * cabeça pelos lados (`folga`), e o resto ficaria escondido atrás do rosto.
 *
 * A testa é o recorte entre as duas laterais (`lado` é a largura delas por
 * DENTRO do rosto), na altura `testa` — e a testa grande que se via em quase
 * todo corte era essa altura: a linha do cabelo ficava em 0,1 da cabeça, e a
 * sobrancelha em 0,37.
 */
interface Capacete {
  /** Quanto a capa passa da cabeça dos lados, e quanto sobe por cima. */
  folga: number
  sobe: number
  /** A largura de cada lateral, medida por dentro do rosto. */
  lado: number
  /** A linha do cabelo nas têmporas, em fração da cabeça. */
  testa: number
  /** O canto da testa. */
  raio?: number
  /** O contorno de cima, saindo de (50 − Lo, fim do lado) e chegando em
   *  (50 + Lo, qualquer y): só os comandos, sem o `M`. */
  copa?: (Lo: number) => string
  /** A linha do cabelo, de (50 + Li, yT + raio) até (50 − Li, yT + raio). */
  linha?: (Li: number, yT: number, raio: number) => string
}

function capaceteDe(m: Medidas, c: Capacete): string {
  const T = m.topo
  const Lo = m.larg + c.folga
  const Li = m.larg - c.lado
  const yT = T + altura(m) * c.testa
  const R = c.raio ?? 5
  const ate = fimDoLado(m)
  // a ponta da lateral: a borda de dentro faz a curva até a de fora, e o
  // cabelo termina afinando em vez de numa quina
  const k = c.lado * 1.8
  const Tc = T - c.sobe
  const r = Lo * 0.62
  const copa = c.copa
    ? c.copa(Lo)
    : `L${50 - Lo} ${Tc + r} Q${50 - Lo} ${Tc} ${50 - Lo + r} ${Tc} L${50 + Lo - r} ${Tc} Q${50 + Lo} ${Tc} ${50 + Lo} ${Tc + r}`
  const linha = c.linha
    ? c.linha(Li, yT, R)
    : `Q${50 + Li} ${yT} ${50 + Li - R} ${yT} L${50 - Li + R} ${yT} Q${50 - Li} ${yT} ${50 - Li} ${yT + R}`
  return `M${50 - Lo} ${ate} ${copa} L${50 + Lo} ${ate} Q${50 + Li} ${ate - k * 0.1} ${50 + Li} ${ate - k} L${50 + Li} ${yT + R} ${linha} L${50 - Li} ${ate - k} Q${50 - Li} ${ate - k * 0.1} ${50 - Lo} ${ate} Z`
}

/**
 * Um cabelo cujas laterais SOMEM na pele — o fade de máquina. Tudo fica dentro
 * do rosto (recortado por ele) e é pintado com um gradiente de cima para
 * baixo: cabelo inteiro até `de`, nada na altura da orelha.
 *
 * As versões anteriores esmaeciam de LADO (o gradiente ia da borda do rosto
 * para dentro), e o que se via era uma mancha translúcida na têmpora — a
 * pálpebra do "De lado", pintada de pele por cima, mostrava a diferença.
 * Aqui a lateral é estreita e de cor cheia, e só o COMPRIMENTO esmaece.
 */
function esmaecido(d: DesenhoDeCabelo, forma: string, de: number): ReactNode {
  const ate = fimDoLado(d.m)
  return (
    <>
      <defs>
        <linearGradient id={`${d.id}-fade`} gradientUnits="userSpaceOnUse" x1="0" y1={de} x2="0" y2={ate}>
          <stop offset="0" stopColor={d.cor} />
          <stop offset="0.45" stopColor={d.cor} stopOpacity="0.72" />
          <stop offset="1" stopColor={d.cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={forma} fill={`url(#${d.id}-fade)`} clipPath={`url(#${d.id}-rosto)`} />
      {/* o recorte pelo rosto deixava um fio de pele na borda de cima, que é
          o antisserrilhado do rosto aparecendo em volta do cabelo. O contorno
          do rosto no mesmo gradiente cobre o fio — e some sozinho embaixo,
          onde o gradiente já é transparente */}
      <path d={rostoDe(d.m)} fill="none" stroke={`url(#${d.id}-fade)`} strokeWidth={1.2} />
    </>
  )
}

/** O topo dos cortes esmaecidos: um retângulo acima da cabeça, que o recorte
 *  pelo rosto arredonda nos cantos DELE. Com a capa redonda de sempre, o
 *  canto da capa era mais redondo que o do rosto quadrado, e sobrava uma
 *  lasca de pele no canto. */
function copaQuadrada(m: Medidas): (Lo: number) => string {
  return (Lo) => `L${50 - Lo} ${m.topo - 2} L${50 + Lo} ${m.topo - 2}`
}

interface PontoDaBorda {
  x: number
  y: number
  /** A normal para FORA da cabeça. */
  nx: number
  ny: number
  /** A tangente, no sentido da esquerda para a direita. */
  tx: number
  ty: number
}

/**
 * O contorno de CIMA do rosto como função de `u`: 0 é o começo do canto
 * esquerdo, 1 o fim do canto direito. É o que deixa uma borda de cabelo
 * (as pontas do espetado) seguir a cabeça — com os cantos dela — em vez de
 * uma elipse solta, que foi o erro de todos os cortes antigos.
 */
function contornoDeCima(m: Medidas): (u: number) => PontoDaBorda {
  const { larg: L, topo: T, cantoX: cx, cantoY: cy } = m
  const q = (a: number[], b: number[], c: number[], t: number) => [
    (1 - t) ** 2 * a[0] + 2 * t * (1 - t) * b[0] + t * t * c[0],
    (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * b[1] + t * t * c[1],
  ]
  const pts: number[][] = [[50 - L, T + cy]]
  for (let i = 1; i <= 24; i += 1) pts.push(q([50 - L, T + cy], [50 - L, T], [50 - L + cx, T], i / 24))
  for (let i = 1; i <= 24; i += 1) pts.push([50 - L + cx + ((2 * L - 2 * cx) * i) / 24, T])
  for (let i = 1; i <= 24; i += 1) pts.push(q([50 + L - cx, T], [50 + L, T], [50 + L, T + cy], i / 24))
  const acc = [0]
  for (let i = 1; i < pts.length; i += 1) {
    acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  }
  const total = acc[acc.length - 1]
  return (u) => {
    const s = Math.max(0, Math.min(1, u)) * total
    let i = 1
    while (i < acc.length - 1 && acc[i] < s) i += 1
    const f = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1)
    const dx = pts[i][0] - pts[i - 1][0]
    const dy = pts[i][1] - pts[i - 1][1]
    const n = Math.hypot(dx, dy) || 1
    return {
      x: pts[i - 1][0] + dx * f,
      y: pts[i - 1][1] + dy * f,
      tx: dx / n,
      ty: dy / n,
      nx: dy / n,
      ny: -dx / n,
    }
  }
}

/**
 * As pontas do espetado. As tentativas anteriores foram ondas (liam como
 * chama), pontas de alturas parecidas sobre uma elipse (coroa de rei) e tufos
 * tombando para fora (penacho). O espetado de desenho — o do Duolingo — é uma
 * fileira de pontas curtas e quase iguais em volta da CABEÇA, todas
 * penteadas para o mesmo lado, e a testa recortada em dentes. Quem lê
 * "espetado" é a repetição, não a altura.
 */
const PONTAS = [3.6, 5.2, 6.4, 6.8, 6.8, 6.4, 5.6, 4.4, 3.2]

function pontasDe(m: Medidas, yT: number): string {
  const borda = contornoDeCima(m)
  // as pontas começam na altura da linha do cabelo: no rosto redondo o canto
  // desce até a metade da testa, e a ponta de baixo ficaria na parte que
  // esmaece
  let u0 = 0
  while (u0 < 0.45 && borda(u0).y > yT + 1) u0 += 0.005
  const u1 = 1 - u0
  const n = PONTAS.length
  const base = (i: number) => borda(u0 + ((u1 - u0) * i) / n)
  const p0 = base(0)
  let d = `M${(p0.x - p0.nx * 2).toFixed(2)} ${(p0.y - p0.ny * 2).toFixed(2)} L${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`
  PONTAS.forEach((h, i) => {
    const meio = borda(u0 + ((u1 - u0) * (i + 0.5)) / n)
    const fim = base(i + 1)
    // penteadas para a direita: a ponta anda pela tangente além da normal
    const px = meio.x + meio.nx * h + meio.tx * 1.8
    const py = meio.y + meio.ny * h + meio.ty * 1.8
    d += ` L${px.toFixed(2)} ${py.toFixed(2)} L${fim.x.toFixed(2)} ${fim.y.toFixed(2)}`
  })
  const pn = base(n)
  // o fechamento passa por DENTRO da cabeça, na parte que já é cabelo
  return `${d} L${(pn.x - pn.nx * 2).toFixed(2)} ${(pn.y - pn.ny * 2).toFixed(2)} L50 ${m.topo + 4} Z`
}

/** A testa do espetado: dentes caindo, inclinados para o mesmo lado das
 *  pontas de cima. */
function linhaEmDentes(Li: number, yT: number): string {
  const n = 5
  let d = ''
  for (let i = 0; i < n; i += 1) {
    const x0 = 50 + Li - (2 * Li * i) / n
    const x1 = 50 + Li - (2 * Li * (i + 1)) / n
    const fundo = yT + (i % 2 === 0 ? 4.4 : 3.6)
    d += ` L${(x0 + x1) / 2 + 1} ${fundo} L${x1} ${i === n - 1 ? yT + 1 : yT - 0.6}`
  }
  return d
}

/**
 * O cacheado: uma massa de cabelo com borda de cachos, MAIS os cachos
 * desenhados por dentro. Sem os cachos de dentro ele era uma touca ondulada;
 * e a borda sozinha, grande, era o black power. O tamanho é o que separa os
 * dois: o cacheado abraça a cabeça, o black power a dobra.
 */
function cacheadoForma(m: Medidas) {
  const a = altura(m)
  return { cx: 50, cy: m.topo + a * 0.2, rx: m.larg + 4.5, ry: a * 0.33, n: 13, onda: 0.07 }
}

/** A linha do cabelo do cacheado: cachos redondos caindo na testa. */
function franjaDeCachosDe(m: Medidas): string {
  const f = cacheadoForma(m)
  const a = altura(m)
  const L = m.larg + 1.5
  const y = m.topo + a * 0.22
  const n = 5
  // o topo é o mesmo arco crespo da massa de trás, só a metade de cima
  let d = arcoCrespo(f.cx, f.cy, f.rx, f.ry, f.n, f.onda)
  d += ` L${50 + L} ${y}`
  // cinco cachos na testa, cada um uma meia-lua para baixo, subindo no meio
  for (let i = 1; i <= n; i += 1) {
    const x = 50 + L - (2 * L * i) / n
    const xm = 50 + L - (2 * L * (i - 0.5)) / n
    const sobe = Math.sin((Math.PI * (i - 0.5)) / n) * a * 0.07
    d += ` Q${xm} ${y - sobe + 6} ${x} ${y - Math.sin((Math.PI * i) / n) * a * 0.07}`
  }
  return `${d} L${f.cx - f.rx} ${f.cy} Z`
}

/** A metade de CIMA de uma borda crespa, da esquerda para a direita, com as
 *  ondas exatamente nos mesmos lugares da forma inteira. */
function arcoCrespo(cx: number, cy: number, rx: number, ry: number, n: number, onda: number): string {
  const ponto = (t: number, k = 1) => [cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]
  const passos = Math.round(n / 2)
  let d = ''
  for (let i = 0; i <= passos; i += 1) {
    const t = Math.PI + (i / passos) * Math.PI
    const [x, y] = ponto(t)
    if (i === 0) {
      d = `M${x.toFixed(2)} ${y.toFixed(2)}`
      continue
    }
    const [qx, qy] = ponto(t - Math.PI / (2 * passos), 1 + onda * 2)
    d += ` Q${qx.toFixed(2)} ${qy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d
}

/** Um cacho em C: três quartos de volta, com a abertura girando de um cacho
 *  para o outro — todos abertos para o mesmo lado liam como escama. */
function cachoDe(x: number, y: number, r: number, i: number): string {
  const abre = (i * 2.3) % (Math.PI * 2)
  const a0 = abre + 0.75
  const a1 = abre + Math.PI * 2 - 0.75
  const p = (a: number) => `${(x + Math.cos(a) * r).toFixed(2)} ${(y + Math.sin(a) * r).toFixed(2)}`
  return `M${p(a0)} A${r} ${r} 0 1 1 ${p(a1)}`
}

/**
 * Os cachos de dentro, na cor da sombra do cabelo. Eram seis, e o cacheado
 * continuava lendo como cabelo ondulado: são os Cs que dizem "cacho". Eles se
 * espalham em dois anéis pela massa de cabelo, e só onde ela é cabelo — a
 * textura é desenhada por cima de tudo, e um C caindo dentro do rosto viraria
 * uma marca na pele.
 */
function cachinhosDe(m: Medidas): string {
  const f = cacheadoForma(m)
  const a = altura(m)
  const pontos: number[][] = []
  for (let i = 0; i <= 8; i += 1) {
    const t = Math.PI * (1.03 + (0.94 * i) / 8)
    pontos.push([f.cx + Math.cos(t) * f.rx * 0.8, f.cy + Math.sin(t) * f.ry * 0.74])
  }
  for (let i = 0; i <= 4; i += 1) {
    const t = Math.PI * (1.22 + (0.56 * i) / 4)
    pontos.push([f.cx + Math.cos(t) * f.rx * 0.44, f.cy + Math.sin(t) * f.ry * 0.4])
  }
  for (const s of [-1, 1]) pontos.push([50 + s * (m.larg + 2.4), f.cy + 1.5])
  const ehCabelo = ([x, y]: number[]) => {
    const fora = Math.abs(x - 50)
    if (fora > m.larg + 1) return true
    return y < m.topo + a * (fora > m.larg * 0.7 ? 0.19 : 0.15)
  }
  return pontos
    .filter(ehCabelo)
    .map(([x, y], i) => cachoDe(x, y, 1.75, i))
    .join(' ')
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
 *
 * `meio` é o ponto de controle do arco no centro da testa. Ele ficava em 0,05
 * da cabeça, e com ele a testa do puff e do black power ia quase até o topo.
 */
function linhaRedondaDe(m: Medidas, k: number, folga = 1, ondas = 7, meioK = 0.15): string {
  const L = meia(m, folga)
  const y = m.topo + altura(m) * k
  const T = m.topo
  const meio = T + altura(m) * meioK
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
 * A franja do curto: três mechas caindo na testa, de tamanhos diferentes,
 * penteadas para o mesmo lado. Borda lisa e uniforme é aba de TOUCA; o que
 * diz "cabelo" num corte curto é a franja quebrada.
 */
function franjaDeMechas(m: Medidas): (Li: number) => string {
  const a = altura(m)
  const T = m.topo
  const L = m.larg
  const y = (k: number) => (T + a * k).toFixed(2)
  return (Li) =>
    ` Q${50 + L * 0.74} ${y(0.22)} ${50 + L * 0.5} ${y(0.24)} Q${50 + L * 0.42} ${y(0.17)} ${50 + L * 0.28} ${y(0.14)} Q${50 + L * 0.08} ${y(0.2)} ${50 - L * 0.12} ${y(0.23)} Q${50 - L * 0.16} ${y(0.16)} ${50 - L * 0.32} ${y(0.13)} Q${50 - L * 0.52} ${y(0.21)} ${50 - L * 0.66} ${y(0.27)} Q${50 - Li - 0.5} ${y(0.28)} ${50 - Li} ${y(0.3)}`
}

/**
 * O topete, no desenho do Duolingo: a capa sobe de um lado numa onda alta,
 * passa do meio e termina num gancho virado para a direita — é o gancho que
 * diz "penteado para cima e para trás". A testa é um arco liso: o topete é o
 * corte de testa LIMPA, e a linha de cabelo com franja o confundiria com o
 * curto. A versão anterior marcava o sentido com um traço por dentro, e em
 * 32px ele virava sujeira.
 */
function topeteDe(m: Medidas): string {
  const L = m.larg
  const T = m.topo
  return capaceteDe(m, {
    folga: 1.5,
    sobe: 0,
    lado: 3.4,
    testa: 0.21,
    raio: 6,
    copa: (Lo) =>
      `L${50 - Lo} ${T + 5} C${50 - Lo} ${T - 4.5} ${50 - L * 0.62} ${T - 10} ${50 - L * 0.06} ${T - 10.4} C${50 + L * 0.38} ${T - 10.8} ${50 + L * 0.68} ${T - 8.4} ${50 + L * 0.72} ${T - 4.8} Q${50 + L * 0.64} ${T - 3} ${50 + L * 0.48} ${T - 2.8} C${50 + L * 0.84} ${T - 3.4} ${50 + Lo} ${T - 1} ${50 + Lo} ${T + 6}`,
    linha: (Li, yT, R) =>
      `Q${50 + Li} ${yT} ${50 + Li - R} ${yT} Q50 ${yT - 2.6} ${50 - Li + R} ${yT} Q${50 - Li} ${yT} ${50 - Li} ${yT + R}`,
  })
}

export const CABELOS_FORMA: Record<FormaDeCabelo, FormaCabelo> = {
  curto: {
    rotulo: 'Curto',
    atras: () => null,
    frente: ({ m, cor }) => (
      <path
        d={capaceteDe(m, { folga: 1.8, sobe: 3, lado: 3.2, testa: 0.27, raio: 0, linha: franjaDeMechas(m) })}
        fill={cor}
      />
    ),
  },
  longo: {
    rotulo: 'Longo',
    comprido: true,
    atras: ({ m, cor }) => <path d={silhuetaDe(m)} fill={cor} />,
    frente: ({ m, cor }) => <path d={franjaDe(m)} fill={cor} />,
    mechas: true,
  },
  espetado: {
    rotulo: 'Espetado',
    // dentro do rosto ele é o degradê com a testa em dentes; as pontas ficam
    // por fora, por cima do contorno da cabeça. É o espetado da referência
    // (com fade nas laterais), e é o que o separa do curto
    atras: () => null,
    frente: (d) => {
      const yT = d.m.topo + altura(d.m) * 0.21
      return (
        <>
          <path d={pontasDe(d.m, yT)} fill={d.cor} />
          {esmaecido(
            d,
            capaceteDe(d.m, { folga: 0.5, sobe: 0, lado: 3.6, testa: 0.21, raio: 0, copa: copaQuadrada(d.m), linha: linhaEmDentes }),
            yT + 4.4,
          )}
        </>
      )
    },
  },
  topete: {
    rotulo: 'Topete',
    atras: () => null,
    frente: ({ m, cor }) => <path d={topeteDe(m)} fill={cor} />,
  },
  cacheado: {
    rotulo: 'Cacheado',
    atras: ({ m, cor }) => {
      const f = cacheadoForma(m)
      return <path d={bordaCrespa(f.cx, f.cy, f.rx, f.ry, f.n, f.onda)} fill={cor} />
    },
    frente: ({ m, cor }) => <path d={franjaDeCachosDe(m)} fill={cor} />,
    textura: ({ m, sombra }) => (
      <path d={cachinhosDe(m)} fill="none" stroke={sombra} strokeWidth={1.1} strokeLinecap="round" />
    ),
  },
  quadrado: {
    rotulo: 'Quadrado',
    // o flat-top: reto em cima, com canto pequeno — no canto vivo ele lia
    // como chapéu de lego —, um pouco mais largo em cima do que embaixo, e as
    // laterais descendo rentes até a orelha. A testa é reta, de canto curto,
    // que é a linha de cabelo de quem acabou de passar a máquina
    atras: () => null,
    frente: ({ m, cor }) => {
      const T = m.topo - 4.5
      return (
        <path
          d={capaceteDe(m, {
            folga: 0.8,
            sobe: 4.5,
            lado: 2.6,
            testa: 0.2,
            raio: 2.5,
            copa: (Lo) =>
              `L${50 - Lo - 1.4} ${T + 3} Q${50 - Lo - 1.4} ${T} ${50 - Lo + 1.6} ${T} L${50 + Lo - 1.6} ${T} Q${50 + Lo + 1.4} ${T} ${50 + Lo + 1.4} ${T + 3}`,
          })}
          fill={cor}
        />
      )
    },
  },
  careca: {
    rotulo: 'Careca',
    // careca é sem cabelo nenhum. Ele já foi "a coroa que sobra nas
    // laterais" — uma elipse atrás do rosto aparecendo dos lados —, e o que se
    // via eram dois tufos na altura da orelha, que lia como fone de ouvido.
    // Quem quiser os lados tem o degradê; a cor do cabelo continua valendo
    // para a sobrancelha e a barba
    atras: () => null,
    frente: () => null,
  },
  degrade: {
    rotulo: 'Degradê',
    // **O degradê é o único corte que pinta a PELE, e custou seis versões.**
    // Duas elipses atrás do rosto (dois tons com a emenda escondida), a testa
    // inteira em gradiente (mancha no meio), faixas nas têmporas com a borda
    // dura (listras), uma coroa atrás da cabeça (borda redonda de volume em
    // volta do topo, e degradê é o corte SEM volume) e faixas largas
    // esmaecendo de lado (mancha translúcida na têmpora). Hoje é o militar
    // da referência: o topo pintado dentro da cabeça, a testa baixa de cantos
    // redondos, e laterais estreitas de cor cheia que só esmaecem para BAIXO,
    // até a orelha (`esmaecido`)
    atras: () => null,
    frente: (d) =>
      esmaecido(
        d,
        capaceteDe(d.m, { folga: 0.5, sobe: 0, lado: 3.6, testa: 0.2, raio: 6, copa: copaQuadrada(d.m) }),
        d.m.topo + altura(d.m) * 0.2 + 1,
      ),
  },
  chanel: {
    rotulo: 'Chanel',
    comprido: true,
    // a franja reta tinha cantos em ângulo reto sobre uma silhueta redonda, e
    // os cantos saíam por cima como duas pontas. Hoje as duas peças nascem da
    // mesma `capaDe`, e a franja só difere na borda de baixo
    atras: ({ m, cor }) => {
      const L = meia(m, 4)
      const yb = m.queixo + 3
      return <path d={`${capaDe(m, 4, 6, yb, yb)} Q50 ${yb - 7} ${50 - L} ${yb} Z`} fill={cor} />
    },
    frente: ({ m, cor }) => {
      const L = meia(m, 4)
      const y = m.topo + altura(m) * 0.22
      return <path d={`${capaDe(m, 4, 6, y, y)} Q50 ${y + 3} ${50 - L} ${y} Z`} fill={cor} />
    },
  },
  coque: {
    rotulo: 'Coque',
    // o cabelo puxado para trás: testa em arco liso e laterais rentes até a
    // orelha, como os curtos. Atrás, só o coque
    atras: ({ m, cor }) => <circle cx="50" cy={m.topo - 8} r={m.larg * 0.42} fill={cor} />,
    frente: ({ m, cor }) => (
      <path
        d={capaceteDe(m, {
          folga: 1.5,
          sobe: 3,
          lado: 3,
          testa: 0.22,
          raio: 7,
          linha: (Li, yT, R) =>
            `Q${50 + Li} ${yT} ${50 + Li - R} ${yT - 0.5} Q50 ${yT - 3.5} ${50 - Li + R} ${yT - 0.5} Q${50 - Li} ${yT} ${50 - Li} ${yT + R}`,
        })}
        fill={cor}
      />
    ),
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
    frente: ({ m, cor }) => <path d={linhaRedondaDe(m, 0.25, 1)} fill={cor} />,
  },
  puff: {
    rotulo: 'Puff',
    // só o puff atrás: a peça de trás tinha também uma coroa de base reta,
    // que aparecia dos lados do rosto como um corte de tesoura
    atras: ({ m, cor }) => (
      <path d={bordaCrespa(50, m.topo - 3, m.larg * 0.55, m.larg * 0.5, 11, 0.06)} fill={cor} />
    ),
    frente: ({ m, cor }) => <path d={linhaRedondaDe(m, 0.25, 1)} fill={cor} />,
  },
  trancas: {
    rotulo: 'Tranças',
    comprido: true,
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
            d={`M${50 - L} ${T + a * 0.34} L${50 - L} ${T + 3} Q${50 - L} ${T - 4} 50 ${T - 4} Q${50 + L} ${T - 4} ${50 + L} ${T + 3} L${50 + L} ${T + a * 0.34} Q${50 + L * 0.35} ${T + a * 0.14} 50 ${T + a * 0.11} Q${50 - L * 0.35} ${T + a * 0.14} ${50 - L} ${T + a * 0.34} Z`}
            fill={cor}
          />
          <path d={`M50 ${T - 3} L50 ${T + a * 0.1}`} stroke={pele} strokeWidth={1.1} strokeLinecap="round" />
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
 * três tentativas.
 *
 * `aba` é a linha onde o chapéu pousa. Quem tem `aba` cobre a cabeça, e o
 * cabelo some debaixo dele (só o comprimento dos cortes compridos continua
 * aparecendo, da aba para baixo).
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
    aba: (m) => m.topo + altura(m) * 0.2,
    // o boné da referência: copa em cúpula com dois gomos e botão, e a aba é
    // uma FAIXA curva de espessura constante, mais escura, atravessando a
    // testa de ponta a ponta e passando um pouco da cabeça. A versão
    // anterior desenhava a aba como meia-lua cheia caindo da copa, e ela
    // lia como uma segunda copa
    desenhar: (m, cor, sombra) => {
      const a = altura(m)
      const T = m.topo
      const y = T + a * 0.2
      const desce = 3.2
      const C = m.larg + 2
      const A = m.larg + 4.2
      const alto = T - 8
      return (
        <>
          <path
            d={`M${50 - C} ${y} C${50 - C} ${alto + 2} ${50 - C * 0.55} ${alto} 50 ${alto} C${50 + C * 0.55} ${alto} ${50 + C} ${alto + 2} ${50 + C} ${y} Q50 ${y + desce * 2} ${50 - C} ${y} Z`}
            fill={cor}
          />
          <path
            d={`M${50 - 2.6} ${alto + 1.4} Q${50 - C * 0.58} ${alto + 4} ${50 - C * 0.55} ${y + desce * 0.6} M${50 + 2.6} ${alto + 1.4} Q${50 + C * 0.58} ${alto + 4} ${50 + C * 0.55} ${y + desce * 0.6}`}
            fill="none"
            stroke={sombra}
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.7}
          />
          <circle cx="50" cy={alto + 0.6} r="2" fill={sombra} />
          <path
            d={`M${50 - A} ${y - 0.6} Q50 ${y + desce * 2 + 0.6} ${50 + A} ${y - 0.6}`}
            fill="none"
            stroke={sombra}
            strokeWidth={5.4}
            strokeLinecap="round"
          />
        </>
      )
    },
  },
  chapeu: {
    rotulo: 'Chapéu',
    // a aba ficava em 0.28 da cabeça e, com 5.5 de raio, cobria a
    // sobrancelha — e a sobrancelha é metade da expressão (é ela que fica
    // aflita com o estresse). Em 0.22 ela passa por cima, rente. A copa é
    // um pouco mais larga que a cabeça: com o cabelo sumindo, os cantos do
    // rosto apareciam dos lados dela
    aba: (m) => m.topo + altura(m) * 0.22,
    desenhar: (m, cor, sombra) => {
      const L = m.larg + 0.6
      const a = altura(m)
      const y = m.topo + a * 0.22
      return (
        <>
          <ellipse cx="50" cy={y} rx={L + 12.5} ry={5.5} fill={cor} />
          <path d={`M${50 - L} ${y} A${L} ${a * 0.38} 0 0 1 ${50 + L} ${y} Z`} fill={cor} />
          <path d={`M${50 - L} ${y - 3} h${L * 2} v3 h${-L * 2} Z`} fill={sombra} />
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
  /** O contorno do rosto: a sombra do queixo no "sem pescoço" é ele,
   *  deslocado para baixo. */
  rosto: string
  /** Para os recortes, único por avatar. */
  id: string
}

/** As cores fixas das roupas de trabalho: elas não acompanham a roupa
 *  escolhida porque é a cor que diz o que a peça é. */
const CAMISA_BRANCA = '#e4dfd3'
const JALECO = '#eeebe4'
const COLETE = '#e2782c'
const FAIXA_REFLETIVA = '#d9d8cf'

/**
 * O pescoço, na cor da PELE, com a sombra só embaixo do queixo.
 *
 * Ele era um retângulo inteiro na cor da sombra, e era isso que fazia toda
 * gola parecer colada: o decote e a gola V mostravam o colo na pele clara e o
 * pescoço logo acima era mais escuro — duas peles diferentes, com um degrau
 * entre elas. A sombra é uma meia-lua debaixo do queixo (o rosto, desenhado
 * depois, cobre a metade de cima).
 *
 * Ele termina 1,2 abaixo do topo do ombro, e o que vai por BAIXO dele (a
 * camisa no V do jaleco, a camiseta do colete) tem que ser desenhado ANTES:
 * desenhado depois, a borda de cima dessas peças passava atravessada no
 * pescoço, e a emenda entre ela e a gola sobrava como um fio de 1px.
 */
function pescoco({ m, pele, sombra }: DesenhoDeTronco): ReactNode {
  const N = m.pescocoLarg
  return (
    <>
      <rect x={50 - N} y={m.queixo - 8} width={N * 2} height={m.ombro + 1.2 - (m.queixo - 8)} fill={pele} />
      <ellipse cx="50" cy={m.queixo + 0.5} rx={N + 0.6} ry={3.2} fill={sombra} />
    </>
  )
}

/**
 * A sombra que o queixo faz na roupa quando não há pescoço: o PRÓPRIO
 * contorno do rosto, deslocado para baixo e recortado pela roupa — o rosto,
 * desenhado depois, cobre tudo menos a beirada. Ela era uma meia-lua de
 * largura fixa, larga demais no queixo estreito do oval e estreita demais no
 * quadrado, e em todo rosto lia como uma gola fora do lugar. Seguindo o
 * rosto, ela encaixa em qualquer queixo.
 */
function sombraDoQueixo(d: DesenhoDeTronco, cor: string): ReactNode {
  return <path d={d.rosto} transform="translate(0 2.4)" fill={cor} clipPath={`url(#${d.id}-tronco)`} />
}

function troncoDe(m: Medidas, y: number, borda = m.ombroBorda): string {
  const mo = m.meioOmbro
  return `M${mo} 100 C${mo} ${y + 6} ${mo + borda} ${y} 50 ${y} C${100 - mo - borda} ${y} ${100 - mo} ${y + 6} ${100 - mo} 100 Z`
}

/**
 * O tronco pintado, e o mesmo contorno guardado como recorte. A gola é
 * desenhada DENTRO dele: o decote nascia na altura do ombro no meio, e no
 * rosto oval — de ombro mais caído — as pontas do U ficavam acima da roupa,
 * como duas asas de pele.
 */
function troncoComRecorte(d: DesenhoDeTronco, cor: string, y = d.m.ombro, borda?: number): ReactNode {
  const forma = troncoDe(d.m, y, borda)
  return (
    <>
      <defs>
        <clipPath id={`${d.id}-tronco`}>
          <path d={forma} />
        </clipPath>
      </defs>
      <path d={forma} fill={cor} />
    </>
  )
}

/** O que vai dentro da roupa: recortado por ela. */
function naRoupa(d: DesenhoDeTronco, filhos: ReactNode): ReactNode {
  return <g clipPath={`url(#${d.id}-tronco)`}>{filhos}</g>
}

/**
 * Toda gola nasce da LARGURA DO PESCOÇO (`pescocoLarg`). Elas eram desenhadas
 * em números fixos (41 a 59, ±11, ±12), e o pescoço tinha ±6,5: a abertura
 * da gola não batia com o pescoço que saía dela, e sobravam cunhas de pele ou
 * de camisa dos lados. Agora a borda da gola começa onde o pescoço termina.
 */
function golaRedonda(m: Medidas, abre: number, desce: number): string {
  const N = m.pescocoLarg + abre
  const y = m.ombro + 0.3
  return `M${50 - N} ${y} Q50 ${y + desce * 2} ${50 + N} ${y}`
}

function golaEmV(m: Medidas, abre: number, desce: number): string {
  const N = m.pescocoLarg + abre
  const y = m.ombro + 0.3
  return `M${50 - N} ${y} L50 ${y + desce} L${50 + N} ${y}`
}

/** A gola desenhada: o recorte na cor da pele e o debrum na roupa mais escura.
 *  O recorte sobe até o ombro para não deixar fresta entre ele e o pescoço;
 *  o que passaria da roupa, a `naRoupa` corta. */
function gola(d: string, pele: string, roupa: string, debrum = 1.5): ReactNode {
  return (
    <>
      <path d={`${d} Z`} fill={pele} />
      <path d={d} fill="none" stroke={escurecer(roupa, 0.78)} strokeWidth={debrum} strokeLinejoin="round" strokeLinecap="round" />
    </>
  )
}

/** As duas pontas de colarinho de uma camisa, saindo do pescoço. */
function colarinho(m: Medidas, cor: string): ReactNode {
  const N = m.pescocoLarg
  const y = m.ombro
  const linha = escurecer(cor, 0.82)
  return (
    <g fill={cor} stroke={linha} strokeWidth={0.6} strokeLinejoin="round">
      <path d={`M${50 - N - 0.4} ${y - 2} L${50 - 0.6} ${y + 4} L${50 - N - 3.5} ${y + 6.5} Z`} />
      <path d={`M${50 + N + 0.4} ${y - 2} L${50 + 0.6} ${y + 4} L${50 + N + 3.5} ${y + 6.5} Z`} />
    </g>
  )
}

/** As lapelas de um paletó ou jaleco, de cada lado de um V que desce até `desce`. */
function lapelas(m: Medidas, desce: number, cor: string, linha?: string): ReactNode {
  const N = m.pescocoLarg + 1
  const y = m.ombro + 0.3
  return (
    <g fill={cor} stroke={linha} strokeWidth={linha ? 0.8 : undefined} strokeLinejoin="round">
      <path d={`M${50 - N} ${y} L${50 - 0.5} ${y + desce} L${50 - 4} ${y + desce + 2.5} L${50 - N - 8} ${y + 6} Z`} />
      <path d={`M${50 + N} ${y} L${50 + 0.5} ${y + desce} L${50 + 4} ${y + desce + 2.5} L${50 + N + 8} ${y + 6} Z`} />
    </g>
  )
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
        <rect x={50 - m.pescocoLarg} y={m.queixo - 8} width={m.pescocoLarg * 2} height={m.pescocoAlt} fill={sombra} />
        <path d={troncoDe(m, m.ombro)} fill={sombra} />
        <circle cx="50" cy={m.ombro + 1} r="7.5" fill={pele} />
      </>
    ),
  },
  camiseta: {
    rotulo: 'Camiseta',
    desenhar: (d) => (
      <>
        {troncoComRecorte(d, d.roupa)}
        {pescoco(d)}
        {naRoupa(d, gola(golaRedonda(d.m, 1.5, 3.8), d.pele, d.roupa, 1.8))}
      </>
    ),
  },
  golaV: {
    rotulo: 'Gola V',
    desenhar: (d) => (
      <>
        {troncoComRecorte(d, d.roupa)}
        {pescoco(d)}
        {naRoupa(d, gola(golaEmV(d.m, 0.5, 12), d.pele, d.roupa, 1.3))}
      </>
    ),
  },
  decote: {
    rotulo: 'Decote',
    // um recorte em U, mais aberto que a camiseta e mais fundo: o oposto da
    // gola alta
    desenhar: (d) => (
      <>
        {troncoComRecorte(d, d.roupa)}
        {pescoco(d)}
        {naRoupa(d, gola(golaRedonda(d.m, 4.5, 6), d.pele, d.roupa, 1.3))}
      </>
    ),
  },
  golaAlta: {
    rotulo: 'Gola alta',
    // a gola cobre o pescoço inteiro e encosta no queixo, com duas dobras: é
    // o que a separa de um pescoço pintado da cor da roupa. Ela vem ANTES do
    // tronco, que a recorta: a gola sai de dentro da roupa. Desenhada por
    // cima, a base dela abria em saia sobre o ombro
    desenhar: ({ m, roupa }) => {
      const N = m.pescocoLarg + 2
      const dobra = escurecer(roupa, 0.78)
      return (
        <>
          <rect x={50 - N} y={m.queixo - 4} width={N * 2} height={m.ombro + 4 - (m.queixo - 4)} rx={2.5} fill={escurecer(roupa, 0.9)} />
          <path d={troncoDe(m, m.ombro)} fill={roupa} />
          <path
            // as dobras em PROPORÇÃO do trecho visível: em número fixo, a de
            // baixo caía em cima do suéter no rosto de ombro mais alto
            d={[0.38, 0.78].map((k) => { const y = m.queixo + (m.ombro - m.queixo) * k; return `M${50 - N + 0.5} ${y} Q50 ${y + 1.5} ${50 + N - 0.5} ${y}` }).join(' ')}
            fill="none"
            stroke={dobra}
            strokeWidth={0.9}
            strokeLinecap="round"
          />
        </>
      )
    },
  },
  colado: {
    rotulo: 'Sem pescoço',
    // o corpo encosta no queixo e não há pescoço nenhum: é o que faz a cabeça
    // parecer maior sem mexer em medida nenhuma. A única marca é a sombra
    // do queixo na roupa (`sombraDoQueixo`) — ela foi uma meia-lua de largura
    // fixa, que em todo rosto ficava larga ou estreita demais e lia como gola
    desenhar: (d) => (
      <>
        {troncoComRecorte(d, d.roupa, d.m.queixo - 1, d.m.ombroBorda + 9)}
        {sombraDoQueixo(d, escurecer(d.roupa, 0.8))}
      </>
    ),
  },
  social: {
    rotulo: 'Social',
    // paletó na cor da roupa (o corpo, mais escuro; as lapelas, na cor), a
    // camisa branca aberta no colarinho
    desenhar: (d) => (
      <>
        {troncoComRecorte(d, escurecer(d.roupa, 0.78))}
        <path d={`${golaEmV(d.m, 1, 16)} Z`} fill={CAMISA_BRANCA} />
        <path d={`${golaEmV(d.m, -0.5, 6)} Z`} fill={d.pele} />
        {pescoco(d)}
        {colarinho(d.m, CAMISA_BRANCA)}
        {lapelas(d.m, 16, d.roupa)}
      </>
    ),
  },
  // três roupas de TRABALHO — o jogo é sobre um emprego, e até aqui o
  // guarda-roupa era só camisa lisa
  gravata: {
    rotulo: 'Gravata',
    // camisa branca abotoada e a gravata na cor da roupa: é ela que carrega a
    // escolha. O nó fica ENTRE as pontas do colarinho, que é onde ele mora
    desenhar: (d) => {
      const { m, roupa } = d
      const y = m.ombro
      return (
        <>
          {troncoComRecorte(d, CAMISA_BRANCA)}
          {pescoco(d)}
          {colarinho(m, CAMISA_BRANCA)}
          <path d={`M${50 - 2.3} ${y + 0.8} L${50 + 2.3} ${y + 0.8} L${50 + 1.6} ${y + 4.8} L${50 - 1.6} ${y + 4.8} Z`} fill={escurecer(roupa, 0.82)} />
          <path d={`M${50 - 1.6} ${y + 4.8} L${50 + 1.6} ${y + 4.8} L${50 + 3.8} ${y + 19} L50 ${y + 22.5} L${50 - 3.8} ${y + 19} Z`} fill={roupa} />
        </>
      )
    },
  },
  jaleco: {
    rotulo: 'Jaleco',
    // o avental branco por cima, a roupa escolhida aparecendo no V — e ela é
    // uma camiseta, então o V dela também tem a gola redonda no pescoço
    desenhar: (d) => {
      const { m, roupa, pele } = d
      const y = m.ombro
      const dobra = escurecer(JALECO, 0.84)
      return (
        <>
          {troncoComRecorte(d, JALECO)}
          <path d={`${golaEmV(m, 1, 15)} Z`} fill={roupa} />
          {pescoco(d)}
          {naRoupa(d, gola(golaRedonda(m, 0, 2.6), pele, roupa, 1.3))}
          {lapelas(m, 15, JALECO, dobra)}
          <path d={`M${50 + 9} ${y + 17} h7`} stroke={dobra} strokeWidth={0.9} strokeLinecap="round" />
        </>
      )
    },
  },
  colete: {
    rotulo: 'Colete',
    // o colete refletivo de obra e de pátio, por cima da camiseta na cor da
    // roupa. Laranja e faixa prata fixos: um colete de outra cor não é colete
    desenhar: (d) => {
      const { m, roupa, pele } = d
      const y = m.ombro
      const mo = m.meioOmbro
      const abre = m.pescocoLarg + 2.5
      const faixas = [y + 10, y + 16.5]
      return (
        <>
          {troncoComRecorte(d, COLETE)}
          {naRoupa(d, <path d={`M${50 - abre} ${y - 2} L${50 + abre} ${y - 2} L${50 + abre - 1.5} 100 L${50 - abre + 1.5} 100 Z`} fill={roupa} />)}
          {pescoco(d)}
          {naRoupa(d, gola(golaRedonda(m, 1, 3.4), pele, roupa, 1.6))}
          {faixas.map((fy) => (
            <g key={fy} fill={FAIXA_REFLETIVA}>
              <rect x={mo + 4} y={fy} width={50 - abre - (mo + 4)} height={2.6} />
              <rect x={50 + abre} y={fy} width={50 - abre - (mo + 4)} height={2.6} />
            </g>
          ))}
        </>
      )
    },
  },
}

// ------------------------------------------------------------------- olhos

/**
 * As EXPRESSÕES, como tabela. O campo da receita se chama `olhos` por
 * história, mas hoje o olho é um só — a amêndoa — e o que se
 * escolhe é a expressão: a pálpebra, a abertura e a sobrancelha.
 *
 * **A régua aqui é desenho, não anatomia.** A primeira tentativa foi
 * realista (branco, íris, pupila e um brilho grande) e ficou pior: parecia
 * decalque de outro jogo. O que dá expressão num rosto chapado como este é:
 *
 *  1. **Forma grande e sólida**, e NÃO redonda: a amêndoa deitada lê como
 *     olhar; um círculo lê como botão.
 *  2. **Inclinação espelhada.** É o ângulo do olho e da pálpebra, não o que
 *     tem dentro dele, que diz tranquilo, desconfiado ou decidido.
 *  3. **A íris fora do centro**, encostada no lado do nariz: o olhar converge
 *     e o rosto passa a olhar para quem vê.
 *
 * **Sem brilho.** Houve um ponto claro no canto da íris, e no tamanho do
 * perfil ele lia como um reflexo de luz no rosto — o único do desenho, que é
 * todo chapado.
 *
 * A pálpebra é um polígono da COR DA PELE por cima do olho: como ele mora
 * dentro do rosto, o que sobra dela fora do olho é pele também e some
 * sozinho, sem recorte nenhum.
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
}

/** A amêndoa: larga e baixa. É o olho de todas as expressões. */
const AMENDOA: FormaDeOlho = { rx: 6.2, ry: 3.5, giro: 11, ix: 1.4, iy: 0.1, irx: 2.3, iry: 2.8 }

function olhoComIris(o: DesenhoDeOlho, f: FormaDeOlho): ReactNode {
  const giro = (f.giro ?? 0) * -o.lado
  return (
    <g transform={`translate(${o.x} ${o.y}) rotate(${giro}) scale(${o.t})`}>
      <ellipse rx={f.rx} ry={f.ry} fill={BRANCO_DO_OLHO} />
      <ellipse cx={f.ix * -o.lado} cy={f.iy} rx={f.irx} ry={f.iry} fill={o.cor} />
    </g>
  )
}

/**
 * A amêndoa com uma pálpebra por cima, de borda reta: `fora` e `dentro` são a
 * altura da borda no canto de fora e no do nariz. Iguais, o olho fica
 * entediado; com o lado do nariz mais baixo, decidido.
 */
function comPalpebra(o: DesenhoDeOlho, fora: number, dentro: number): ReactNode {
  const xf = o.lado * 7.5
  const xd = -o.lado * 7.5
  const em = (k: number) => fora + (dentro - fora) * k
  return (
    <>
      {olhoComIris(o, AMENDOA)}
      <g transform={`translate(${o.x} ${o.y}) scale(${o.t})`}>
        <path d={`M${xf} -6 L${xd} -6 L${xd} ${dentro} L${xf} ${fora} Z`} fill={o.pele} />
        <path
          d={`M${xf * 0.84} ${em(0.08)} L${xd * 0.84} ${em(0.92)}`}
          stroke={o.sombra}
          strokeWidth={1.1}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </>
  )
}

export const OLHOS: Record<Olhos, {
  rotulo: string
  teste?: boolean
  /** A sobrancelha da expressão: `sobe` em unidades (negativo é para cima)
   *  e `giro` em graus — positivo levanta a ponta de DENTRO. O humor do
   *  estresse, quando aflito, passa por cima disto. */
  sobrancelha?: { sobe?: number; giro?: number }
  desenhar: (o: DesenhoDeOlho) => ReactNode
}> = {
  amendoa: {
    rotulo: 'Neutra',
    desenhar: (o) => olhoComIris(o, AMENDOA),
  },
  esperto: {
    rotulo: 'De lado',
    // a pálpebra reta e a íris encostada no canto: olhando de lado
    desenhar: (o) => (
      <g transform={`translate(${o.x} ${o.y}) rotate(${-8 * o.lado}) scale(${o.t})`}>
        <ellipse rx={5.8} ry={4.3} fill={BRANCO_DO_OLHO} />
        <ellipse cx={-2.2 * o.lado} cy={0.9} rx={2.4} ry={3.1} fill={o.cor} />
        <rect x={-6.8} y={-5.8} width={13.6} height={4.5} fill={o.pele} />
        <path d="M-5.5 -1.3 h11" stroke={o.sombra} strokeWidth={1.1} strokeLinecap="round" fill="none" />
      </g>
    ),
  },
  emPe: {
    // era o olho oval "em pé"; virou a amêndoa com a pálpebra caindo para o
    // lado do nariz, e a sobrancelha descendo junto
    rotulo: 'Decidida',
    sobrancelha: { sobe: 0.6, giro: -10 },
    desenhar: (o) => comPalpebra(o, -2.6, -0.3),
  },
  surpreso: {
    // a amêndoa mais aberta, quase sem giro, e a sobrancelha lá em cima
    rotulo: 'Surpresa',
    sobrancelha: { sobe: -2.4 },
    desenhar: (o) => olhoComIris(o, { rx: 5.8, ry: 4.6, giro: 4, ix: 0.7, iy: 0, irx: 2.1, iry: 2.6 }),
  },
  feliz: {
    rotulo: 'Feliz',
    // sem branco e sem íris: só o arco. É a expressão que mais se lê e a que
    // tem menos desenho — a prova de que expressão aqui não é detalhe
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
  // os olhos que saíram da receita continuam desenhados, de teste, para o
  // lab: quem os tinha gravado abre com a amêndoa (`lerAvatar`)
  simples: {
    rotulo: 'Ponto',
    teste: true,
    desenhar: ({ x, y, t }) => <ellipse cx={x} cy={y} rx={3 * t} ry={3.6 * t} fill="#241f1b" />,
  },
  desenho: {
    rotulo: 'Desenho',
    teste: true,
    desenhar: (o) => olhoComIris(o, { rx: 5.8, ry: 4, giro: 16, ix: 1.5, iy: 0.2, irx: 2.4, iry: 3 }),
  },
  deitado: {
    rotulo: 'Deitado',
    teste: true,
    desenhar: (o) => olhoComIris(o, { rx: 6.8, ry: 3, giro: 8, ix: 1.8, iy: 0, irx: 2.3, iry: 2.5 }),
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
    // a cor da barba, bem fraca, e só. Ela já foi um padrão de pontos — mais
    // "realista", e lia como rede na pele clara e como textura de tecido em
    // tamanho grande. Barba por fazer de desenho é sombra
    desenhar: ({ m, cor, bocaY }) => (
      <path d={mandibulaDe(m, m.topo + altura(m) * 0.64, bocaY - 4)} fill={cor} opacity={0.26} />
    ),
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
    // sem recorte de pele em volta da boca: a boca é desenhada POR CIMA da
    // barba, na cor dela mais escura (`bocaNaBarba` no componente). O recorte
    // em elipse lia como uma máscara aberta
    desenhar: ({ m, cor, bocaY }) => (
      <>
        {/* desce 3 abaixo do queixo: barba tem volume, e sem isso ela
            pareceria pintada no rosto */}
        <path d={mandibulaDe(m, m.topo + altura(m) * 0.62, bocaY - 4.5, 3)} fill={cor} />
        {/* as costeletas ligam a barba ao cabelo. Sem elas sobrava um vão de
            pele na altura da orelha, e a barba cheia lia como barba de queixo */}
        <rect x={50 - m.larg} y={m.topo + altura(m) * 0.3} width={3.4} height={altura(m) * 0.36} fill={cor} />
        <rect x={50 + m.larg - 3.4} y={m.topo + altura(m) * 0.3} width={3.4} height={altura(m) * 0.36} fill={cor} />
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
function crachaDe(m: Medidas, pescoco: 'sem' | 'gola' | 'nu'): ReactNode {
  // o cordão passa POR TRÁS do pescoço: de frente, o que se vê é ele saindo
  // dos dois lados da base do pescoço, já em cima da roupa. Ele saía do
  // queixo, por cima da pele, e lia como uma alça presa no pescoço — e no
  // rosto de pescoço mais curto os dois fios se cruzavam. Sem pescoço, ele
  // sai de debaixo do queixo (o rosto é desenhado depois e o cobre)
  const x = pescoco === 'sem' ? m.larg * 0.42 : m.pescocoLarg + (pescoco === 'gola' ? 2.4 : 0.9)
  const de = pescoco === 'sem' ? m.queixo - 3 : m.ombro - 0.6
  // o cartão sobe junto com o ombro: em 7 abaixo dele, no rosto oval o
  // cartão saía pela borda de baixo
  const y = m.ombro + 5.5
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
  // "a da roupa" é a roupa um pouco mais escura: da mesma cor, o boné sumia
  // na camisa
  const corAcessorio =
    ajustes?.cores?.acessorio ??
    (avatar.corChapeu && avatar.corChapeu !== 'roupa' ? TONS_DE_CHAPEU[avatar.corChapeu] : escurecer(roupa, 0.85))
  // a aba e o botão, mais escuros que a copa — no boné preto não existe mais
  // escuro, e ali eles clareiam
  const sombraDoAcessorio =
    luminancia(corAcessorio) < 0.03 ? clarear(corAcessorio, 0.22) : escurecer(corAcessorio, 0.72)
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
  const comChapeu = chapeuY !== undefined
  const cabelo: DesenhoDeCabelo = { m, cor: c, sombra: cs, pele: p, id }
  // com chapéu o cabelo SOME (veja o comentário de `FormaCabelo`): só o
  // comprimento dos cortes compridos fica, recortado da aba para baixo
  const recorteDoChapeu = comChapeu ? `url(#${id}-chapeu)` : undefined
  const atrasDoCabelo = comChapeu && !forma.comprido ? null : forma.atras(cabelo)
  const frenteDoCabelo = comChapeu ? null : forma.frente(cabelo)
  const texturaDoCabelo = comChapeu || !forma.textura ? null : forma.textura(cabelo)
  const corDaBarba =
    avatar.corBarba && avatar.corBarba !== 'cabelo' ? TONS_DE_CABELO[avatar.corBarba][0] : c
  // a boca dentro da barba cheia é da cor da barba, mais escura. Numa barba
  // quase preta "mais escuro" não existe, e a boca sumiria: ali ela clareia
  const corDaBoca =
    avatar.barba === 'cheia' && !manequim
      ? luminancia(corDaBarba) > 0.05
        ? escurecer(corDaBarba, 0.58)
        : clarear(corDaBarba, 0.4)
      : pss

  // CONTRASTE. Dez das 49 combinações de cabelo e pele ficavam abaixo de
  // 1,35:1 (mel em canela é 1,01:1): o corte sumia no rosto e a cabeça virava
  // uma mancha só. Nesses casos — e só neles, para o resto continuar chapado
  // como sempre foi — o cabelo ganha um contorno, e o rosto também. A cor do
  // contorno sai do MAIS ESCURO dos dois, para ela se separar dos dois
  const contrasteBaixo = !manequim && contraste(c, p) < 1.45
  const barbaBaixa = !manequim && avatar.barba !== 'rala' && contraste(corDaBarba, p) < 1.45
  const contorno = escurecer(luminancia(c) < luminancia(p) ? c : p, 0.55)
  const filtroContorno = `url(#${id}-contorno)`
  const rostoD = rostoDe(m)

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
          {comChapeu ? (
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
            </>
          ) : null}
          {/* o rosto como recorte: o degradê e o espetado pintam DENTRO dele,
              e o anel de contraste baixo também */}
          <clipPath id={`${id}-rosto`}>
            <path d={rostoD} />
          </clipPath>
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
        {tronco.desenhar({ m, roupa, pele: p, sombra: ps, sombraForte: pss, rosto: rostoD, id })}

        {/* 2b. o crachá no cordão, por cima da roupa */}
        {avatar.cracha && !manequim ? crachaDe(m, tronco === TRONCOS.colado ? 'sem' : tronco === TRONCOS.golaAlta ? 'gola' : 'nu') : null}

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
            {manequim ? null : texturaDoCabelo}
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
                // a sobrancelha da expressão, e o humor aflito por cima dela
                const sy = sobY + (cara?.aflito ? 0 : (olhos.sobrancelha?.sobe ?? 0))
                const giro = cara?.aflito ? 12 : (olhos.sobrancelha?.giro ?? 0)
                return (
                  <g key={s}>
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
                    {/* a sobrancelha vem DEPOIS do olho: a pálpebra é pele, e
                        desenhada por cima ela cortaria a sobrancelha que desce.
                        Giro positivo levanta a ponta de dentro; em SVG o giro
                        positivo é horário, e o lado de dentro de cada olho é o
                        oposto do seu `s` — por isso o ângulo leva o sinal dele */}
                    <rect
                      x={x - sl / 2}
                      y={sy}
                      width={sl}
                      height={m.sobrancelha}
                      rx={m.sobrancelha / 2}
                      fill={cs}
                      transform={giro ? `rotate(${giro * s} ${x} ${sy + m.sobrancelha / 2})` : undefined}
                    />
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
                <path d={`M44 ${bocaY - 0.5} Q50 ${bocaY + 9} 56 ${bocaY - 0.5} Z`} fill={corDaBoca} />
              ) : (
                <path
                  d={`M44.5 ${bocaY} Q50 ${bocaY + (cara?.boca ?? 4.5)} 55.5 ${bocaY}`}
                  fill="none"
                  stroke={corDaBoca}
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
          {acessorio.desenhar(m, corAcessorio, sombraDoAcessorio)}
        </g>
      </svg>
    </span>
  )
}
