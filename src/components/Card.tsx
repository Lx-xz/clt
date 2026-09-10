'use client'

import type { ActionCard } from '@/game/types'
import styles from './Card.module.sass'

interface CardProps {
  card: ActionCard
  /** Custo já ajustado por eventos; cai no custo base quando ausente. */
  cost?: number
  onClick?: () => void
  disabled?: boolean
  locked?: boolean
  /** Sufixo no título, ex.: "x4" para múltiplas cópias. */
  count?: number
}

export default function Card({ card, cost, onClick, disabled, locked, count }: CardProps) {
  const classes = [styles.card]
  if (locked) classes.push(styles.locked)
  if (onClick && !disabled && !locked) classes.push(styles.clickable)
  if (disabled) classes.push(styles.disabled)

  const shownCost = cost ?? card.cost
  const raised = shownCost > card.cost

  const content = (
    <>
      <div className={styles.head}>
        <span className={styles.name}>
          {locked ? <span className={styles.badge}>🔒</span> : null}
          {card.name}
          {count && count > 1 ? <span className="mono"> ×{count}</span> : null}
        </span>
        <span className={styles.cost} style={raised ? { borderColor: 'var(--estresse)', color: 'var(--estresse)' } : undefined}>
          {shownCost}
        </span>
      </div>
      <p className={styles.text}>{card.text}</p>
      <span className={styles.kind}>{card.kind}</span>
    </>
  )

  if (!onClick || locked) {
    return <div className={classes.join(' ')}>{content}</div>
  }

  return (
    <button type="button" className={classes.join(' ')} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  )
}
