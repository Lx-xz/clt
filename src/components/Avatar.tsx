'use client'

import type { ReactNode } from 'react'
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
 * Cada corte de cabelo é de UMA cor só, pela mesma razão: com dois tons, toda
 * emenda entre silhueta, franja e mecha vira um retângulo visível. A exceção
 * é o degradê, onde os dois tons são o ponto e uma forma fica INTEIRA dentro
 * da outra — sem emenda para aparecer.
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
 * Escurece um `#rrggbb`. Serve para a pele de teste do laboratório: as peles
 * do jogo vêm com os três tons escolhidos à mão, mas uma cor livre só tem o
 * primeiro — e sem sombra o nariz e a boca somem.
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
}

export const MEDIDAS: Record<Corpo, Medidas> = {
  homem: { larg: 23.5, topo: 15, queixo: 72, rx: 29, ry: 27, cy: 35, ombro: 77, meioOmbro: 9, cantoY: 12, cantoX: 11, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1 },
  mulher: { larg: 20, topo: 19, queixo: 72, rx: 26, ry: 25.5, cy: 38, ombro: 80, meioOmbro: 19, cantoY: 19, cantoX: 20, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1 },
  manequim: { larg: 20, topo: 20, queixo: 70, rx: 26, ry: 25.5, cy: 38, ombro: 80, meioOmbro: 17, cantoY: 20, cantoX: 20, escalaCabeca: 1, pescocoLarg: 6.5, pescocoAlt: 20, ombroBorda: 17, nariz: 1, sobrancelha: 2.4, olho: 1 },
}

// ------------------------------------------------------------------ cabelo

/**
 * As FORMAS de cabelo, como tabela.
 *
 * Antes o corte era um `if` dentro do componente — `longo ? silhueta :
 * elipse` —, o que queria dizer que todo corte novo era mais um ramo. Hoje é
 * uma linha aqui, pela mesma razão que as cartas viraram dado: acrescentar
 * conteúdo não pode exigir mexer na máquina.
 *
 * `teste: true` marca a forma que **o jogador não alcança**: ela existe só
 * para o `/lab/avatar` experimentar, porque a receita gravada no banco só
 * sabe dizer `curto` ou `longo`. Promover uma é acrescentar o valor em
 * `Corte` (`src/data/avatar.ts`) e um rótulo em `CORTES` — e nada mais,
 * porque `lerAvatar()` já cai no padrão diante de peça desconhecida.
 */
export type FormaDeCabelo = Corte | 'quadrado' | 'careca' | 'degrade'

export interface FormaCabelo {
  rotulo: string
  teste?: boolean
  /** Vai ATRÁS do rosto (e atrás do tronco). */
  atras: (m: Medidas, c: string, cs: string) => ReactNode
  /** Vai POR CIMA do rosto. */
  frente: (m: Medidas, c: string, cs: string) => ReactNode
  /** Mechas caindo na frente do ombro, para o comprimento não sumir. */
  mechas?: boolean
}

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

/** A franja reta dos cortes quadrados: uma barra na testa, sem arco. */
function franjaRetaDe(m: Medidas, altura: number): string {
  const { larg, topo } = m
  const x = larg + 1.5
  return `M${50 - x} ${topo - 2} h${x * 2} v${altura} q${-x} 3 ${-x * 2} 0 Z`
}

export const CABELOS_FORMA: Record<FormaDeCabelo, FormaCabelo> = {
  curto: {
    rotulo: 'Curto',
    atras: (m, c) => <ellipse cx="50" cy={m.cy} rx={m.rx} ry={m.ry} fill={c} />,
    frente: (m, c) => <path d={franjaDe(m)} fill={c} />,
  },
  longo: {
    rotulo: 'Longo',
    atras: (m, c) => <path d={silhuetaDe(m)} fill={c} />,
    frente: (m, c) => <path d={franjaDe(m)} fill={c} />,
    mechas: true,
  },
  quadrado: {
    rotulo: 'Quadrado',
    teste: true,
    // um bloco de cantos duros: o oposto da elipse, e é isso que o faz ler
    // como corte de máquina em vez de "cabelo com pouco volume"
    atras: (m, c) => (
      <path
        d={`M${50 - m.rx} ${m.cy + 12} L${50 - m.rx} ${m.topo - 4} q0 -6 6 -6 L${50 + m.rx - 6} ${m.topo - 10} q6 0 6 6 L${50 + m.rx} ${m.cy + 12} Z`}
        fill={c}
      />
    ),
    frente: (m, c) => <path d={franjaRetaDe(m, (m.queixo - m.topo) * 0.2)} fill={c} />,
  },
  careca: {
    rotulo: 'Careca',
    teste: true,
    // careca não é "sem cabelo": é a coroa que sobra nas laterais. Uma elipse
    // baixa e mais larga que o rosto — o miolo some debaixo dele e só as
    // bordas aparecem, que é exatamente o que se vê numa cabeça careca
    atras: (m, c) => (
      <ellipse
        cx="50"
        cy={m.topo + (m.queixo - m.topo) * 0.62}
        rx={m.larg + 3}
        ry={(m.queixo - m.topo) * 0.33}
        fill={c}
      />
    ),
    frente: () => null,
  },
  degrade: {
    rotulo: 'Degradê',
    teste: true,
    // os dois tons aqui são o ponto, e funcionam porque a forma clara fica
    // INTEIRA dentro da escura: não há emenda para virar retângulo visível
    atras: (m, c, cs) => (
      <>
        <ellipse cx="50" cy={m.cy} rx={m.rx} ry={m.ry} fill={cs} />
        <ellipse cx="50" cy={m.cy - 3} rx={m.rx * 0.86} ry={m.ry * 0.82} fill={c} />
      </>
    ),
    // sem franja: a barra reta do quadrado passava da massa de cabelo aqui,
    // porque a elipse é estreita perto do topo. As duas elipses já contam o
    // corte sozinhas
    frente: () => null,
  },
}

