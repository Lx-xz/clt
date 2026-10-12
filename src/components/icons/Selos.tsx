/**
 * Selos coloridos, e não ícones de traço: o token e a abóbora aparecem POR
 * CIMA de carta e de avatar, e um traço de 2px na cor do texto sumiria em
 * cima de qualquer um dos dois. São chapados, como o resto do jogo.
 */
interface PropsDoSelo {
  size?: number
  className?: string
}

/** O token da máquina: uma ficha dourada com a borda serrilhada de moeda e
 *  um "T" no meio. */
export function TokenIcon({ size = 20, className }: PropsDoSelo) {
  const dentes = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    return `${12 + Math.cos(a) * 11.2},${12 + Math.sin(a) * 11.2}`
  })
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <polygon points={dentes.join(' ')} fill="#b9831f" />
      <circle cx="12" cy="12" r="10" fill="#e3b23c" />
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="#b9831f" strokeWidth="1.3" />
      <path d="M8.6 8.8h6.8M12 8.8v6.8" stroke="#8a5f12" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** A abóbora de Halloween (jack-o'-lantern): o símbolo da coleção, no canto
 *  de cada peça dela. */
export function AboboraIcon({ size = 20, className }: PropsDoSelo) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 6.2c.2-1.6.9-2.8 2.2-3.4" stroke="#4f6b2c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <ellipse cx="7.6" cy="13.6" rx="5.6" ry="7" fill="#d9772b" />
      <ellipse cx="16.4" cy="13.6" rx="5.6" ry="7" fill="#d9772b" />
      <ellipse cx="12" cy="13.6" rx="5.2" ry="7.4" fill="#ec8c39" />
      <path d="M6.8 11.6l2.2-1.8 1 2.4zM17.2 11.6l-2.2-1.8-1 2.4z" fill="#3a2410" />
      <path d="M6.6 15.4c1.2 2.4 3.3 3.4 5.4 3.4s4.2-1 5.4-3.4l-1.8.7-1-1-1.3 1.1-1.3-1.1-1.3 1.1-1.3-1.1-1 1z" fill="#3a2410" />
    </svg>
  )
}

/** A máquina de vendas, no traço dos ícones da barra (24 × 24, traço 2):
 *  o gabinete, a vitrine com duas prateleiras, o painel e a boca de baixo. */
export function MaquinaIcon({ size = 24, className }: PropsDoSelo) {
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
      <rect x="4" y="2.5" width="16" height="19" rx="2" />
      <rect x="6.5" y="5" width="7.5" height="10" rx="0.8" />
      <path d="M6.5 10h7.5M16.8 6v1.2M16.8 9.2v1.2M7.5 18.5h6" />
    </svg>
  )
}
