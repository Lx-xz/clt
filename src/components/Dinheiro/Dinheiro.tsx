import { Fragment, type ReactNode } from 'react'
import { RESOURCE_ICONS } from '../icons'
import styles from './Dinheiro.module.sass'

/**
 * O dinheiro do jogo: o ícone da cédula e o número. NÃO é real — o jogo não
 * tem moeda, e "R$" em toda parte dizia o contrário. É o mesmo ícone do
 * medidor do HUD, então quem lê reconhece o recurso antes de ler o número.
 *
 * `sinal` é para entrada e saída ("+", "−"), que vêm antes do ícone, como
 * se lê em voz alta: "mais [cédula] 40".
 */
export default function Dinheiro({ valor, sinal, className }: {
  valor: number | string
  sinal?: '+' | '−'
  className?: string
}) {
  const Icone = RESOURCE_ICONS.dinheiro
  return (
    <span className={`${styles.dinheiro} ${className ?? ''}`}>
      {sinal}
      <Icone aria-hidden />
      {valor}
      <span className="sr-only"> de dinheiro</span>
    </span>
  )
}

// "+R$ 40", "−R$80", "R$ 300": o sinal é opcional. O espaço ANTES do "R$"
// só é engolido junto com o sinal — sem sinal ele é o espaço da frase
// ("você tem R$ 330"), e comê-lo grudava o ícone na palavra de antes.
// E `{estresse}`, `{energia}`…: o ícone do recurso, que a descrição
// automática das cartas põe antes do número ("+{estresse}1", v0.44)
const PADRAO = /(?:([+−-])\s*)?R\$\s*(\d+)|\{(energia|estresse|produtividade|dinheiro|advertencia)\}/g

const ICONE_DO_TOKEN = {
  energia: RESOURCE_ICONS.energia,
  estresse: RESOURCE_ICONS.estresse,
  produtividade: RESOURCE_ICONS.produtividade,
  dinheiro: RESOURCE_ICONS.dinheiro,
  advertencia: RESOURCE_ICONS.advertencias,
} as const

const NOME_DO_TOKEN: Record<keyof typeof ICONE_DO_TOKEN, string> = {
  energia: 'energia',
  estresse: 'estresse',
  produtividade: 'produtividade',
  dinheiro: 'dinheiro',
  advertencia: 'advertência',
}

/**
 * Texto que veio de DADO — o texto da carta, a frase do log, a nota do
 * changelog — com "R$ N" trocado pelo ícone. O texto das cartas mora no
 * banco, editado no /lab, e continua escrito com "R$": aqui "R$ N" é a
 * NOTAÇÃO de dinheiro, e quem a desenha é a tela. Trocar no banco obrigaria
 * a reescrever todas as cartas e todo log já gravado em run antiga.
 */
export function TextoComIcones({ texto }: { texto: string }): ReactNode {
  const partes: ReactNode[] = []
  let ultimo = 0
  for (const m of texto.matchAll(PADRAO)) {
    const i = m.index ?? 0
    if (i > ultimo) partes.push(texto.slice(ultimo, i))
    if (m[3]) {
      // o ícone na cor do medidor do recurso, como no HUD; o nome vai para
      // o leitor de tela
      const qual = m[3] as keyof typeof ICONE_DO_TOKEN
      const Icone = ICONE_DO_TOKEN[qual]
      partes.push(
        <span key={i} className={`${styles.recurso} ${styles[`tom_${qual}`]}`}>
          <Icone aria-hidden />
          <span className="sr-only">{NOME_DO_TOKEN[qual]} </span>
        </span>,
      )
    } else {
      const sinal = m[1] === '+' ? '+' : m[1] ? '−' : undefined
      partes.push(<Dinheiro key={i} valor={m[2]} sinal={sinal} />)
    }
    ultimo = i + m[0].length
  }
  if (partes.length === 0) return texto
  if (ultimo < texto.length) partes.push(texto.slice(ultimo))
  return <Fragment>{partes}</Fragment>
}

/** O mesmo texto para onde só cabe string (aria-label, title). */
export function textoSemReais(texto: string): string {
  return texto
    .replace(/([+−-]?)\{(energia|estresse|produtividade|dinheiro|advertencia)\}(\d+(?:d\d+(?:[+-]\d+)?)?)/g, (_, s: string, q: keyof typeof NOME_DO_TOKEN, n: string) => `${s}${n} de ${NOME_DO_TOKEN[q]}`)
    .replace(/\{(energia|estresse|produtividade|dinheiro|advertencia)\}/g, (_, q: keyof typeof NOME_DO_TOKEN) => NOME_DO_TOKEN[q])
    .replace(/(?:([+−-])\s*)?R\$\s*(\d+)/g, (_, s: string | undefined, n: string) => `${s === '+' ? '+' : s ? '−' : ''}${n} de dinheiro`)
}
