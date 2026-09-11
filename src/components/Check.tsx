'use client'

import { Check as Marca } from 'lucide-react'
import styles from './Check.module.sass'

/**
 * Caixa de marcar desenhada, porque a nativa não aceita cor nem tamanho de
 * forma confiável entre navegadores (e no iOS ela ignora quase tudo). O
 * `input` continua existindo, só que invisível: é ele que dá teclado, leitor
 * de tela e o rótulo clicável de graça.
 */
export default function Check({
  marcado,
  onChange,
  children,
  desabilitado = false,
}: {
  marcado: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
  desabilitado?: boolean
}) {
  return (
    <label className={`${styles.rotulo} ${desabilitado ? styles.desligado : ''}`}>
      <input
        type="checkbox"
        className={styles.nativo}
        checked={marcado}
        disabled={desabilitado}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.caixa} aria-hidden>
        <Marca size={13} strokeWidth={3.5} />
      </span>
      <span className={styles.texto}>{children}</span>
    </label>
  )
}
