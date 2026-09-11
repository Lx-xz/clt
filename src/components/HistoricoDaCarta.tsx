'use client'

import Card from '@/components/Card'
import Dialogo from '@/components/Dialogo'
import { MUDANCAS, VERSAO_BARALHO, mudancasDaCarta } from '@/data/balanceamento'
import { getCard } from '@/game/cards'
import type { CardId } from '@/game/types'
import styles from './HistoricoDaCarta.module.sass'

const ROTULO = { criada: 'entrou no jogo', ajustada: 'ajustada', removida: 'saiu do jogo' } as const

/**
 * O que já mudou numa carta, do baralho.
 *
 * Existe porque rebalancear em silêncio é quebrar a leitura de quem jogou:
 * quem aprendeu que a Hora Extra custa 4 merece saber que hoje custa 6, e
 * por quê. O "por quê" é escrito à mão em `src/data/balanceamento.ts` — um
 * diff automático sabe dizer o número e não sabe dizer o motivo.
 *
 * As partidas antigas não mudam: cada run guarda o retrato do baralho que
 * usou. Esta janela fala do presente; o replay fala do dia em que foi jogado.
 */
export default function HistoricoDaCarta({ id, onFechar }: { id: CardId; onFechar: () => void }) {
  const carta = getCard(id)
  const mudancas = mudancasDaCarta(id)

  return (
    <Dialogo titulo={carta.name} onFechar={onFechar}>
      <div className={styles.previa}>
        <Card card={carta} />
      </div>

      <p className={styles.versao}>
        Baralho <b>v{VERSAO_BARALHO}</b> · custo {carta.cost} · {carta.kind}
      </p>

      {mudancas.length === 0 ? (
        <p className={styles.nada}>
          {MUDANCAS.length === 0
            ? 'Nenhuma carta mudou desde que o jogo existe. Quando o balanceamento começar, o que mudar aparece aqui.'
            : 'Esta carta nunca mudou. Ela está como nasceu.'}
        </p>
      ) : (
        <ol className={styles.lista}>
          {mudancas.map((m) => (
            <li key={`${m.versao}-${m.data}`} className={styles.item}>
              <div className={styles.cabeca}>
                <b className={styles.oque}>{m.oQue}</b>
                <span className={styles.selo}>
                  v{m.versao} · {ROTULO[m.tipo]}
                </span>
              </div>
              <p className={styles.porque}>{m.porque}</p>
              <span className={styles.data}>{m.data}</span>
            </li>
          ))}
        </ol>
      )}

      <p className={styles.rodape}>
        As partidas que você já jogou não mudam: cada uma guarda as cartas como elas eram
        naquele dia.
      </p>
    </Dialogo>
  )
}
