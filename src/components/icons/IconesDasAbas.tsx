import { PenteIcon } from './icons'
import type { ReactNode } from 'react'

/**
 * Os ícones das abas do editor, desenhados à mão: o lucide não tem pente,
 * espelho nem boné de frente, e misturar os dele com desenhos nossos deixaria
 * a fileira com dois traços diferentes. Todos seguem a régua do `PenteIcon`
 * (24 × 24, traço 2, pontas redondas) — o pente É o da aba de cabelo.
 */
interface PropsDoIcone {
  size?: number
  className?: string
}

function Icone({ size = 24, className, children }: PropsDoIcone & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Rosto: o busto — a cabeça na caixa do rosto do avatar, e os ombros. */
export function RostoIcon(p: PropsDoIcone) {
  return (
    <Icone {...p}>
      <rect x="7.5" y="2.5" width="9" height="10.5" rx="4" />
      <path d="M4 21.5c0-4.2 3.6-6.3 8-6.3s8 2.1 8 6.3" />
    </Icone>
  )
}

/** Expressão: dois olhos, o nariz e a boca — sem o contorno do rosto. Os
 *  olhos são a amêndoa do avatar, com a íris encostada no lado do nariz: dois
 *  pontos liam como um emoji, e não como o rosto que se está editando. */
export function ExpressaoIcon(p: PropsDoIcone) {
  return (
    <Icone {...p}>
      <path d="M3.5 9.2Q7 5.6 10.5 9.2Q7 12.4 3.5 9.2Z" strokeWidth={1.6} />
      <path d="M13.5 9.2Q17 5.6 20.5 9.2Q17 12.4 13.5 9.2Z" strokeWidth={1.6} />
      <circle cx="8" cy="9.2" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9.2" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 11.6v2.8h-1.3" strokeWidth={1.6} />
      <path d="M8 17.6c2.4 2.1 5.6 2.1 8 0" />
    </Icone>
  )
}

export function CabeloIcon(p: PropsDoIcone) {
  return <PenteIcon size={p.size ?? 24} className={p.className} />
}

/** Barba: um bigode, em contorno como os outros ícones da fileira — cheio,
 *  ele pesava mais que todos os vizinhos. */
export function BarbaIcon(p: PropsDoIcone) {
  return (
    <Icone {...p}>
      <path
        d="M12 11.6c-1.3-1.7-3.4-2-4.9-.8-1.3 1.1-2.5 1.7-4.3 1.3.7 2.7 3.6 4 6.1 2.9 1.3-.6 2.3-1.4 3.1-2.3.8.9 1.8 1.7 3.1 2.3 2.5 1.1 5.4-.2 6.1-2.9-1.8.4-3-.2-4.3-1.3-1.5-1.2-3.6-.9-4.9.8z"
        strokeWidth={1.6}
      />
    </Icone>
  )
}

/** Roupa: a camiseta. */
export function RoupaIcon(p: PropsDoIcone) {
  return (
    <Icone {...p}>
      <path d="M8.5 3.5 4 5.8 2.5 10l3.5 1.4V21h12v-9.6l3.5-1.4L20 5.8l-4.5-2.3c-.6 1.5-1.9 2.4-3.5 2.4s-2.9-.9-3.5-2.4z" />
    </Icone>
  )
}

/** Extras: o boné de frente, com a aba curvando para cima como a do avatar. */
export function ExtrasIcon(p: PropsDoIcone) {
  return (
    <Icone {...p}>
      <path d="M4.5 15.5C4.5 9 7.8 5.5 12 5.5s7.5 3.5 7.5 10" />
      <path d="M2.5 17.5c6-3.2 13-3.2 19 0" />
      <path d="M12 5.5V4" />
      <path d="M9.2 6.6c-.9 2.4-1.2 5-1 7.7M14.8 6.6c.9 2.4 1.2 5 1 7.7" strokeWidth={1.4} />
    </Icone>
  )
}

/** Fundo: o espelho de pé — é onde a pessoa se vê. */
export function FundoIcon(p: PropsDoIcone) {
  return (
    <Icone {...p}>
      <ellipse cx="12" cy="9.5" rx="5.8" ry="7" />
      <path d="M9.6 6.8l2.4-2.3M9.4 10.2l4.4-4.2" strokeWidth={1.4} />
      <path d="M12 16.5v4.5M8.5 21h7" />
    </Icone>
  )
}
