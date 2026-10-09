'use client'

import type { GameState } from '@/game/types'
import Dialogo from './Dialogo'
import LinhaDoTempo from './LinhaDoTempo'
import styles from './HistoricoDaRun.module.sass'

/**
 * Tudo o que aconteceu nesta run, dia a dia, com as cartas desenhadas.
 *
 * O jogo escrevia esse histórico desde sempre (`GameState.log`) e **não o
 * mostrava em lugar nenhum**. A primeira versão do botão mostrava só essas
 * frases; hoje quem conta a história são as cartas (`LinhaDoTempo`, a mesma
 * peça do replay), e as frases ficam recolhidas em "detalhes" de cada dia.
 *
 * O dia de hoje ainda não tem `DayLog` — ele só nasce no `endDay` —, então é
 * montado aqui a partir da mesa.
 */
export default function HistoricoDaRun({ state, onFechar }: {
  state: GameState
  onFechar: () => void
}) {
  const vazio = state.history.length === 0 && state.log.length === 0
  const hojeAberto = state.outcome === 'jogando' || !state.history.some((d) => d.day === state.day)

  return (
    <Dialogo titulo="Histórico da run" onFechar={onFechar} largo>
      {vazio ? (
        <p className={styles.vazio}>Ainda não aconteceu nada. Revele o evento do dia.</p>
      ) : (
        <LinhaDoTempo
          dias={state.history}
          retrato={state.baralho.cartas}
          modo={state.modo}
          log={state.log}
          hoje={
            hojeAberto
              ? {
                  day: state.day,
                  eventId: state.eventRevealed ? state.currentEvent : null,
                  eventChoice: state.lastEventChoice,
                  cardsPlayed: state.playedToday,
                }
              : null
          }
        />
      )}
    </Dialogo>
  )
}
