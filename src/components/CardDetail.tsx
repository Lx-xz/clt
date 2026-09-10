'use client'

import { useEffect } from 'react'
import type { ActionCard, EventCard } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Card from './Card'
import { RESOURCE_ICONS } from './icons'
import styles from './CardDetail.module.sass'

interface CardDetailProps {
  card: ActionCard | EventCard
  /** Custo já ajustado pelo evento do dia, quando houver. */
  cost?: number
  onClose: () => void
  /** Ausente quando a carta não pode ser jogada agora (baralho, sem energia). */
  onPlay?: () => void
  /** Motivo de a carta não poder ser jogada, para o jogador não ficar no escuro. */
  blockedReason?: string
}

export default function CardDetail({ card, cost, onClose, onPlay, blockedReason }: CardDetailProps) {
  const evento = 'tone' in card
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Energia = RESOURCE_ICONS.energia
  const custo = evento ? null : (cost ?? card.cost)

  return (
    <div
      className={styles.fundo}
      role="dialog"
      aria-modal="true"
      aria-label={card.name}
      onClick={onClose}
    >
      <div className={styles.painel} onClick={(e) => e.stopPropagation()}>
        <Card card={card} cost={custo ?? undefined} className={styles.carta} />
        <div className={styles.info}>
          <h2 className={styles.nome}>{card.name}</h2>
          <div className={styles.linha}>
            {evento ? (
              <span className={styles.chip}>evento {card.tone}</span>
            ) : (
              <>
                <span className={`${styles.chip} ${styles.chipEnergia}`}>
                  <Energia size={13} aria-hidden />
                  {custo} de energia
                  {custo !== card.cost ? ` (base ${card.cost})` : ''}
                </span>
                <span className={styles.chip}>{card.kind}</span>
              </>
            )}
          </div>
          <p className={styles.texto}>{card.text}</p>
          {evento && card.choices
            ? card.choices.map((c) => (
                <p key={c.label} className={styles.nota}>
                  <strong>{c.label}:</strong> {c.text}
                </p>
              ))
            : null}
          {blockedReason ? <p className={styles.nota}>{blockedReason}</p> : null}
          <div className={styles.acoes}>
            {onPlay ? (
              <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onPlay}>
                Jogar carta
              </button>
            ) : null}
            <button type="button" className={buttons.button} onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
