'use client'

import { useEffect, type ReactNode } from 'react'
import { custosDe } from '@/game/custos'
import type { ActionCard, Custo, EventCard } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Card from '../Card'
import { TextoComIcones } from '../Dinheiro'
import { RESOURCE_ICONS, nomeDaClasse } from '../icons'
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
  /** Os custos além da energia já ajustados pelos eventos do dia. */
  custos?: Custo[]
  /** O que a página põe embaixo do texto — no baralho, as cópias e o
   *  histórico da carta. */
  children?: ReactNode
}

export default function CardDetail({ card, cost, custos, onClose, onPlay, blockedReason, children }: CardDetailProps) {
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
        <Card card={card} cost={custo ?? undefined} custos={custos} className={styles.carta} />
        <div className={styles.info}>
          <h2 className={styles.nome}>{card.name}</h2>
          <div className={styles.linha}>
            {evento ? (
              <span className={styles.chip}>evento {card.tone}</span>
            ) : (
              <>
                {/* o mesmo que o carimbo: sem custo, nenhum chip de custo */}
                {custo ? (
                  <span className={`${styles.chip} ${styles.chipEnergia}`}>
                    <Energia size={13} aria-hidden />
                    {custo} de energia
                    {custo !== card.cost ? ` (base ${card.cost})` : ''}
                  </span>
                ) : null}
                {(custos ?? custosDe(card)).map((c) => {
                  const Icone = RESOURCE_ICONS[c.qual]
                  return (
                    <span key={c.qual} className={`${styles.chip} ${styles[`chip_${c.qual}`]}`}>
                      <Icone size={13} aria-hidden />
                      {c.quanto} de {c.qual}
                    </span>
                  )
                })}
                {!custo && (custos ?? custosDe(card)).length === 0 ? <span className={styles.chip}>sem custo</span> : null}
                <span className={styles.chip}>{nomeDaClasse(card.kind)}</span>
              </>
            )}
          </div>
          <p className={styles.texto}>
            <TextoComIcones texto={card.text} />
          </p>
          {evento && card.choices
            ? card.choices.map((c) => (
                <p key={c.label} className={styles.nota}>
                  <strong>{c.label}:</strong> <TextoComIcones texto={c.text} />
                </p>
              ))
            : null}
          {blockedReason ? (
            <p className={styles.nota}>
              <TextoComIcones texto={blockedReason} />
            </p>
          ) : null}
          {children}
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
