'use client'

import { diaDaSemana, numeroDaSemana } from '@/game/regras'
import type { DayLog, GameState } from '@/game/types'
import Dialogo from './Dialogo'
import styles from './HistoricoDaRun.module.sass'

/**
 * Tudo o que aconteceu nesta run, agrupado por dia.
 *
 * O jogo escrevia esse histórico desde sempre (`GameState.log`) e **não o
 * mostrava em lugar nenhum** — o campo era gravado, subia para o banco a cada
 * jogada e morria ali. Era por isso que a ação "escrever no histórico" não
 * fazia sentido nenhum para quem jogava: não havia histórico.
 *
 * Os dias vêm do mais novo para o mais antigo, porque o que se quer conferir é
 * quase sempre o que acabou de acontecer; dentro de cada dia as linhas ficam na
 * ordem em que aconteceram. Os números só aparecem em dia já FECHADO: eles vêm
 * do `DayLog`, que só existe a partir do `endDay`.
 */
export default function HistoricoDaRun({ state, onFechar }: {
  state: GameState
  onFechar: () => void
}) {
  const porDia = new Map<number, string[]>()
  for (const linha of state.log) {
    const lista = porDia.get(linha.dia)
    if (lista) lista.push(linha.texto)
    else porDia.set(linha.dia, [linha.texto])
  }

  const fechados = new Map<number, DayLog>(state.history.map((d) => [d.day, d]))
  const dias = [...porDia.keys()].sort((a, b) => b - a)

  return (
    <Dialogo titulo="Histórico da run" onFechar={onFechar} largo>
      {dias.length === 0 ? (
        <p className={styles.vazio}>Ainda não aconteceu nada. Revele o evento do dia.</p>
      ) : (
        <ol className={styles.linha}>
          {dias.map((dia) => {
            const fechado = fechados.get(dia)
            return (
              <li key={dia} className={styles.dia}>
                <h3 className={styles.cabeca}>
                  Semana {numeroDaSemana(state.modo, dia)} · {diaDaSemana(state.modo, dia)}
                  {dia === state.day ? <span className={styles.hoje}>hoje</span> : null}
                </h3>
                <ul className={styles.linhas}>
                  {(porDia.get(dia) ?? []).map((texto, i) => (
                    <li key={i}>{texto}</li>
                  ))}
                </ul>
                {fechado ? (
                  <p className={styles.numeros}>
                    <span className={fechado.metQuota ? styles.ok : styles.falhou}>
                      produtividade {fechado.productivity}/{fechado.quota}
                    </span>
                    <span>estresse {fechado.stress}</span>
                    <span>R$ {fechado.money}</span>
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </Dialogo>
  )
}
