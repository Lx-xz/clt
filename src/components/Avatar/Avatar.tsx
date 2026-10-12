'use client'

import { useId, type CSSProperties, type ReactNode } from 'react'
import type {
  Acessorio,
  Avatar as Receita,
  Barba,
  CorCabelo,
  CorDoChapeu,
  CorDosOculos,
  CorDosOlhos,
  CorFundo,
  CorRoupa,
  Corte,
  Iris,
  LadoDaBarba,
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
  // cosméticos (v0.30)
  rosa: ['#d97b9c', '#b85d7e'],
  azul: ['#4f7fc4', '#3a63a0'],
  verde: ['#4f9a5e', '#3a7a47'],
  lilas: ['#a58ad0', '#8569b3'],
  abobora: ['#e5782a', '#bf5c17'],
  noite: ['#4a3c6e', '#342a52'],
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
  abobora: '#d9772b',
  rosa: '#c98a9b',
  verde: '#5e8f63',
  noite: '#3e3557',
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
  abobora: '#e07a2c',
  noite: '#40365c',
}

/** A cor do boné como o editor mostra na amostra: "a da roupa" é a roupa um
 *  pouco mais escura, igual ao desenho. */
export function corDoChapeu(cor: CorDoChapeu, roupa: CorRoupa): string {
  return cor === 'roupa' ? escurecer(TONS_DE_ROUPA[roupa], 0.85) : TONS_DE_CHAPEU[cor]
}

export const TONS_DE_FUNDO: Record<CorFundo, string> = {
  papelEscuro: '#7c7462',
  kraftEscuro: '#7a6448',
  mentaEscuro: '#5d7a66',
  ceuEscuro: '#55697d',
  lavandaEscuro: '#665f80',
  pessegoEscuro: '#94674a',
  poeiraEscuro: '#7a6870',
  papel: '#d8cfba',
  kraft: '#c9b596',
  menta: '#b7c9bb',
  ceu: '#b3c3d1',
  lavanda: '#c1bcd1',
  pessego: '#dcc0a8',
  poeira: '#cbbfc4',
  abobora: '#e39a4f',
  noite: '#3b3352',
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
  // o oval já foi 20 de largura e começava em 19: a cabeça inteira lia
  // menor que as outras. Hoje tem quase o tamanho delas, e o que muda é o
  // CANTO — alto e fundo, de ovo
  oval: { larg: 22, topo: 16, queixo: 72, rx: 27.5, ry: 26.5, cy: 37, ombro: 79, meioOmbro: 17, cantoY: 25, cantoX: 19, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1, orelha: 4 },
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
  /** A lateral escolhida (veja `capacete`). */
  lateral: TipoDeLateral
}

export interface FormaCabelo {
  rotulo: string
  teste?: boolean
  /** Quanto o cabelo sobe acima do alto da cabeça, na altura das têmporas:
   *  é onde pousa o que vai POR CIMA dele (os chifres, as orelhas de gato).
   *  Sem isso, o chifre nascia dentro do flat-top. */
  alto: number
  /** O corte cujo comprimento é a própria lateral (os compridos): o editor
   *  não oferece a escolha, e o corte a ignora. */
  semEscolhaDeLateral?: boolean
  /** Vai ATRÁS do rosto (e atrás do tronco). */
  atras: (d: DesenhoDeCabelo) => ReactNode
  /** Vai POR CIMA do rosto. */
  frente: (d: DesenhoDeCabelo) => ReactNode
  /** Mechas caindo na frente do ombro, para o comprimento não sumir. */
  mechas?: boolean
  /** Desenho por cima de TUDO do cabelo, mechas inclusive — o trançado. */
  textura?: (d: DesenhoDeCabelo) => ReactNode
  /**
   * O que aparece embaixo do boné e do chapéu. Sem isto, valem as LATERAIS
   * da peça da frente, da aba para baixo (`lados` decide outra peça, ou
   * `null` para nenhuma), e nada atrás. `atras` é o comprimento, num volume
   * menor: o boné aperta o cabelo, e o longo com o volume de sempre
   * parecia um boné apoiado em cima de uma peruca.
   */
  /** A largura da lateral do corte por dentro do rosto (o `lado` do
   *  capacete). A costeleta da barba usa a MESMA largura, para continuar
   *  exatamente embaixo dela — mais estreita, sobrava um degrau por dentro. */
  lateral?: number
  sobChapeu?: {
    atras?: (d: DesenhoDeCabelo) => ReactNode
    lados?: ((d: DesenhoDeCabelo) => ReactNode) | null
  }
}

// Boné e chapéu APERTAM o cabelo. Já foram três regras: um `sobChapeu` por
// corte brigando com a aba; o cabelo inteiro recortado da aba para baixo (a
// franja e o volume do longo continuavam lá, como se o boné não apertasse
// nada); e o cabelo sumindo inteiro (todo mundo de boné parecia careca).
// Hoje embaixo da aba aparecem só as LATERAIS de cada corte — recortadas pelo
// componente —, e os compridos ganham um volume menor, rente à cabeça e
// caindo atrás do pescoço.

/** O comprimento embaixo do chapéu: rente à cabeça, descendo até `ate`, por
 *  trás do rosto e da roupa — o que passa do ombro some atrás dela. */
