'use client'

import { useState } from 'react'
import { cartaParaMostrar } from '@/data/balanceamento'
import { getEvent } from '@/game/catalogo'
import { diaDaSemana, numeroDaSemana, type Regras } from '@/game/regras'
import type { ActionCard, CardId, CartaSnapshot, DayLog, EventCard, LinhaDoLog } from '@/game/types'
import Card from '../Card'
import CardDetail from '../CardDetail'
import styles from './LinhaDoTempo.module.sass'
import Dinheiro, { TextoComIcones } from '../Dinheiro'
import { RESOURCE_ICONS } from '../icons'

/** O dia que ainda não fechou: não tem `DayLog`, então vem montado da mesa. */
export interface DiaAberto {
  day: number
  eventId: CardId | null
  eventChoice: 0 | 1 | null
  cardsPlayed: CardId[]
}

/**
 * A partida dia a dia, com as CARTAS desenhadas — o histórico da mesa, o seu
 * replay e o replay de outra pessoa são esta mesma peça.
 *
 * Eram duas telas que contavam a mesma coisa de jeitos diferentes: a mesa
 * mostrava frases ("Jogou Café"), o replay mostrava cartas. Quem joga
 * reconhece a carta pelo desenho antes de ler o nome, então é o desenho que
 * conta a história, e o texto do histórico fica recolhido em "detalhes" —
 * ele ainda é o único lugar que diz o que não é carta (mensagem, recorrente,
 * advertência).
 *
 * As cartas saem do RETRATO da run (`cartaParaMostrar`): mudar o custo de uma
 * carta hoje não pode reescrever a partida de ontem.
 */
export default function LinhaDoTempo({ dias, retrato, modo, log, hoje }: {
  dias: DayLog[]
  retrato?: CartaSnapshot[]
  /** Sem modo (run antiga), o dia aparece só como "Dia N". */
  modo?: Regras
  log?: LinhaDoLog[]
  hoje?: DiaAberto | null
}) {
  const [aberta, setAberta] = useState<ActionCard | EventCard | null>(null)

  const linhasPorDia = new Map<number, string[]>()
  for (const linha of log ?? []) {
    const lista = linhasPorDia.get(linha.dia)
    if (lista) lista.push(linha.texto)
    else linhasPorDia.set(linha.dia, [linha.texto])
  }

  // do mais novo para o mais antigo: o que se quer conferir é quase sempre o
  // que acabou de acontecer
  const fechados = [...dias].sort((a, b) => b.day - a.day)
  const todos: { dia: DiaAberto; fechado: DayLog | null }[] = [
    ...(hoje && !dias.some((d) => d.day === hoje.day) ? [{ dia: hoje, fechado: null }] : []),
    ...fechados.map((d) => ({ dia: d, fechado: d })),
  ]

  return (
    <>
      <ol className={styles.linha}>
        {todos.map(({ dia, fechado }) => {
          const evento = dia.eventId ? getEvent(dia.eventId) : null
          const escolha = evento?.choices && dia.eventChoice !== null ? evento.choices[dia.eventChoice] : null
          const linhas = linhasPorDia.get(dia.day) ?? []
          return (
            <li key={dia.day} className={styles.dia}>
              <h3 className={styles.cabeca}>
                {modo
                  ? `Semana ${numeroDaSemana(modo, dia.day)} · ${diaDaSemana(modo, dia.day)}`
                  : `Dia ${dia.day}`}
                {!fechado ? <span className={styles.hoje}>hoje</span> : null}
              </h3>

              <div className={styles.mesa}>
                {evento ? (
                  <div className={styles.evento}>
                    <Card card={evento} onOpen={() => setAberta(evento)} />
                    {escolha ? <span className={styles.escolha}>{escolha.label}</span> : null}
                  </div>
                ) : null}

                <div className={styles.jogadas}>
                  {dia.cardsPlayed.length === 0 ? (
                    <p className={styles.nada}>Nenhuma carta jogada.</p>
                  ) : (
                    dia.cardsPlayed.map((id, i) => {
                      const carta = cartaParaMostrar(id, retrato)
                      return (
                        <div key={`${id}-${i}`} className={styles.jogada}>
                          <span className={styles.ordem}>{i + 1}</span>
                          <Card card={carta} onOpen={() => setAberta(carta)} />
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {fechado && fechado.notPlayed.length > 0 ? (
                <div className={styles.sobras}>
                  <span className={styles.rotuloSobras}>Ficaram na mão</span>
                  <div className={styles.sobrasCartas}>
                    {fechado.notPlayed.map((id, i) => {
                      const carta = cartaParaMostrar(id, retrato)
                      return <Card key={`${id}-${i}`} card={carta} disabled onOpen={() => setAberta(carta)} />
                    })}
                  </div>
                </div>
              ) : null}

              {fechado ? (
                <p className={styles.fita}>
                  <span className={fechado.metQuota ? styles.ok : styles.falhou}>
                    {fechado.metQuota ? '✓' : '✗'} cota {fechado.productivity}/{fechado.quota}
                  </span>
                  {/* ícones de verdade, os mesmos do HUD — era um ⚡ de emoji,
                      que cada sistema desenha de um jeito */}
                  <span className={styles.comIcone}>
                    <RESOURCE_ICONS.estresse size={12} aria-hidden /> estresse {fechado.stress}
                  </span>
                  <Dinheiro valor={fechado.money} />
                  {fechado.energyLeft > 0 ? (
                    <span className={styles.comIcone}>
                      sobrou <RESOURCE_ICONS.energia size={12} aria-label="energia" /> {fechado.energyLeft}
                    </span>
                  ) : null}
                </p>
              ) : null}

              {linhas.length > 0 ? (
                <details className={styles.detalhes}>
                  <summary>detalhes</summary>
                  <ul>
                    {linhas.map((texto, i) => (
                      <li key={i}>
                        <TextoComIcones texto={texto} />
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          )
        })}
      </ol>

      {aberta ? <CardDetail card={aberta} onClose={() => setAberta(null)} /> : null}
    </>
  )
}
