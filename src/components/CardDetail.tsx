'use client'

import { useEffect } from 'react'
import type { ActionCard, EventCard } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Card from './Card'
import { RESOURCE_ICONS, nomeDaClasse } from './icons'
import styles from './CardDetail.module.sass'

/** Um número que a jogada mudaria: de quanto para quanto. */
export interface Consequencia {
  rotulo: string
  de: number
  para: number
  subirEhRuim?: boolean
}

interface CardDetailProps {
  card: ActionCard | EventCard
  /** Custo já ajustado pelo evento do dia, quando houver. */
  cost?: number
  onClose: () => void
  /** Ausente quando a carta não pode ser jogada agora (baralho, sem energia). */
  onPlay?: () => void
  /** Motivo de a carta não poder ser jogada, para o jogador não ficar no escuro. */
  blockedReason?: string
  /** O texto do botão de ação. A recompensa usa o mesmo detalhe para
   *  ESCOLHER a carta, e "Jogar carta" ali seria mentira. */
  rotuloAcao?: string
  /** O que jogar AGORA mudaria — no toque não há "passar por cima", e é
   *  aqui, antes do botão de jogar, que a decisão acontece. */
  consequencias?: Consequencia[]
  /** As consequências dependem da sorte: são um resultado possível. */
  incerta?: boolean
}

export default function CardDetail({
  card,
  cost,
  onClose,
  onPlay,
  blockedReason,
  rotuloAcao = 'Jogar carta',
  consequencias,
  incerta,
}: CardDetailProps) {
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
                <span className={styles.chip}>{nomeDaClasse(card.kind)}</span>
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
          {consequencias && consequencias.length > 0 ? (
            <div className={styles.consequencias}>
              <span className={styles.consequenciasTitulo}>
                Se jogar agora{incerta ? ' (um resultado possível — depende da sorte)' : ''}:
              </span>
              <ul>
                {consequencias.map((c) => {
                  const bom = c.subirEhRuim ? c.para < c.de : c.para > c.de
                  return (
                    <li key={c.rotulo}>
                      <span>{c.rotulo}</span>
                      <span className={bom ? styles.melhora : styles.piora}>
                        {c.de} → {c.para}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
          <div className={styles.acoes}>
            {onPlay ? (
              <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onPlay}>
                {rotuloAcao}
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
