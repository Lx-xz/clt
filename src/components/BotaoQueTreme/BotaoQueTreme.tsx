'use client'

import { useEffect, useState } from 'react'
import { EVENTO_VOLUME } from '@/data/som'
import { deveTremerNoToque } from '@/data/vibrar'
import styles from './BotaoQueTreme.module.sass'

/** Se o toque nos botões deste aparelho treme pelo interruptor nativo: só
 *  no iPhone com a vibração ligada. Vale depois de montar (no servidor não
 *  há aparelho), e muda junto com o ajuste. */
export function useTremeNoToque(): boolean {
  const [treme, setTreme] = useState(false)
  useEffect(() => {
    const ler = () => setTreme(deveTremerNoToque())
    ler()
    window.addEventListener(EVENTO_VOLUME, ler)
    return () => window.removeEventListener(EVENTO_VOLUME, ler)
  }, [])
  return treme
}

/**
 * Um botão que treme no iPhone (veja `vibrar.ts`). Fora do iPhone, ou com
 * a vibração desligada, é um `<button>` comum, e nada muda.
 *
 * No iPhone ele é um RÓTULO com um interruptor nativo transparente esticado
 * por cima: o dedo cai no interruptor, que alterna e treme, e a ação sai do
 * `change` dele — uma vez por toque. Um `<button>` não serve de casca: o
 * toque num botão não ativa o rótulo em volta dele. O teclado continua
 * funcionando pelo próprio rótulo (Enter e espaço).
 */
export default function BotaoQueTreme({
  className,
  onClick,
  disabled = false,
  children,
  ...aria
}: {
  className?: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  role?: string
  'aria-checked'?: boolean
  'aria-label'?: string
}) {
  const treme = useTremeNoToque()

  if (!treme) {
    return (
      <button type="button" className={className} onClick={onClick} disabled={disabled} {...aria}>
        {children}
      </button>
    )
  }

  return (
    <label
      className={`${className ?? ''} ${styles.rotulo}`}
      role={aria.role ?? 'button'}
      aria-checked={aria['aria-checked']}
      aria-label={aria['aria-label']}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled || (e.key !== 'Enter' && e.key !== ' ')) return
        e.preventDefault()
        onClick()
      }}
    >
      <input
        type="checkbox"
        className={styles.interruptor}
        {...{ switch: '' }}
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={onClick}
      />
      {children}
    </label>
  )
}