function comprimentoSobChapeu(ate: (m: Medidas) => number, folga = 2.6): (d: DesenhoDeCabelo) => ReactNode {
  return ({ m, cor }) => {
    const L = m.larg + folga
    const y = ate(m)
    return <path d={`M${50 - L} ${m.topo} L${50 + L} ${m.topo} L${50 + L} ${y - 4} Q${50 + L} ${y} ${50 + L - 4} ${y} L${50 - L + 4} ${y} Q${50 - L} ${y} ${50 - L} ${y - 4} Z`} fill={cor} />
  }
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
 * mais muda de um corte para outro. Não há peça de trás: o que ficaria atrás
 * do rosto não aparece.
 *
 * **A capa é RENTE à cabeça pelos lados** (`folga` 0,3 — só o bastante para
 * cobrir a borda serrilhada do rosto). Ela já passou 0,8 a 1,8 da cabeça, e
 * o cabelo lia como maior que ela; o volume, quando existe, é para CIMA.
 *
 * A testa é o recorte entre as duas laterais (`lado` é a largura delas por
 * DENTRO do rosto), na altura `testa` — e a testa grande que se via em quase
 * todo corte era essa altura: a linha do cabelo ficava em 0,1 da cabeça, e a
 * sobrancelha em 0,37.
 */
interface Capacete {
  /** Quanto a capa passa da cabeça dos lados (rente: 0,3), e quanto sobe
   *  por cima. */
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
  /** Só o TOPO, sem as laterais descendo até a orelha: desde a v0.30 quem
   *  desenha a lateral é `lateralDe`, conforme a escolha da pessoa. */
  semLados?: boolean
}

function capaceteDe(m: Medidas, c: Capacete): string {
  const T = m.topo
  const Lo = m.larg + c.folga
  const Li = m.larg - c.lado
  const yT = T + altura(m) * c.testa
  const R = c.raio ?? 5
  const ate = c.semLados ? yT + R : fimDoLado(m)
  // a ponta da lateral: a borda de dentro faz a curva até a de fora, e o
  // cabelo termina afinando em vez de numa quina
  const k = c.semLados ? 0 : c.lado * 1.8
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
function esmaecido(d: DesenhoDeCabelo, forma: string, de: number, sufixo = 'fade'): ReactNode {
  const ate = fimDoLado(d.m)
  const gid = `${d.id}-${sufixo}`
  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1={de} x2="0" y2={ate}>
          <stop offset="0" stopColor={d.cor} />
          <stop offset="0.45" stopColor={d.cor} stopOpacity="0.72" />
          <stop offset="1" stopColor={d.cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={forma} fill={`url(#${gid})`} clipPath={`url(#${d.id}-rosto)`} />
      {/* o recorte pelo rosto deixava um fio de pele na borda de cima, que é
          o antisserrilhado do rosto aparecendo em volta do cabelo. O contorno
          do rosto na cor do cabelo cobre o fio — só até onde o fade começa.
          Descendo pelas laterais, metade dele ficava FORA do rosto e virava
          uma faixa esmaecida passando da cabeça: o cabelo parecia maior que
          ela, em todo formato de rosto */}
      <path
        d={rostoDe(d.m)}
        fill="none"
        // no mesmo gradiente do cabelo, e com 0,6: metade fica fora do rosto,
        // e fora ela é a sobra de 0,3 dos cortes rentes. Com 1,2 o cabelo
        // passava da cabeça nas laterais; cortada onde o fade começa, sobrava
        // um degrau ali. No gradiente ela esmaece junto com o cabelo
        stroke={`url(#${gid})`}
        strokeWidth={0.6}
      />
    </>
  )
}

/**
 * O topo dos cortes rentes (o curto, o espetado), pintado DENTRO do rosto: o
 * recorte arredonda os cantos dele. O contorno do rosto na cor do cabelo
 * cobre o fio de pele do antisserrilhado, só até `ate` — mais para baixo ele
 * seria uma linha de cabelo descendo pela têmpora sem lateral nenhuma.
 */
function noRosto(d: DesenhoDeCabelo, forma: string, ate: number): ReactNode {
  return (
    <>
      <defs>
        <clipPath id={`${d.id}-topo`}>
          <rect x={-20} y={-20} width={140} height={ate + 20} />
        </clipPath>
      </defs>
      <path d={forma} fill={d.cor} clipPath={`url(#${d.id}-rosto)`} />
      <g clipPath={`url(#${d.id}-topo)`}>
        <path d={rostoDe(d.m)} fill="none" stroke={d.cor} strokeWidth={0.6} />
      </g>
    </>
  )
}

/**
 * A LATERAL do cabelo é escolha (v0.30): da cor do cabelo (`cabelo`),
 * esmaecendo até a orelha (`degrade`) ou nenhuma. Ela já foi uma peça à
 * parte, desenhada por cima de todo corte (duas faixas iguais para todos),
 * e não encaixava: o canto quadrado da faixa saía do canto redondo do topo,
 * e no degradê o topo acabava num degrau antes de o fade começar. Desde a
 * v0.31 cada corte desenha as PRÓPRIAS laterais, como sempre fez, e a
 * escolha só muda a tinta: cheia, em fade, ou o corte sem elas
 * (`semLados`). Os compridos (`semEscolhaDeLateral`) não oferecem a
 * escolha: o comprimento é a lateral deles.
 */
export type TipoDeLateral = 'cabelo' | 'degrade' | 'nenhuma'

/** Pinta `forma` com o fade de cima para baixo: cabelo inteiro até `de`, e
 *  nada na altura da orelha. Sem recorte pelo rosto: o volume que passa da
 *  cabeça (o topete, o flat-top) fica inteiro. */
function emFade(d: DesenhoDeCabelo, forma: string, de: number, sufixo = 'lado'): ReactNode {
  const gid = `${d.id}-${sufixo}`
  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1={de} x2="0" y2={fimDoLado(d.m)}>
          <stop offset="0" stopColor={d.cor} />
          <stop offset="0.45" stopColor={d.cor} stopOpacity="0.72" />
          <stop offset="1" stopColor={d.cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={forma} fill={`url(#${gid})`} />
    </>
  )
}

/** Um corte de capacete com a lateral escolhida: o MESMO desenho, só a
 *  tinta muda — então não há emenda para errar. */
function capacete(d: DesenhoDeCabelo, c: Capacete): ReactNode {
  if (d.lateral === 'nenhuma') return <path d={capaceteDe(d.m, { ...c, semLados: true })} fill={d.cor} />
  const forma = capaceteDe(d.m, c)
  if (d.lateral === 'cabelo') return <path d={forma} fill={d.cor} />
  return emFade(d, forma, d.m.topo + altura(d.m) * c.testa + (c.raio ?? 5) * 0.5)
}

/** Os cortes RENTES (o curto, o espetado): o topo é recortado pelo rosto, e
 *  as três laterais saem do mesmo desenho. O degradê é o de sempre. */
function rente(d: DesenhoDeCabelo, c: Capacete): ReactNode {
  const yT = d.m.topo + altura(d.m) * c.testa
  if (d.lateral === 'nenhuma') return noRosto(d, capaceteDe(d.m, { ...c, semLados: true }), yT + (c.raio ?? 5))
  if (d.lateral === 'cabelo') return noRosto(d, capaceteDe(d.m, c), fimDoLado(d.m))
  return esmaecido(d, capaceteDe(d.m, c), yT + 1)
}

/**
 * As laterais de quem não é capacete (o cacheado, o puff, o black power, o
 * moicano): duas faixas rentes ao rosto, de canto de cima redondo, que
 * nascem em `desde` — embaixo da franja do corte, quando há — e descem até
 * a orelha afinando.
 */
function faixas(d: DesenhoDeCabelo, lado: number, desde: number): ReactNode {
  if (d.lateral === 'nenhuma') return null
  const m = d.m
  const Lo = m.larg + 0.3
  const Li = m.larg - lado
  const ate = fimDoLado(m)
  const k = lado * 1.8
  const forma = [-1, 1]
    .map(
      (s) =>
        `M${50 + s * Lo} ${desde + lado} Q${50 + s * Lo} ${desde} ${50 + s * (Lo - lado)} ${desde} L${50 + s * Li} ${desde} L${50 + s * Li} ${ate - k} Q${50 + s * Li} ${ate - k * 0.1} ${50 + s * Lo} ${ate} Z`,
    )
    .join(' ')
  return d.lateral === 'cabelo' ? <path d={forma} fill={d.cor} /> : emFade(d, forma, desde + 2)
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
 * O topete (v0.30): um pompadour — o volume é na FRENTE, alto e redondo, e
 * cai um pouco para a direita como uma onda que vai quebrar. O de antes era
 * a capa subindo de um lado só, num gancho baixo, e ninguém escolhia: de
 * longe ele lia como o curto com um defeito no alto. A testa continua um
 * arco limpo (o topete é o corte de testa livre).
 */
function topeteDe(m: Medidas): Capacete {
  const L = m.larg
  const T = m.topo
  return {
    folga: 0.3,
    sobe: 0,
    lado: 3.4,
    testa: 0.22,
    raio: 6,
    copa: (Lo) =>
      // sobe da têmpora esquerda numa onda larga, dentro da largura da
      // cabeça (passando dela, lia como boina), quebra para a direita num
      // cacho e desce rente do outro lado
      `L${50 - Lo} ${T + 5} C${50 - Lo} ${T - 5} ${50 - L * 0.7} ${T - 11} ${50 - L * 0.2} ${T - 12} C${50 + L * 0.25} ${T - 13} ${50 + L * 0.6} ${T - 12.5} ${50 + L * 0.72} ${T - 8.5} C${50 + L * 0.78} ${T - 6} ${50 + L * 0.62} ${T - 4.2} ${50 + L * 0.46} ${T - 5.4} C${50 + L * 0.66} ${T - 2.6} ${50 + Lo} ${T - 1.5} ${50 + Lo} ${T + 6}`,
    linha: (Li, yT, R) =>
      `Q${50 + Li} ${yT} ${50 + Li - R} ${yT} Q50 ${yT - 3} ${50 - Li + R} ${yT} Q${50 - Li} ${yT} ${50 - Li} ${yT + R}`,
  }
}

/** A testa do cabelo puxado para trás (o coque, o rabo): um arco liso. */
function testaPuxada(Li: number, yT: number, R: number): string {
  return `Q${50 + Li} ${yT} ${50 + Li - R} ${yT - 0.5} Q50 ${yT - 3.5} ${50 - Li + R} ${yT - 0.5} Q${50 - Li} ${yT} ${50 - Li} ${yT + R}`
}

/**
 * Os cortes DIVIDIDOS no meio (v0.31): o topo rente e as duas cortinas
 * saindo da risca no alto da testa, descendo pelos lados do rosto até `ate`.
 * O comprimento é o que separa os três: até a orelha, até o queixo, e o
 * comprido, que cai atrás dos ombros.
 */
function repartidoDe(m: Medidas, ate: number): string {
  const L = meia(m, 1.4)
  const Li = m.larg - 3.4
  const T = m.topo
  const a = altura(m)
  const risca = T + 2.5
  return `${capaDe(m, 1.4, 4, ate, ate)} L${50 + Li} ${ate} C${50 + Li} ${T + a * 0.26} ${50 + m.larg * 0.42} ${T + a * 0.12} ${50 + 0.8} ${risca} L${50 - 0.8} ${risca} C${50 - m.larg * 0.42} ${T + a * 0.12} ${50 - Li} ${T + a * 0.26} ${50 - Li} ${ate} L${50 - L} ${ate} Z`
}

/** A risca do repartido: um fio de pele no alto da testa. */
function riscaDe({ m, pele }: DesenhoDeCabelo): ReactNode {
  return <path d={`M50 ${m.topo - 3} L50 ${m.topo + 2.6}`} stroke={pele} strokeWidth={1} strokeLinecap="round" />
}

export const CABELOS_FORMA: Record<FormaDeCabelo, FormaCabelo> = {
  longo: {
    rotulo: 'Longo',
    alto: 7,
    semEscolhaDeLateral: true,
    sobChapeu: { atras: comprimentoSobChapeu(() => 100), lados: null },
    atras: ({ m, cor }) => <path d={silhuetaDe(m)} fill={cor} />,
    frente: ({ m, cor }) => <path d={franjaDe(m)} fill={cor} />,
    mechas: true,
  },
  espetado: {
    rotulo: 'Espetado',
    lateral: 3.6,
    // as pontas sobem 6,8: o que pousa em cima tem de passar delas
    alto: 7.5,
    // dentro do rosto ele é o rente com a testa em dentes; as pontas ficam
    // por fora, por cima do contorno da cabeça
    atras: () => null,
    frente: (d) => {
      const yT = d.m.topo + altura(d.m) * 0.21
      return (
        <>
          <path d={pontasDe(d.m, yT)} fill={d.cor} />
          {rente(d, { folga: 0.5, sobe: 0, lado: 3.6, testa: 0.21, raio: 0, copa: copaQuadrada(d.m), linha: linhaEmDentes })}
        </>
      )
    },
  },
  topete: {
    rotulo: 'Topete',
    lateral: 3.4,
    alto: 3,
    atras: () => null,
    frente: (d) => capacete(d, topeteDe(d.m)),
  },
  cacheado: {
    rotulo: 'Cacheado',
    lateral: 3.6,
    alto: 9,
    atras: ({ m, cor }) => {
      const f = cacheadoForma(m)
      return <path d={bordaCrespa(f.cx, f.cy, f.rx, f.ry, f.n, f.onda)} fill={cor} />
    },
    frente: (d) => (
      <>
        {faixas(d, 3.6, d.m.topo + altura(d.m) * 0.17)}
        <path d={franjaDeCachosDe(d.m)} fill={d.cor} />
      </>
    ),
    textura: ({ m, sombra }) => (
      <path d={cachinhosDe(m)} fill="none" stroke={sombra} strokeWidth={1.1} strokeLinecap="round" />
    ),
  },
  quadrado: {
    rotulo: 'Quadrado',
    lateral: 2.6,
    alto: 4.5,
    // o flat-top: reto em cima, com canto pequeno — no canto vivo ele lia
    // como chapéu de lego —, da largura da cabeça, e as laterais descendo
    // rentes até a orelha. A testa é reta, de canto curto
    atras: () => null,
    frente: (d) => {
      const T = d.m.topo - 4.5
      return capacete(d, {
        folga: 0.3,
        sobe: 4.5,
        lado: 2.6,
        testa: 0.2,
        raio: 2.5,
        copa: (Lo) => `L${50 - Lo} ${T + 3} Q${50 - Lo} ${T} ${50 - Lo + 3} ${T} L${50 + Lo - 3} ${T} Q${50 + Lo} ${T} ${50 + Lo} ${T + 3}`,
      })
    },
  },
  careca: {
    rotulo: 'Careca',
    alto: 0,
    // careca é sem cabelo nenhum, e sem lateral para escolher: duas faixas
    // sozinhas dos lados liam como tufos (e, antes, como fone de ouvido)
    semEscolhaDeLateral: true,
    atras: () => null,
    frente: () => null,
  },
  curto: {
    rotulo: 'Curto',
    lateral: 3.6,
    alto: 2,
    // o antigo degradê (v0.30): o militar da referência, o topo pintado
    // dentro da cabeça e a testa baixa de cantos redondos. Custou seis
    // versões, contadas no CLAUDE.md
    atras: () => null,
    frente: (d) => rente(d, { folga: 0.5, sobe: 0, lado: 3.6, testa: 0.2, raio: 6, copa: copaQuadrada(d.m) }),
  },
  chanel: {
    rotulo: 'Chanel',
    alto: 6,
    semEscolhaDeLateral: true,
    sobChapeu: { atras: comprimentoSobChapeu((m) => m.queixo + 2, 3), lados: null },
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
    lateral: 3,
    alto: 3,
    // o cabelo puxado para trás: testa em arco liso e laterais rentes até a
    // orelha. Atrás, só o coque
    atras: ({ m, cor }) => <circle cx="50" cy={m.topo - 5} r={m.larg * 0.36} fill={cor} />,
    frente: (d) => capacete(d, { folga: 0.3, sobe: 3, lado: 3, testa: 0.22, raio: 7, linha: testaPuxada }),
  },
  // os três crespos. A receita tem sete tons de pele, até o ébano: faltava
  // cabelo crespo
  blackPower: {
    rotulo: 'Black power',
    lateral: 3.6,
    alto: 12,
    atras: ({ m, cor }) => (
      <path d={bordaCrespa(50, m.topo + altura(m) * 0.3, m.larg + 10, altura(m) * 0.55, 16, 0.045)} fill={cor} />
    ),
    frente: (d) => (
      <>
        {faixas(d, 3.6, d.m.topo + altura(d.m) * 0.2)}
        <path d={linhaRedondaDe(d.m, 0.25, 1)} fill={d.cor} />
      </>
    ),
  },
  puff: {
    rotulo: 'Puff',
    lateral: 3.6,
    alto: 3,
    atras: ({ m, cor }) => <path d={bordaCrespa(50, m.topo - 3, m.larg * 0.55, m.larg * 0.5, 11, 0.06)} fill={cor} />,
    frente: (d) => (
      <>
        {faixas(d, 3.6, d.m.topo + altura(d.m) * 0.2)}
        <path d={linhaRedondaDe(d.m, 0.25, 1)} fill={d.cor} />
      </>
    ),
  },
  trancas: {
    rotulo: 'Tranças',
    alto: 4,
    semEscolhaDeLateral: true,
    sobChapeu: { atras: comprimentoSobChapeu(() => 100), lados: null },
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
  // ---- os novos da v0.30–v0.31: cosméticos à espera de o autor dizer
  // quais viram de todo mundo
  tigelinha: {
    rotulo: 'Tigelinha',
    alto: 3,
    semEscolhaDeLateral: true,
    // o corte de tigela (v0.31): a capa redonda RENTE à cabeça, a franja
    // reta logo acima da sobrancelha e a borda cortada em volta, subindo um
    // pouco de fora para dentro. A primeira passava da cabeça 1,6 dos lados
    // e descia reta até a metade do rosto: lia como capacete
    atras: () => null,
    frente: ({ m, cor }) => {
      const a = altura(m)
      const yF = m.topo + a * 0.28
      const yL = m.topo + a * 0.42
      const L = meia(m, 0.6)
      const Li = m.larg - 2.6
      return (
        <path
          d={`${capaDe(m, 0.6, 3.5, yL, yL)} Q${50 + Li + 0.6} ${yL} ${50 + Li} ${yL - 2.4} L${50 + Li} ${yF + 1.6} Q${50 + Li} ${yF} ${50 + Li - 1.6} ${yF} L${50 - Li + 1.6} ${yF} Q${50 - Li} ${yF} ${50 - Li} ${yF + 1.6} L${50 - Li} ${yL - 2.4} Q${50 - Li - 0.6} ${yL} ${50 - L} ${yL} Z`}
          fill={cor}
        />
      )
    },
  },
  moicano: {
    rotulo: 'Moicano',
    lateral: 2.6,
    alto: 0,
    // uma crista só, lisa: a base na testa, os lados curvos subindo até uma
    // ponta penteada para trás. A de pontas repicadas lia como coroa. Os
    // lados da cabeça são os da escolha — raspado é "sem lateral"
    atras: () => null,
    frente: (d) => {
      const { m } = d
      const w = m.larg * 0.3
      const T = m.topo
      const yT = T + altura(m) * 0.19
      return (
        <>
          {faixas(d, 2.6, T + altura(m) * 0.16)}
          <path
            d={`M${50 - w} ${yT} C${50 - w} ${T + 1} ${50 - 3} ${T - 7} ${50 + 2.5} ${T - 13} C${50 + 2} ${T - 6} ${50 + w} ${T + 1} ${50 + w} ${yT} Q50 ${yT - 2.4} ${50 - w} ${yT} Z`}
            fill={d.cor}
          />
        </>
      )
    },
  },
  rabo: {
    rotulo: 'Rabo de cavalo',
    lateral: 3,
    alto: 2.5,
    // puxado para trás como o coque (v0.31): o rabo sai do ALTO da cabeça,
    // preso, aparece por cima dela como um volume e cai pelo lado direito,
    // largo e afinando, até passar do queixo. O de antes era um fio colado
    // na lateral, e lia como uma mecha solta
    atras: ({ m, cor, sombra }) => {
      const L = m.larg
      const T = m.topo
      const a = altura(m)
      return (
        <>
          <path
            d={`M${50 - L * 0.1} ${T + 2} C${50 + L * 0.1} ${T - 9} ${50 + L * 0.9} ${T - 9} ${50 + L + 6} ${T + a * 0.1} C${50 + L + 11} ${T + a * 0.4} ${50 + L + 8} ${m.queixo} ${50 + L + 3} ${m.queixo + 10} C${50 + L + 4} ${m.queixo - 6} ${50 + L + 1} ${T + a * 0.35} ${50 + L * 0.5} ${T + 6} Z`}
            fill={cor}
          />
          <ellipse cx={50 + L * 0.3} cy={T - 3.6} rx={2.6} ry={2} fill={sombra} />
        </>
      )
    },
    frente: (d) => capacete(d, { folga: 0.3, sobe: 2.5, lado: 3, testa: 0.22, raio: 7, linha: testaPuxada }),
  },
  // os divididos no meio (v0.31): curto até a orelha, médio até o queixo e
  // longo caindo atrás dos ombros
  repartidoCurto: {
    rotulo: 'Repartido curto',
    alto: 4,
    semEscolhaDeLateral: true,
    atras: () => null,
    frente: (d) => (
      <>
        <path d={repartidoDe(d.m, fimDoLado(d.m) + 2)} fill={d.cor} />
        {riscaDe(d)}
      </>
    ),
  },
  repartidoMedio: {
    rotulo: 'Repartido médio',
    alto: 4,
    semEscolhaDeLateral: true,
    sobChapeu: { atras: comprimentoSobChapeu((m) => m.queixo + 2, 3), lados: null },
    atras: ({ m, cor }) => {
      const yb = m.queixo + 4
      return <path d={`${capaDe(m, 3, 4, yb, yb)} Z`} fill={cor} />
    },
    frente: (d) => (
      <>
        <path d={repartidoDe(d.m, d.m.queixo - 6)} fill={d.cor} />
        {riscaDe(d)}
      </>
    ),
  },
  repartidoLongo: {
    rotulo: 'Repartido longo',
    alto: 7,
    semEscolhaDeLateral: true,
    sobChapeu: { atras: comprimentoSobChapeu(() => 100), lados: null },
    atras: ({ m, cor }) => <path d={silhuetaDe(m)} fill={cor} />,
    frente: (d) => (
      <>
        <path d={repartidoDe(d.m, d.m.queixo - 2)} fill={d.cor} />
        {riscaDe(d)}
      </>
    ),
    mechas: true,
  },
  // ---- de Halloween
  frankenstein: {
    rotulo: 'Frankenstein',
    lateral: 2.6,
    alto: 8,
    // o flat-top alto e quadrado do monstro, a franja em dentes na testa e
    // os PARAFUSOS no pescoço (v0.31), que é o que diz Frankenstein
    atras: () => null,
    frente: (d) => {
      const { m } = d
      const T = m.topo - 8
      const y = m.queixo + 4.5
      return (
        <>
          {capacete(d, {
            folga: 1,
            sobe: 8,
            lado: 2.6,
            testa: 0.2,
            raio: 0,
            copa: (Lo) => `L${50 - Lo} ${T + 1.5} Q${50 - Lo} ${T} ${50 - Lo + 1.5} ${T} L${50 + Lo - 1.5} ${T} Q${50 + Lo} ${T} ${50 + Lo} ${T + 1.5}`,
            linha: linhaEmDentes,
          })}
          {[-1, 1].map((s) => {
            const x = 50 + s * (m.pescocoLarg - 0.6)
            return (
              <g key={s}>
                <rect x={s > 0 ? x : x - 5} y={y - 1.8} width={5} height={3.6} rx={0.6} fill="#9aa1a7" />
                <rect x={s > 0 ? x + 4 : x - 6.6} y={y - 3.2} width={2.6} height={6.4} rx={0.8} fill="#6d7378" />
              </g>
            )
          })}
        </>
      )
    },
  },
  vampiro: {
    rotulo: 'Vampiro',
    lateral: 3,
    alto: 2,
    // penteado para trás, rente, com o BICO no meio da testa — é o bico que
    // diz vampiro, do tamanho de ler em 32px
    atras: () => null,
    frente: (d) =>
      capacete(d, {
        folga: 0.3,
        sobe: 2,
        lado: 3,
        testa: 0.2,
        raio: 5,
        linha: (Li, yT, R) =>
          `Q${50 + Li} ${yT} ${50 + Li - R} ${yT - 1} L${50 + 4.5} ${yT - 1.6} L50 ${yT + 6.5} L${50 - 4.5} ${yT - 1.6} L${50 - Li + R} ${yT - 1} Q${50 - Li} ${yT} ${50 - Li} ${yT + R}`,
      }),
  },
}

// -------------------------------------------------------------- acessórios

/**
 * Acessórios são a peça BARATA: vão soltos por cima de tudo, sem encaixe com
 * o cabelo nem com o rosto para errar — o oposto exato do cabelo, que custou
 * três tentativas.
 *
 * `aba` é a linha onde o chapéu pousa. Quem tem `aba` cobre a cabeça, e
 * embaixo dele aparecem só as laterais do cabelo (veja `sobChapeu`).
 */
export const ACESSORIOS: Record<Acessorio, {
  rotulo: string
  teste?: boolean
  aba?: (m: Medidas) => number
  /** `alto` é quanto o cabelo sobe acima da cabeça (`FormaCabelo.alto`):
   *  o que vai POR CIMA do cabelo, como chifres e orelhas, pousa nele. */
  desenhar: (m: Medidas, cor: string, sombra: string, alto: number) => ReactNode
}> = {
  nenhum: { rotulo: 'Nenhum', desenhar: () => null },
  bone: {
    rotulo: 'Boné',
    aba: (m) => m.topo + altura(m) * 0.2,
    // o boné da referência: copa em cúpula com dois gomos e botão, e a aba é
    // uma FAIXA curva de espessura constante, mais escura, atravessando a
    // testa de ponta a ponta e passando um pouco da cabeça. A versão
    // anterior desenhava a aba como meia-lua cheia caindo da copa, e ela
    // lia como uma segunda copa. A faixa faz a curva PARA CIMA — as pontas
    // descem e o meio sobe —, que é a aba vista de frente, de baixo. Curvada
    // para baixo, ela lia como sorriso e o boné virava tigela
    desenhar: (m, cor, sombra) => {
      const a = altura(m)
      const T = m.topo
      const y = T + a * 0.2
      const sobe = 3.4
      const C = m.larg + 2
      const A = m.larg + 4.2
      const alto = T - 8
      return (
        <>
          <path
            d={`M${50 - C} ${y + 1.4} C${50 - C} ${alto + 2} ${50 - C * 0.55} ${alto} 50 ${alto} C${50 + C * 0.55} ${alto} ${50 + C} ${alto + 2} ${50 + C} ${y + 1.4} Q50 ${y - sobe} ${50 - C} ${y + 1.4} Z`}
            fill={cor}
          />
          <path
            d={`M${50 - 2.6} ${alto + 1.4} Q${50 - C * 0.58} ${alto + 4} ${50 - C * 0.55} ${y - 1} M${50 + 2.6} ${alto + 1.4} Q${50 + C * 0.58} ${alto + 4} ${50 + C * 0.55} ${y - 1}`}
            fill="none"
            stroke={sombra}
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.7}
          />
          <circle cx="50" cy={alto + 0.6} r="2" fill={sombra} />
          <path
            d={`M${50 - A} ${y + 1.8} Q50 ${y - sobe - 0.4} ${50 + A} ${y + 1.8}`}
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
          {/* a aba é RETA (v0.30): de frente, a aba de um chapéu é uma
              faixa, e a elipse cheia lia como chapéu visto de cima */}
          <rect x={50 - L - 12.5} y={y - 1.4} width={(L + 12.5) * 2} height={3.4} rx={1.7} fill={cor} />
          <path d={`M${50 - L} ${y} A${L} ${a * 0.38} 0 0 1 ${50 + L} ${y} Z`} fill={cor} />
          <path d={`M${50 - L} ${y - 3} h${L * 2} v3 h${-L * 2} Z`} fill={sombra} />
        </>
      )
    },
  },
  bruxa: {
    rotulo: 'Chapéu de bruxa',
    // v0.32: a COPA desce reta, da largura da cabeça, até o alto dela, e só
    // então afina no cone que entorta na ponta. Afinando desde a aba, os
    // cantos do rosto quadrado apareciam dos lados do cone. A aba é larga e
    // grossa, como de chapéu de bruxa, na altura da do chapéu (pelo mesmo
    // motivo da sobrancelha); a ponta pode sair do quadro
    aba: (m) => m.topo + altura(m) * 0.22,
    desenhar: (m, cor, sombra) => {
      const a = altura(m)
      const T = m.topo
      const y = T + a * 0.22
      const B = m.larg + 0.8
      const ponta = T - a * 0.48
      return (
        <>
          <path
            d={`M${50 - B} ${y} L${50 - B} ${T + 2} Q${50 - B} ${T - 2.5} ${50 - B * 0.68} ${T - 3.5} C${50 - B * 0.34} ${T - a * 0.2} ${46} ${ponta + a * 0.18} ${58} ${ponta} C${53} ${ponta + a * 0.2} ${50 + B * 0.38} ${T - a * 0.2} ${50 + B * 0.68} ${T - 3.5} Q${50 + B} ${T - 2.5} ${50 + B} ${T + 2} L${50 + B} ${y} Z`}
            fill={cor}
          />
          <rect x={50 - B} y={y - 4.6} width={B * 2} height={4.6} fill={sombra} />
          <rect x={47.2} y={y - 4.9} width={5.6} height={5.2} rx={0.8} fill="none" stroke="#d8a93c" strokeWidth={1.1} />
          <rect x={50 - m.larg - 12} y={y - 1.4} width={(m.larg + 12) * 2} height={5} rx={2.5} fill={cor} />
        </>
      )
    },
  },
  gorro: {
    rotulo: 'Gorro',
    // o gorro de lã: a copa redonda rente à cabeça e a barra dobrada mais
    // escura, reta, na testa. Aperta o cabelo como o chapéu (`aba`)
    aba: (m) => m.topo + altura(m) * 0.2,
    desenhar: (m, cor, sombra) => {
      const L = m.larg + 1.2
      const y = m.topo + altura(m) * 0.2
      return (
        <>
          <path d={`M${50 - L} ${y} C${50 - L} ${m.topo - 12} ${50 + L} ${m.topo - 12} ${50 + L} ${y} Z`} fill={cor} />
          <rect x={50 - L - 0.6} y={y - 4.2} width={(L + 0.6) * 2} height={6} rx={2.4} fill={sombra} />
          <circle cx="50" cy={m.topo - 8.6} r="3" fill={sombra} />
        </>
      )
    },
  },
  chifres: {
    rotulo: 'Chifres',
    // dois chifrinhos vermelhos POR CIMA do cabelo (v0.31): nascem onde o
    // cabelo acaba (`alto`), e não no alto da cabeça — no flat-top eles
    // afundavam no cabelo. Sem `aba`: o cabelo aparece inteiro
    desenhar: (m, _cor, _sombra, alto) => (
      <>
        {[-1, 1].map((s) => {
          const x = 50 + s * m.larg * 0.55
          const y = m.topo - alto + 2.5
          return (
            <path
              key={s}
              d={`M${x - s * 3.4} ${y} Q${x - s * 2.6} ${y - 6.5} ${x + s * 2.8} ${y - 11} Q${x + s * 1.4} ${y - 5.5} ${x + s * 3.2} ${y} Z`}
              fill="#c0392b"
            />
          )
        })}
      </>
    ),
  },
  orelhasDeGato: {
    rotulo: 'Orelhas de gato',
    // só as orelhas, sem tiara (v0.31), pousadas no alto do cabelo: um
    // triângulo de lados curvos inclinado para fora, com o miolo mais claro.
    // A cor é escolha (`corOrelhas`), e uma das opções é a do cabelo
    desenhar: (m, cor, _sombra, alto) => {
      const T = m.topo - alto + 1.5
      return (
        <>
          {[-1, 1].map((s) => {
            const x = 50 + s * m.larg * 0.56
            return (
              <g key={s} transform={`rotate(${s * 14} ${x} ${T})`}>
                <path d={`M${x - 6} ${T + 1} Q${x - 4.6} ${T - 7} ${x + s * 1.2} ${T - 12} Q${x + 4.6} ${T - 7} ${x + 6} ${T + 1} Z`} fill={cor} />
                <path d={`M${x - 3} ${T} Q${x - 2.2} ${T - 4.6} ${x + s * 0.6} ${T - 7.6} Q${x + 2.2} ${T - 4.6} ${x + 3} ${T} Z`} fill={clarear(cor, 0.5)} />
              </g>
            )
          })}
        </>
      )
    },
  },
  headset: {
    rotulo: 'Headset',
    // o fone de call center: arco por cima da cabeça, as duas conchas na
    // altura da orelha e o microfone descendo até a boca. Sem `aba`: ele não
    // cobre o topo, e o cabelo aparece inteiro por baixo do arco. A cor é
    // preta ou branca (`corHeadset`): equipamento não veste roupa
    desenhar: (m, cor, sombra) => {
      const L = m.larg + 2
      const a = altura(m)
      const y = m.topo + a * 0.55
      const boca = m.topo + a * 0.81
      return (
        <g>
          <path
            d={`M${50 - L} ${y - 2} C${50 - L} ${m.topo - 13} ${50 + L} ${m.topo - 13} ${50 + L} ${y - 2}`}
            fill="none"
            stroke={cor}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <rect x={50 - L - 3.2} y={y - 5.5} width={6} height={11} rx={2.6} fill={cor} stroke={sombra} strokeWidth={0.6} />
          <rect x={50 + L - 2.8} y={y - 5.5} width={6} height={11} rx={2.6} fill={cor} stroke={sombra} strokeWidth={0.6} />
          <path
            d={`M${50 - L + 1} ${y + 4} Q${50 - L + 2} ${boca + 1} ${50 - 7} ${boca}`}
            fill="none"
            stroke={cor}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <circle cx={50 - 6.5} cy={boca} r={1.9} fill={sombra} />
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
function pescoco({ m, pele, sombra, id }: DesenhoDeTronco): ReactNode {
  const N = m.pescocoLarg
  const y0 = m.queixo - 8
  const alto = m.ombro + 1.2 - y0
  // a sombra é recortada pelo pescoço: mais larga que ele, as pontas dela
  // apareciam dos dois lados, no fundo
  return (
    <>
      <defs>
        <clipPath id={`${id}-pescoco`}>
          <rect x={50 - N} y={y0} width={N * 2} height={alto} />
        </clipPath>
      </defs>
      <rect x={50 - N} y={y0} width={N * 2} height={alto} fill={pele} />
      <ellipse cx="50" cy={m.queixo + 0.5} rx={N + 0.6} ry={3.2} fill={sombra} clipPath={`url(#${id}-pescoco)`} />
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
  /** O feitio por dentro: a íris de sempre, ou uma das colecionáveis. */
  iris?: Iris
  /** Os cílios longos (colecionável): três fios no canto de fora. */
  cilios?: boolean
}

/**
 * Os fios dos cílios, cada um saindo de uma base e apontando para fora e
 * para cima (`ang`, em graus a partir da horizontal de FORA do olho). Em
 * coordenadas do próprio olho, então giram e piscam junto com ele.
 */
function fios(o: DesenhoDeOlho, bases: { x: number; y: number; ang: number }[]): ReactNode {
  return (
    <g stroke="#241f1b" strokeWidth={0.75} strokeLinecap="round">
      {bases.map((b, i) => {
        const a = (b.ang * Math.PI) / 180
        return <line key={i} x1={b.x} y1={b.y} x2={b.x + o.lado * Math.cos(a) * 1.9} y2={b.y - Math.sin(a) * 1.9} />
      })}
    </g>
  )
}

/** Os cílios na borda de cima do branco, do canto de fora para o meio. */
function ciliosNaBorda(o: DesenhoDeOlho, rx: number, ry: number): ReactNode {
  return fios(
    o,
    [18, 40, 62].map((g) => {
      const t = (g * Math.PI) / 180
      return { x: o.lado * rx * Math.cos(t), y: -ry * Math.sin(t), ang: 20 + g * 0.9 }
    }),
  )
}

/** A cor da íris. Escuras o bastante para ler em cima do branco no tamanho
 *  da lista; o âmbar é o da íris de gato que se espera. */
export const TONS_DOS_OLHOS: Record<CorDosOlhos, string> = {
  castanho: '#4a3524',
  escuro: '#241b14',
  mel: '#8a5a22',
  ambar: '#c08a1e',
  verde: '#4d7a3a',
  azul: '#3c6c9c',
  cinza: '#66737a',
  avela: '#7d6a2f',
  turquesa: '#2e8c8a',
  violeta: '#6a4f9e',
  vermelho: '#b8261c',
}


/**
 * O olho por dentro: o branco e a íris, no feitio da receita. Toda expressão
 * com íris passa por aqui (a amêndoa e companhia por `olhoComIris`, o "De
 * lado" direto), então a íris colecionável vale para todas sem uma linha por
 * expressão. O que se mexe ao olhar para os lados é o que leva `.iris`; o
 * olho todo preto e o todo colorido não têm íris, e por isso não olham.
 *
 * - gato: a íris de sempre com a fenda em pé no meio.
 * - réptil: o branco todo na cor da íris, clara, e só a fenda.
 * - preto e colorido: o olho inteiro de uma cor, sem íris nenhuma.
 */
function miolo(
  o: DesenhoDeOlho,
  branco: { rx: number; ry: number },
  iris: { cx: number; cy: number; rx: number; ry: number },
  /** Se a íris olha para os lados quando o avatar está vivo. O "De lado"
   *  não: a íris dele já mora encostada no canto, e andar mais a poria
   *  para fora do branco. */
  olha = true,
): ReactNode {
  const daIris = olha ? styles.iris : undefined
  const cilios = o.cilios ? ciliosNaBorda(o, branco.rx, branco.ry) : null
  const tipo = o.iris ?? 'normal'
  if (tipo === 'preto') return <>{cilios}<ellipse rx={branco.rx} ry={branco.ry} fill="#1d1916" /></>
  if (tipo === 'colorido') return <>{cilios}<ellipse rx={branco.rx} ry={branco.ry} fill={clarear(o.cor, 0.12)} /></>
  // o de gato (v0.30, que engoliu o de réptil): a ÍRIS é que é pontuda, uma
  // fenda em pé na cor dos olhos. A pupila preta por dentro saiu — o jogo
  // não tem pupila em olho nenhum, e com ela o gato destoava dos outros
  const topo = iris.cy - iris.ry * 1.08
  const fundo = iris.cy + iris.ry * 1.08
  const largo = iris.rx * 1.25
  return (
    <>
      {cilios}
      <ellipse rx={branco.rx} ry={branco.ry} fill={BRANCO_DO_OLHO} />
      <g className={daIris}>
        {tipo === 'gato' ? (
          <path
            d={`M${iris.cx} ${topo} Q${iris.cx + largo} ${iris.cy} ${iris.cx} ${fundo} Q${iris.cx - largo} ${iris.cy} ${iris.cx} ${topo} Z`}
            fill={o.cor}
          />
        ) : (
          <ellipse cx={iris.cx} cy={iris.cy} rx={iris.rx} ry={iris.ry} fill={o.cor} />
        )}
      </g>
    </>
  )
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
      {miolo(o, { rx: f.rx, ry: f.ry }, { cx: f.ix * -o.lado, cy: f.iy, rx: f.irx, ry: f.iry })}
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
  // com pálpebra, os cílios saem da borda dela, e não do branco (que ela
  // cobre): por isso o olho de baixo é desenhado sem eles
  return (
    <>
      {olhoComIris({ ...o, cilios: false }, AMENDOA)}
      <g transform={`translate(${o.x} ${o.y}) scale(${o.t})`}>
        <path d={`M${xf} -6 L${xd} -6 L${xd} ${dentro} L${xf} ${fora} Z`} fill={o.pele} />
        <path
          d={`M${xf * 0.84} ${em(0.08)} L${xd * 0.84} ${em(0.92)}`}
          stroke={o.sombra}
          strokeWidth={1.1}
          strokeLinecap="round"
          fill="none"
        />
        {o.cilios
          ? fios(o, [0.08, 0.2, 0.32].map((k, i) => ({ x: xf * 0.84 + (xd - xf) * (k - 0.08), y: em(k), ang: 35 + i * 22 })))
          : null}
      </g>
    </>
  )
}

/** A boca: a curva (positivo sorri, zero é reto, negativo desce), `'o'`
 *  aberta de espanto, `'torta'` subindo de um lado só, ou `'aberta'` — o
 *  sorriso de boca aberta da vitória. */
export type Boca = number | 'o' | 'torta' | 'aberta'

export const OLHOS: Record<Olhos, {
  rotulo: string
  teste?: boolean
  /** A boca da expressão. A boca já foi uma só — o sorriso —, e a surpresa
   *  sorria de espanto. */
  boca?: Boca
  /** As caras do estresse escolhidas no perfil: a amêndoa com o humor por
   *  cima. Na mesa elas não valem (veja o componente). */
  humor?: Humor
  /** A sobrancelha da expressão: `sobe` em unidades (negativo é para cima)
   *  e `giro` em graus — positivo levanta a ponta de DENTRO. O humor do
   *  estresse, quando aflito, passa por cima disto. */
  sobrancelha?: { sobe?: number; giro?: number }
  desenhar: (o: DesenhoDeOlho) => ReactNode
}> = {
  amendoa: {
    rotulo: 'Neutra',
    boca: 4.5,
    desenhar: (o) => olhoComIris(o, AMENDOA),
  },
  esperto: {
    rotulo: 'De lado',
    boca: 'torta',
    // a pálpebra reta e a íris encostada no canto: olhando de lado
    desenhar: (o) => (
      <g transform={`translate(${o.x} ${o.y}) rotate(${-8 * o.lado}) scale(${o.t})`}>
        {miolo({ ...o, cilios: false }, { rx: 5.8, ry: 4.3 }, { cx: -2.2 * o.lado, cy: 0.9, rx: 2.4, ry: 3.1 }, false)}
        <rect x={-6.8} y={-5.8} width={13.6} height={4.5} fill={o.pele} />
        <path d="M-5.5 -1.3 h11" stroke={o.sombra} strokeWidth={1.1} strokeLinecap="round" fill="none" />
        {o.cilios ? fios(o, [5.4, 4.1, 2.8].map((x, i) => ({ x: o.lado * x, y: -1.3, ang: 35 + i * 22 }))) : null}
      </g>
    ),
  },
  emPe: {
    // era o olho oval "em pé"; virou a amêndoa com a pálpebra caindo para o
    // lado do nariz, e a sobrancelha descendo junto
    rotulo: 'Decidida',
    boca: 0.8,
    sobrancelha: { sobe: 0.6, giro: -10 },
    desenhar: (o) => comPalpebra(o, -2.6, -0.3),
  },
  surpreso: {
    // a amêndoa mais aberta, quase sem giro, e a sobrancelha lá em cima
    rotulo: 'Surpresa',
    boca: 'o',
    sobrancelha: { sobe: -2.4 },
    desenhar: (o) => olhoComIris(o, { rx: 5.8, ry: 4.6, giro: 4, ix: 0.7, iy: 0, irx: 2.1, iry: 2.6 }),
  },
  feliz: {
    rotulo: 'Feliz',
    boca: 'aberta',
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
  // as caras do estresse, para o perfil: a amêndoa, e o humor faz o resto
  cansado: { rotulo: 'Cansada', humor: 'cansado', desenhar: (o) => olhoComIris(o, AMENDOA) },
  suando: { rotulo: 'Suando', humor: 'suando', desenhar: (o) => olhoComIris(o, AMENDOA) },
  chorando: { rotulo: 'Chorando', humor: 'chorando', desenhar: (o) => olhoComIris(o, AMENDOA) },
  burnout: { rotulo: 'Burnout', humor: 'burnout', desenhar: (o) => olhoComIris(o, AMENDOA) },
  vitoria: { rotulo: 'Vitória', humor: 'vitoria', desenhar: (o) => olhoComIris(o, AMENDOA) },
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
 * O LADO da barba é escolha (`ladoBarba`): a costeleta sobe até o cabelo
 * (`conecta`), sobe esmaecendo (`degrade`), ou não existe (`solta`). Ela era
 * só da cheia, e terminava num ponto fixo da têmpora que não batia com a
 * lateral de corte nenhum.
 *
 * **A barba é desenhada ANTES do cabelo da frente, e a costeleta sobe até a
 * linha do cabelo** (`costeletaAte`). Ela já terminou encostando no fim da
 * lateral do cabelo, e as duas peças — desenhadas sem saber uma da outra —
 * deixavam degrau, emenda e, com dois degradês, uma faixa de pele entre eles,
 * em centenas de combinações. Por baixo, o cabelo cobre o encontro: não
 * existe emenda para errar, e o cabelo degradê esmaecendo revela a barba,
 * que é o fade de verdade. Ela é mais estreita que a lateral mais estreita
 * dos cortes (2,6), para nunca aparecer ao lado dela. No careca, que não tem
 * lateral para cobri-la, ela para na orelha.
 */
export interface DesenhoDeBarba {
  m: Medidas
  cor: string
  pele: string
  /** A linha da boca: a barba se organiza em volta dela. */
  bocaY: number
  lado: LadoDaBarba
  /** Até onde a costeleta sobe: a linha do cabelo, por baixo dele. */
  costeletaAte: number
  /** A largura dela: a da lateral do corte, ou 2,6 nos cortes sem lateral. */
  costeletaLarg: number
  /** Para o gradiente da costeleta, único por avatar. */
  id: string
}

function mandibulaDe(m: Medidas, lados: number, meio: number, desce = 0): string {
  const { larg: L, queixo: Q, cantoX, cantoY } = m
  const fundo = Q + desce
  return `M${50 - L} ${lados} L${50 - L} ${Q - cantoY} Q${50 - L} ${fundo} ${50 - L + cantoX} ${fundo} L${50 + L - cantoX} ${fundo} Q${50 + L} ${fundo} ${50 + L} ${Q - cantoY} L${50 + L} ${lados} Q50 ${meio} ${50 - L} ${lados} Z`
}

/** Onde a costeleta que SOME SUBINDO já é transparente: um pouco acima do
 *  fim da lateral do cabelo. Acima disso ela continua existindo, invisível. */
function topoDaCosteleta(m: Medidas): number {
  return fimDoLado(m) - 4
}

/**
 * As duas costeletas, terminando EXATAMENTE na borda de cima da mandíbula:
 * a base de cada uma é o mesmo arco que a mandíbula faz entre `lados` e
 * `meio`, então as duas peças encostam sem se sobrepor — sobrepostas, a barba
 * por fazer (translúcida) ficava mais escura na emenda.
 */
function costeletasDe(m: Medidas, lados: number, meio: number, de: number, w: number): string {
  const L = m.larg
  const t = w / (2 * L)
  const yIn = (1 - t) ** 2 * lados + 2 * t * (1 - t) * meio + t * t * lados
  // o topo é arredondado para dentro: embaixo do cabelo ninguém o vê, e no
  // careca (onde ela para na orelha) o corte reto lia como um adesivo
  return [-1, 1]
    .map((s) => `M${50 + s * L} ${de} Q${50 + s * (L - w)} ${de} ${50 + s * (L - w)} ${de + w} L${50 + s * (L - w)} ${yIn} Q${50 + s * (L - w / 2)} ${(lados + yIn) / 2} ${50 + s * L} ${lados} Z`)
    .join(' ')
}

/**
 * Uma barba que cobre a mandíbula, com o lado escolhido. `opacidade` é o que
 * separa a por fazer (a cor da barba bem fraca) da cheia.
 */
function barbaComLado(d: DesenhoDeBarba, lados: number, meio: number, desce: number, opacidade = 1): ReactNode {
  const { m, cor, lado, id } = d
  const queixo = mandibulaDe(m, lados, meio, desce)
  const costeletas = costeletasDe(m, lados, meio, d.costeletaAte, d.costeletaLarg)
  if (lado === 'conecta') {
    // num caminho só: dois caminhos translúcidos escureceriam onde encostam
    return <path d={`${queixo} ${costeletas}`} fill={cor} opacity={opacidade} />
  }
  if (lado === 'solta') return <path d={queixo} fill={cor} opacity={opacidade} />
  return (
    <>
      <defs>
        <linearGradient id={`${id}-costeleta`} gradientUnits="userSpaceOnUse" x1="0" y1={topoDaCosteleta(m)} x2="0" y2={lados}>
          <stop offset="0" stopColor={cor} stopOpacity="0" />
          <stop offset="1" stopColor={cor} stopOpacity={opacidade} />
        </linearGradient>
      </defs>
      <path d={queixo} fill={cor} opacity={opacidade} />
      <path d={costeletas} fill={`url(#${id}-costeleta)`} />
    </>
  )
}

// mais largo e mais grosso do que era: com 12 de largura e 3 de altura ele
// sumia em 32px, e é nesse tamanho que o avatar vive na mesa
function bigodeDe(b: number): string {
  return `M42.5 ${b - 0.8} C43.5 ${b - 5.8} 48.6 ${b - 5.8} 50 ${b - 3.9} C51.4 ${b - 5.8} 56.5 ${b - 5.8} 57.5 ${b - 0.8} Q50 ${b - 2.9} 42.5 ${b - 0.8} Z`
}

/** O bigodão: largo, caindo nas pontas e cobrindo a boca inteira — a boca
 *  nem é desenhada (`escondeBoca`). */
function bigodaoDe(b: number): string {
  return `M39.6 ${b + 2.8} C39.4 ${b - 2.2} 44 ${b - 6.2} 50 ${b - 4.6} C56 ${b - 6.2} 60.6 ${b - 2.2} 60.4 ${b + 2.8} C59.2 ${b + 5} 56.6 ${b + 4} 55.2 ${b + 2.6} Q50 ${b + 1.4} 44.8 ${b + 2.6} C43.4 ${b + 4} 40.8 ${b + 5} 39.6 ${b + 2.8} Z`
}

const RALA = { lados: 0.64, meio: -4, desce: 0, opacidade: 0.26 }
const CHEIA = { lados: 0.62, meio: -4.5, desce: 3, opacidade: 1 }

function mandibula(d: DesenhoDeBarba, b: typeof RALA): ReactNode {
  return barbaComLado(d, d.m.topo + altura(d.m) * b.lados, d.bocaY + b.meio, b.desce, b.opacidade)
}

export const BARBAS: Record<Barba, {
  rotulo: string
  teste?: boolean
  /** Cobre a mandíbula, e por isso tem lado (`ladoBarba`). */
  temLado?: boolean
  /** Cobre a boca: ela nem é desenhada. */
  escondeBoca?: boolean
  desenhar: (d: DesenhoDeBarba) => ReactNode
}> = {
  nenhuma: { rotulo: 'Nenhuma', desenhar: () => null },
  rala: {
    rotulo: 'Por fazer',
    temLado: true,
    // a cor da barba, bem fraca, e só. Ela já foi um padrão de pontos — mais
    // "realista", e lia como rede na pele clara e como textura de tecido em
    // tamanho grande. Barba por fazer de desenho é sombra
    desenhar: (d) => mandibula(d, RALA),
  },
  cheia: {
    rotulo: 'Cheia',
    temLado: true,
    // sem recorte de pele em volta da boca: a boca é desenhada POR CIMA da
    // barba, na cor dela mais escura (`corDaBoca` no componente). O recorte
    // em elipse lia como uma máscara aberta. Ela desce 3 abaixo do queixo:
    // barba tem volume, e sem isso pareceria pintada no rosto
    desenhar: (d) => mandibula(d, CHEIA),
  },
  bigode: {
    rotulo: 'Bigode',
    desenhar: ({ cor, bocaY }) => <path d={bigodeDe(bocaY)} fill={cor} />,
  },
  bigodao: {
    rotulo: 'Bigodão',
    escondeBoca: true,
    desenhar: ({ cor, bocaY }) => <path d={bigodaoDe(bocaY)} fill={cor} />,
  },
  bigodaoRala: {
    rotulo: 'Bigodão e barba por fazer',
    temLado: true,
    escondeBoca: true,
    desenhar: (d) => (
      <>
        {mandibula(d, RALA)}
        <path d={bigodaoDe(d.bocaY)} fill={d.cor} />
      </>
    ),
  },
  bigodaoCheia: {
    rotulo: 'Bigodão e barba cheia',
    temLado: true,
    escondeBoca: true,
    // o bigodão por cima da cheia, num tom mais escuro: da mesma cor ele
    // sumia dentro dela
    desenhar: (d) => (
      <>
        {mandibula(d, CHEIA)}
        <path d={bigodaoDe(d.bocaY)} fill={escurecer(d.cor, 0.8)} />
      </>
    ),
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
}

// ------------------------------------------------------------------ óculos

/**
 * Óculos: a armação é escura por padrão, e a cor é escolha (`corOculos`).
 * As lentes são um véu branco quase transparente, em qualquer armação.
 */
export interface DesenhoDeOculos {
  m: Medidas
  /** O centro de cada olho — os óculos se medem pelos olhos, não pelo rosto. */
  olhoX: number
  olhoY: number
  t: number
  /** A cor da armação. */
  cor: string
}

export const TONS_DOS_OCULOS: Record<CorDosOculos, string> = {
  escuro: '#2b2622',
  roxo: '#7d5aa8',
  azul: '#2f5f9e',
  verde: '#4d7f3a',
  laranja: '#d9792b',
  vermelho: '#c6463d',
  rosa: '#e58fb8',
  creme: '#e4d6c3',
}

function lentes(d: DesenhoDeOculos, lente: (x: number) => ReactNode, meia: number): ReactNode {
  const { m, olhoX, olhoY: y } = d
  const e = 50 - olhoX
  const dd = 50 + olhoX
  return (
    <g stroke={d.cor} strokeWidth={1.3} strokeLinecap="round">
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
  // o primeiro cosmético de maleta. Lente ESCURA e cheia, no formato
  // clássico (topo reto, fundo arredondado): o que diz "óculos de sol" em
  // 24px é a mancha escura cobrindo o olho, não o desenho da armação — e
  // opaca: com transparência a íris aparecia por trás e lia como olho. Sem
  // reflexo, pelo mesmo motivo que a íris não tem brilho: num desenho
  // chapado, o único ponto de luz vira o assunto
  sol: {
    rotulo: 'Óculos de sol',
    desenhar: (d) => {
      const w = 7.2 * d.t
      const a = 4.4 * d.t
      const b = 5.2 * d.t
      return lentes(
        d,
        (x) => (
          <path
            d={`M${x - w} ${d.olhoY - a} H${x + w} C${x + w} ${d.olhoY + b * 0.4} ${x + w * 0.7} ${d.olhoY + b} ${x} ${d.olhoY + b} C${x - w * 0.7} ${d.olhoY + b} ${x - w} ${d.olhoY + b * 0.4} ${x - w} ${d.olhoY - a} Z`}
            fill="#1d1b20"
          />
        ),
        w,
      )
    },
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
  /** A boca do humor. Sem ela (o tranquilo), vale a da expressão escolhida. */
  boca?: Boca
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
  tranquilo: {},
  cansado: { boca: 1.8, olheira: true, fundo: '#ddc9a4' },
  suando: { boca: 0, olheira: true, suor: true, aflito: true, fundo: '#e3b48a' },
  chorando: { boca: -3, olheira: true, lagrima: true, aflito: true, fundo: '#df9a84' },
  burnout: { boca: -1.5, olhosX: true, aflito: true, fundo: '#c9705f' },
  vitoria: { boca: 'aberta', sorriso: true, fundo: '#bcd3a3' },
}

/** Luminância relativa de um `#rrggbb` (WCAG), para comparar cabelo e pele. */
/** A tinta que se lê em cima de uma cor: escura nas claras, clara nas escuras.
 *  É o texto em cima do fundo do avatar (o "Perfil" ativo da barra). */
export function tintaSobre(hex: string): string {
  return luminancia(hex) > 0.3 ? '#2b2622' : '#f6f1e7'
}

function luminancia(hex: string): number {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
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
  redondo,
  vivo,
  comCeu,
}: {
  avatar: Receita
  tamanho?: number
  className?: string
  /** Avatar em CÍRCULO (barra lateral, ranking): o enquadramento sobe e
   *  aperta um pouco, com cabeça e ombros. Com o quadro de sempre a cabeça
   *  ficava no alto do círculo; só com a cabeça, o corpo sumia. */
  redondo?: boolean
  /** Folga EM CIMA da cabeça (a capa do perfil e do início): o quadro se
   *  afasta, e o que passa do alto — o chapéu de bruxa, as orelhas de gato,
   *  os chifres, o topete — cabe inteiro. Sem ela, a ponta saía do quadro. */
  comCeu?: boolean
  /** Dev-only: usado pelo `/lab/avatar` para experimentar. */
  ajustes?: Ajustes
  /** A cara do momento — a mesa passa o do estresse. Sem ele, o de sempre. */
  humor?: Humor
  /** Respira, pisca e olha para o lado, bem de leve. Só onde ele é GRANDE
   *  (a capa, o crachá da mesa): numa lista, cinquenta rostos respirando
   *  juntos é inquietação, e em 32 px nem se vê. */
  vivo?: boolean
}) {
  // o degradê precisa de um id de gradiente, e o perfil desenha vários
  // avatares na mesma página: com id repetido, todos seriam pintados com a
  // cor do primeiro. Os dois-pontos do useId não sobrevivem a um `url(#...)`
  const id = `deg-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  // cada avatar começa o ciclo num ponto diferente, para dois lado a lado
  // não piscarem juntos. Sai do id, e não de `Math.random()`, porque o
  // HTML do build e o navegador precisam escrever o mesmo atraso
  const fase = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 997, 7) / 997

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
  // as orelhas de gato têm a cor delas (a do cabelo, por padrão); o resto
  // do que vai na cabeça usa a do chapéu
  const corAcessorio =
    ajustes?.cores?.acessorio ??
    (avatar.acessorio === 'orelhasDeGato'
      ? !avatar.corOrelhas || avatar.corOrelhas === 'cabelo'
        ? // na cor do cabelo, um tom abaixo: igual, a orelha virava mais um
          // calombo do cabelo, e não dava para ver onde ela começava
          escurecer(c, 0.86)
        : TONS_DE_CHAPEU[avatar.corOrelhas]
      : avatar.corChapeu && avatar.corChapeu !== 'roupa'
        ? TONS_DE_CHAPEU[avatar.corChapeu]
        : escurecer(roupa, 0.85))
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
  const escolhida = OLHOS[ajustes?.teste?.olhos ?? avatar.olhos] ?? OLHOS.amendoa
  // a expressão escolhida é a do perfil. Na mesa (`humor` dado) quem manda é
  // o estresse: uma cara de estresse escolhida no perfil vira a amêndoa, para
  // a run não começar em burnout
  const olhos = humor && escolhida.humor ? OLHOS.amendoa : escolhida
  const tronco = manequim
    ? TRONCOS.manequim
    : (TRONCOS[ajustes?.teste?.tronco ?? avatar.tronco] ?? TRONCOS.camiseta)
  const barba = BARBAS[ajustes?.teste?.barba ?? avatar.barba] ?? BARBAS.nenhuma
  const oculos = OCULOS[ajustes?.teste?.oculos ?? avatar.oculos] ?? OCULOS.nenhum
  const humorDaCara = humor ?? escolhida.humor
  const cara = humorDaCara ? HUMORES[humorDaCara] : undefined
  const boca: Boca = cara?.boca ?? olhos.boca ?? 4.5

  const chapeuY = acessorio.aba?.(m)
  const comChapeu = chapeuY !== undefined
  // a lateral é escolha, e cada corte desenha a SUA (veja `capacete`). Quem
  // não oferece a escolha (o careca, os compridos) a ignora
  const tipoDeLateral: TipoDeLateral = forma.semEscolhaDeLateral ? 'nenhuma' : (avatar.lateral ?? 'cabelo')
  const cabelo: DesenhoDeCabelo = { m, cor: c, sombra: cs, pele: p, id, lateral: tipoDeLateral }
  // com chapéu, só as LATERAIS do corte (veja `sobChapeu`), recortadas da
  // aba para baixo e dos lados do rosto para fora
  const recorteDoChapeu = comChapeu ? `url(#${id}-chapeu)` : undefined
  const sob = forma.sobChapeu
  const ladosSob = sob?.lados === null ? null : (sob?.lados ?? forma.frente)
  const atrasDoCabelo = comChapeu ? (sob?.atras?.(cabelo) ?? null) : forma.atras(cabelo)
  const frenteDoCabelo = comChapeu
    ? ladosSob
      ? <g clipPath={`url(#${id}-lados)`}>{ladosSob(cabelo)}</g>
      : null
    : forma.frente(cabelo)
  const texturaDoCabelo = comChapeu || !forma.textura ? null : forma.textura(cabelo)
  const corDaBarba =
    avatar.corBarba && avatar.corBarba !== 'cabelo' ? TONS_DE_CABELO[avatar.corBarba][0] : c
  // a boca dentro da barba cheia é da cor da barba, mais escura. Numa barba
  // quase preta "mais escuro" não existe, e a boca sumiria: ali ela clareia
  const corDaBoca =
    (avatar.barba === 'cheia' || avatar.barba === 'bigodaoCheia') && !manequim
      ? luminancia(corDaBarba) > 0.05
        ? escurecer(corDaBarba, 0.58)
        : clarear(corDaBarba, 0.4)
      : pss

  // SEM CONTORNO. Abaixo de 1,45:1 de contraste entre cabelo e pele (mel em
  // canela, branco em clara) o rosto ganhava borda, e o cabelo e a barba um
  // anel escuro. Foi recusado pelo autor: o traço preto em volta destoava de
  // um desenho todo chapado, e lia pior que a mancha que ele consertava. Não
  // volte com contorno — se o contraste for o problema, a saída é a cor.
  const rostoD = rostoDe(m)
  // a costeleta sobe por baixo do cabelo até a linha dele; no careca não há
  // cabelo para cobri-la, e ela para na orelha
  const costeletaAte = tipoDeLateral === 'nenhuma' ? fimDoLado(m) - 4 : topo + alt * 0.18

  // em 32px ou menos a figura ocupava metade do quadrado, e o resto era
  // fundo e ombro. Ali o desenho se aproxima da cabeça
  const caixa = redondo ? '6 4 88 88' : comCeu ? '-9 -18 118 118' : tamanho <= 32 ? '8 0 84 84' : '0 0 100 100'
  // o fundo esquenta com o estresse só na mesa: no perfil, uma cara de
  // estresse escolhida não troca o fundo que a pessoa escolheu
  const fundoDoHumor = (humor ? cara?.fundo : undefined) ?? fundo

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
      className={`${styles.moldura} ${redondo ? styles.redondo : ''} ${vivo && !manequim ? styles.vivo : ''} ${className ?? ''}`}
      style={{
        background: fundoDoHumor,
        width: tamanho,
        height: tamanho,
        ...(vivo && !manequim ? { '--fase': fase } : {}),
      } as CSSProperties}
    >
      <svg width={tamanho} height={tamanho} viewBox={caixa} role="img" aria-label="Avatar">
        <defs>
          {comChapeu ? (
            <>
              <clipPath id={`${id}-chapeu`}>
                <rect x={-20} y={chapeuY} width={140} height={140} />
              </clipPath>
              {/* as laterais: o que fica fora da testa. 4 por dentro do rosto
                  cobre a lateral mais larga dos cortes */}
              <clipPath id={`${id}-lados`}>
                <rect x={-20} y={-20} width={70 - larg + 4} height={140} />
                <rect x={50 + larg - 4} y={-20} width={70} height={140} />
              </clipPath>
            </>
          ) : null}
          {/* o rosto como recorte: o degradê e o espetado pintam DENTRO dele */}
          <clipPath id={`${id}-rosto`}>
            <path d={rostoD} />
          </clipPath>
        </defs>

        {/* 1. cabelo de trás, atrás de tudo. A respiração (`.cabeca`,
               `.peito`) mora em grupos POR FORA dos de sempre: a animação
               de CSS troca o `transform` do elemento, e no grupo de dentro
               ela apagaria o `escalar` */}
        <g className={styles.cabeca}>
          <g transform={escalar}>
            <g clipPath={recorteDoChapeu}>
              {manequim ? null : ajustes?.pecas?.silhueta ? (
                <path d={ajustes.pecas.silhueta} fill={c} />
              ) : (
                atrasDoCabelo
              )}
            </g>
          </g>
        </g>

        <g className={styles.peito}>
          {/* 2. pescoço, tronco e gola — os três juntos, porque se recortam */}
          {tronco.desenhar({ m, roupa, pele: p, sombra: ps, sombraForte: pss, rosto: rostoD, id })}

          {/* 2b. o crachá no cordão, por cima da roupa */}
          {avatar.cracha && !manequim ? crachaDe(m, tronco === TRONCOS.colado ? 'sem' : tronco === TRONCOS.golaAlta ? 'gola' : 'nu') : null}
        </g>

        <g className={styles.cabeca}>
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
          <path d={rostoD} fill={p} />

          {/* 4b. barba: DEPOIS do rosto e ANTES do cabelo da frente, que cai
                  por cima dela e cobre o encontro da costeleta com a lateral.
                  O nariz e a boca vêm depois, por cima */}
          {manequim ? null : (
            <g>{barba.desenhar({ m, cor: corDaBarba, pele: p, bocaY, lado: avatar.ladoBarba ?? 'conecta', costeletaAte, costeletaLarg: forma.lateral ?? 2.6, id })}</g>
          )}

          {/* 4c. os olhos: ANTES do cabelo da frente. Desenhados depois, a
                  pálpebra (que é pele) e os cílios pintavam por cima da
                  lateral do cabelo nos rostos estreitos. A sobrancelha
                  continua por cima de tudo, como em todo desenho */}
          {manequim
            ? null
            : [-1, 1].map((s) => {
                const x = 50 + s * olhoX
                return (
                  <g key={`olho${s}`}>
                    {cara?.olhosX ? (
                      <path
                        d={`M${x - 3.2} ${olhoY - 3.2} L${x + 3.2} ${olhoY + 3.2} M${x + 3.2} ${olhoY - 3.2} L${x - 3.2} ${olhoY + 3.2}`}
                        stroke="#241f1b"
                        strokeWidth={1.9}
                        strokeLinecap="round"
                      />
                    ) : (
                      // o piscar fecha o olho em volta do próprio centro. O
                      // feliz (dois arcos) já é olho fechado, e não pisca
                      <g
                        className={cara?.sorriso || olhos === OLHOS.feliz ? undefined : styles.olho}
                        style={{ transformOrigin: `${x}px ${olhoY}px` }}
                      >
                        {(cara?.sorriso ? OLHOS.feliz : olhos).desenhar({
                          x,
                          y: olhoY,
                          t: m.olho,
                          cor: ajustes?.cores?.olho ?? TONS_DOS_OLHOS[avatar.corOlhos] ?? TONS_DOS_OLHOS.castanho,
                          iris: avatar.iris,
                          cilios: avatar.cilios === 'longos',
                          lado: s,
                          pele: p,
                          sombra: ps,
                        })}
                      </g>
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

          {/* 5 e 6. cabelo da frente e mechas, num grupo só, com o recorte do
                 chapéu valendo para todos */}
          <g clipPath={recorteDoChapeu}>
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
              {/* a boca da expressão (ou a do humor, por cima). O bigodão a
                  cobre inteira, e ela nem é desenhada */}
              {barba.escondeBoca ? null : boca === 'aberta' ? (
                // o sorriso aberto é o que faz a alegria ler em 24 px — uma
                // curva mais funda não bastaria
                <path d={`M44 ${bocaY - 0.5} Q50 ${bocaY + 9} 56 ${bocaY - 0.5} Z`} fill={corDaBoca} />
              ) : boca === 'o' ? (
                <ellipse cx="50" cy={bocaY + 1.2} rx={2.3} ry={2.8} fill={corDaBoca} />
              ) : (
                <path
                  d={
                    boca === 'torta'
                      ? `M44.8 ${bocaY + 0.6} Q51 ${bocaY + 3.4} 55.6 ${bocaY - 1.6}`
                      : `M44.5 ${bocaY} Q50 ${bocaY + boca} 55.5 ${bocaY}`
                  }
                  fill="none"
                  stroke={corDaBoca}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}

              {/* 9. óculos, por cima dos olhos */}
              {oculos.desenhar({ m, olhoX, olhoY, t: m.olho, cor: TONS_DOS_OCULOS[avatar.corOculos] ?? TONS_DOS_OCULOS.escuro })}

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

          {/* 10b. brincos: uma argola presa no lobo da orelha, por cima do
                  rosto, do cabelo e da barba (é joia, vai por fora), e
                  ANTES do acessório — a concha do headset cobre a orelha e
                  esconde o brinco junto, que é o que aconteceria de verdade.
                  Numa orelha só, é a da direita de quem olha. Sem orelha
                  (`orelha` zero, manequim), sem brinco */}
          {m.orelha > 0 && !manequim && avatar.brinco && avatar.brinco !== 'nenhum'
            ? (avatar.brinco === 'um' ? [1] : [-1, 1]).map((s) => {
                const metal = avatar.corBrinco === 'prateado' ? '#c8ccd2' : '#d8a93c'
                const x = 50 + s * (larg + m.orelha * 0.4)
                const lobo = orelhaY + m.orelha * 0.78
                const r = m.orelha * 0.36
                return (
                  <g key={`brinco${s}`}>
                    <circle cx={x} cy={lobo + r} r={r} fill="none" stroke={metal} strokeWidth={m.orelha * 0.2} />
                    <circle cx={x} cy={lobo} r={m.orelha * 0.14} fill={escurecer(metal, 0.82)} />
                  </g>
                )
              })
            : null}

          {/* 11. acessório, por cima de tudo — é o que o torna barato */}
          {acessorio === ACESSORIOS.headset
            ? acessorio.desenhar(m, ...(avatar.corHeadset === 'branco' ? ['#ece8df', '#b5ae9f'] : ['#33302b', '#1c1a17']) as [string, string], forma.alto)
            : acessorio.desenhar(m, corAcessorio, sombraDoAcessorio, forma.alto)}
        </g>
        </g>
      </svg>
    </span>
  )
}