// -------------------------------------------------------------- acessórios

/**
 * Acessórios são a peça BARATA: vão soltos por cima de tudo, sem encaixe com
 * o cabelo nem com o rosto para errar — o oposto exato do cabelo, que custou
 * três tentativas. Todos são de teste por enquanto: a receita no banco não
 * tem campo para eles.
 */
export type Acessorio = 'nenhum' | 'bone' | 'chapeu'

export const ACESSORIOS: Record<Acessorio, {
  rotulo: string
  teste?: boolean
  desenhar: (m: Medidas, cor: string, sombra: string) => ReactNode
}> = {
  nenhum: { rotulo: 'Nenhum', desenhar: () => null },
  bone: {
    rotulo: 'Boné',
    teste: true,
    desenhar: (m, cor, sombra) => {
      const { rx, ry, cy } = m
      return (
        <>
          <path
            d={`M${50 + rx - 3} ${cy - 3} q18 1 15 7 q-2 3 -15 1 Z`}
            fill={sombra}
          />
          <path
            d={`M${50 - rx - 1} ${cy - 2} A${rx + 1} ${ry + 3} 0 0 1 ${50 + rx + 1} ${cy - 2} Z`}
            fill={cor}
          />
          <circle cx="50" cy={cy - ry - 1} r="2" fill={sombra} />
        </>
      )
    },
  },
  chapeu: {
    rotulo: 'Chapéu',
    teste: true,
    desenhar: (m, cor, sombra) => {
      const { rx, ry, cy } = m
      return (
        <>
          <ellipse cx="50" cy={cy - 1} rx={rx + 15} ry={6.5} fill={cor} />
          <path
            d={`M${50 - rx * 0.82} ${cy - 1} A${rx * 0.82} ${ry * 0.95} 0 0 1 ${50 + rx * 0.82} ${cy - 1} Z`}
            fill={cor}
          />
          <path
            d={`M${50 - rx * 0.8} ${cy - 3} h${rx * 1.6} v3 h${-rx * 1.6} Z`}
            fill={sombra}
          />
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
 * realista (branco, íris, pupila e um brilho) e ficou pior: em 24px o brilho
 * some, a pupila vira um ponto, e o rosto inteiro fica parecendo um decalque
 * de outro jogo. O que dá expressão num rosto chapado como este é:
 *
 *  1. **Forma grande e sólida.** Branco largo, íris de uma cor só, sem pupila
 *     e sem brilho — duas formas, e acabou.
 *  2. **Inclinação espelhada.** É o ângulo do olho, não o que tem dentro dele,
 *     que diz se o rosto está curioso, desconfiado ou surpreso. Por isso cada
 *     olho recebe o `lado` e gira ao contrário do outro.
 *  3. **A íris fora do centro.** Encostada no lado do nariz, o olhar converge
 *     e o rosto passa a olhar para quem vê. Centralizada, ele fica vazio.
 *
 * A pálpebra do olhar de lado é um retângulo da COR DA PELE por cima: como o
 * olho mora dentro do rosto, o que sobra dele fora do olho é invisível — não
 * precisa de recorte nenhum.
 */
export type Olhos = 'simples' | 'desenho' | 'surpreso' | 'esperto' | 'feliz'

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
    // o olho padrão do estilo: amêndoa inclinada para fora e para cima, íris
    // sólida encostada no nariz
    desenhar: ({ x, y, t, cor, lado }) => (
      <g transform={`translate(${x} ${y}) rotate(${-16 * lado}) scale(${t})`}>
        <ellipse rx={5.8} ry={4.3} fill={BRANCO_DO_OLHO} />
        <ellipse cx={-1.5 * lado} cy={0.2} rx={2.4} ry={3.1} fill={cor} />
      </g>
    ),
  },
  surpreso: {
    rotulo: 'Surpreso',
    teste: true,
    // redondo e alto, íris pequena e subida: o susto mora na proporção entre
    // as duas, não em linha nenhuma a mais
    desenhar: ({ x, y, t, cor, lado }) => (
      <g transform={`translate(${x} ${y}) scale(${t})`}>
        <ellipse rx={4.6} ry={5.2} fill={BRANCO_DO_OLHO} />
        <ellipse cx={-0.8 * lado} cy={-0.5} rx={2.2} ry={2.8} fill={cor} />
      </g>
    ),
  },
  esperto: {
    rotulo: 'De lado',
    teste: true,
    desenhar: ({ x, y, t, cor, lado, pele, sombra }) => (
      <g transform={`translate(${x} ${y}) rotate(${-8 * lado}) scale(${t})`}>
        <ellipse rx={5.8} ry={4.3} fill={BRANCO_DO_OLHO} />
        <ellipse cx={-2.2 * lado} cy={0.9} rx={2.4} ry={3.1} fill={cor} />
        {/* pálpebra: pele por cima. O que ela cobre fora do olho é pele
            também, então some sozinho — sem recorte */}
        <rect x={-6.8} y={-5.8} width={13.6} height={4.5} fill={pele} />
        <path
          d={`M-5.5 -1.3 h11`}
          stroke={sombra}
          strokeWidth={1.1}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    ),
  },
  feliz: {
    rotulo: 'Feliz',
    teste: true,
    // sem branco e sem íris: só o arco. É o olho mais expressivo dos cinco, e
    // o que tem menos desenho — a prova de que expressão aqui não é detalhe
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
  teste?: { cabelo?: FormaDeCabelo; acessorio?: Acessorio; olhos?: Olhos }
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
  const homem = avatar.corpo === 'homem'
  const m = { ...MEDIDAS[avatar.corpo], ...ajustes?.medidas }
  const { larg, topo, queixo, ombro, meioOmbro: mo, cantoY, cantoX } = m
  const alt = queixo - topo

  const forma = CABELOS_FORMA[ajustes?.teste?.cabelo ?? avatar.cabelo] ?? CABELOS_FORMA.curto
  const acessorio = ACESSORIOS[ajustes?.teste?.acessorio ?? 'nenhum'] ?? ACESSORIOS.nenhum
  const olhos = OLHOS[ajustes?.teste?.olhos ?? 'simples'] ?? OLHOS.simples

  const olhoX = larg * 0.47
  const olhoY = topo + alt * 0.53
  const sobY = topo + alt * 0.365
  const narizY = topo + alt * 0.62
  const bocaY = topo + alt * 0.81
  const sl = larg * 0.5

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
            forma.atras(m, c, cs)
          )}
        </g>

        {/* 2. pescoço ANTES do ombro: é o ombro que o recorta. Depois dele,
               os cantos da gola deixavam lascas de pele aparecendo. */}
        <path
          d={`M${50 - m.pescocoLarg} ${queixo - 8} h${m.pescocoLarg * 2} v${m.pescocoAlt} h${-m.pescocoLarg * 2} Z`}
          fill={ps}
        />

        {/* 3. tronco: só o topo, encostando na borda de baixo */}
        <path
          d={`M${mo} 100 C${mo} ${ombro + 6} ${mo + m.ombroBorda} ${ombro} 50 ${ombro} C${100 - mo - m.ombroBorda} ${ombro} ${100 - mo} ${ombro + 6} ${100 - mo} 100 Z`}
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

        <g transform={escalar}>
          {/* 5. rosto */}
          <path
            d={`M${50 - larg} ${topo + cantoY} Q${50 - larg} ${topo} ${50 - larg + cantoX} ${topo} L${50 + larg - cantoX} ${topo} Q${50 + larg} ${topo} ${50 + larg} ${topo + cantoY} L${50 + larg} ${queixo - cantoY} Q${50 + larg} ${queixo} ${50 + larg - cantoX} ${queixo} L${50 - larg + cantoX} ${queixo} Q${50 - larg} ${queixo} ${50 - larg} ${queixo - cantoY} Z`}
            fill={p}
          />

          {/* 6. cabelo da frente — no corte comprido a borda de fora é um
                 arco da própria silhueta */}
          {manequim ? null : ajustes?.pecas?.franja ? (
            <path d={ajustes.pecas.franja} fill={c} />
          ) : (
            forma.frente(m, c, cs)
          )}

          {/* 7. mechas da frente, para o comprimento não sumir atrás do ombro */}
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

          {/* 8. rosto: olho, nariz, boca. O manequim não tem nenhum dos três —
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

          {/* 9. acessório, por cima de tudo — é o que o torna barato */}
          {acessorio.desenhar(m, corAcessorio, escurecer(corAcessorio, 0.72))}
        </g>
      </svg>
    </span>
  )
}
