'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import { MAX_STRESS, MAX_WARNINGS, getCard } from '@/game/cards'
import {
  canPlay,
  chooseEventOption,
  chooseReward,
  createRun,
  currentWeek,
  dayLabel,
  effectiveCost,
  endDay,
  playCard,
  resolveFriday,
} from '@/game/engine'
import { getEvent } from '@/game/events'
import { clearRun, loadCollection, loadRun, saveRun, unlockCard } from '@/game/storage'
import type { GameState } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './jogar.module.sass'

const OUTCOME_TEXT: Record<Exclude<GameState['outcome'], 'jogando'>, { title: string; text: string }> = {
  vitoria: { title: 'Mês fechado', text: 'Você chegou ao fim das quatro semanas empregado e com as contas pagas.' },
  burnout: { title: 'Burnout', text: 'O estresse chegou a 10. O corpo cobrou a conta antes do banco.' },
  demissao: { title: 'Demissão', text: 'Três advertências. O RH marcou uma conversa rápida.' },
  despejo: { title: 'Despejo', text: 'As contas de sexta não fecharam.' },
}

export default function JogarPage() {
  const [state, setState] = useState<GameState | null>(null)

  useEffect(() => {
    const saved = loadRun<GameState>()
    setState(saved ?? createRun(loadCollection().equipped))
  }, [])

  function update(next: GameState) {
    saveRun(next)
    setState(next)
  }

  function restart() {
    clearRun()
    update(createRun(loadCollection().equipped))
  }

  if (!state) {
    return (
      <main className="page">
        <p className={styles.empty}>Batendo o ponto…</p>
      </main>
    )
  }

  const week = currentWeek(state)
  const event = state.currentEvent ? getEvent(state.currentEvent) : null
  const finished = state.outcome !== 'jogando'

  return (
    <main className="page">
      <div className={styles.top}>
        <h1 className={styles.title}>{finished ? 'Run encerrada' : dayLabel(state)}</h1>
        <div className={styles.tools}>
          <button type="button" className={`${buttons.button} ${buttons.ghost}`} onClick={restart}>
            Reiniciar run
          </button>
          <Link className={`${buttons.button} ${buttons.ghost}`} href="/baralho">
            Baralho
          </Link>
          <Link className={buttons.button} href="/">
            Início
          </Link>
        </div>
      </div>

      <div className={styles.hud}>
        <Stat label="Energia" value={state.energy} tone={styles.energia} />
        <Stat label="Estresse" value={`${state.stress}/${MAX_STRESS}`} tone={styles.estresse} />
        <Stat label="Produtividade" value={`${state.productivity}/${state.dailyQuota}`} tone={styles.produtividade} />
        <Stat label="Dinheiro" value={`R$ ${state.money}`} tone={styles.dinheiro} />
        <Stat label="Semana" value={`${state.weekProductivity}/${week.weeklyGoal}`} />
        <Stat label="Advertências" value={`${state.warnings}/${MAX_WARNINGS}`} />
        <Stat label="Baralho" value={`${state.deck.length}+${state.discard.length}`} />
      </div>

      {finished ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{OUTCOME_TEXT[state.outcome as keyof typeof OUTCOME_TEXT].title}</h2>
          <p className={styles.panelText}>
            {OUTCOME_TEXT[state.outcome as keyof typeof OUTCOME_TEXT].text} Pontuação final:{' '}
            <span className="mono">R$ {state.money}</span>.
          </p>
          <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={restart}>
            Nova run
          </button>
        </section>
      ) : null}

      {!finished && event ? (
        <section className={`${styles.event} ${styles[event.tone]}`}>
          <span className={styles.eventTag}>Evento do dia · {event.tone}</span>
          <h2 className={styles.eventName}>{event.name}</h2>
          <p className={styles.eventText}>{event.text}</p>
          {state.pendingEventChoice && event.choices ? (
            <div className={styles.choices}>
              {event.choices.map((choice, index) => (
                <button
                  key={choice.label}
                  type="button"
                  className={buttons.button}
                  onClick={() => update(chooseEventOption(state, index as 0 | 1))}
                >
                  {choice.label}
                  <span className={styles.choiceNote}>{choice.text}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {state.phase === 'dia' ? (
        <section className={styles.section}>
          <div className={styles.head}>
            <h2>Sua mão</h2>
            <span className={styles.count}>{state.hand.length} cartas · {state.energy} de energia</span>
          </div>
          {state.hand.length === 0 ? (
            <p className={styles.empty}>Mão vazia. Encerre o dia.</p>
          ) : (
            <div className={styles.hand}>
              {state.hand.map((instance) => (
                <Card
                  key={instance.uid}
                  card={getCard(instance.cardId)}
                  cost={effectiveCost(state, instance.cardId)}
                  disabled={!canPlay(state, instance)}
                  onClick={() => update(playCard(state, instance.uid))}
                />
              ))}
            </div>
          )}
          <div className={styles.actions} style={{ marginTop: 16 }}>
            <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={() => update(endDay(state))}>
              Encerrar o dia
            </button>
          </div>
        </section>
      ) : null}

      {state.phase === 'sexta' ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Sexta-feira — hora da cobrança</h2>
          <p className={styles.panelText}>
            Produtividade da semana: <span className="mono">{state.weekProductivity}</span> de{' '}
            <span className="mono">{week.weeklyGoal}</span>. Depois do expediente vêm o salário, as contas de R$ 300 e o
            fim de semana.
          </p>
          <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={() => update(resolveFriday(state))}>
            Bater o ponto
          </button>
        </section>
      ) : null}

      {state.phase === 'recompensa' ? (
        <section className={styles.section}>
          <div className={styles.head}>
            <h2>Recompensa da semana</h2>
            <span className={styles.count}>escolha 1 de 3</span>
          </div>
          <div className={styles.hand}>
            {state.rewardOptions.map((id) => (
              <Card
                key={id}
                card={getCard(id)}
                onClick={() => {
                  unlockCard(id)
                  update(chooseReward(state, id))
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.log}>
        <h2 className={styles.count}>Diário</h2>
        {state.log.length === 0 ? (
          <p className={styles.empty}>Nada anotado ainda.</p>
        ) : (
          <ul className={styles.logList}>
            {state.log.map((entry, index) => (
              <li key={`${index}-${entry}`}>{entry}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${tone ?? ''}`}>{value}</span>
    </div>
  )
}
