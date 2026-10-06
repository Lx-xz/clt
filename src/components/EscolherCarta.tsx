'use client'

import { getCard } from '@/game/catalogo'
import type { CardId, CardInstance } from '@/game/types'
import Card from './Card'
import Dialogo from './Dialogo'
import styles from './CartasDaRun.module.sass'

/**
 * Escolher UMA carta entre as da run — hoje, a que sai do baralho na loja.
 *
 * As cópias aparecem agrupadas, como no visor das pilhas: o jogador escolhe
 * "uma Hora Extra", e qual das duas cópias sai não faz diferença nenhuma.
 */
export default function EscolherCarta({ titulo, explicacao, cartas, aoEscolher, onFechar }: {
  titulo: string
  explicacao: string
  cartas: CardInstance[]
  aoEscolher: (id: CardId) => void
  onFechar: () => void
}) {
  const contagem = new Map<CardId, number>()
  for (const c of cartas) contagem.set(c.cardId, (contagem.get(c.cardId) ?? 0) + 1)
  const ids = [...contagem.keys()].sort((a, b) => getCard(a).name.localeCompare(getCard(b).name, 'pt-BR'))

  return (
    <Dialogo titulo={titulo} onFechar={onFechar} largo>
      <p className={styles.nota}>{explicacao}</p>
      <div className={styles.grade}>
        {ids.map((id) => (
          <Card key={id} card={getCard(id)} copies={contagem.get(id)} onOpen={() => aoEscolher(id)} />
        ))}
      </div>
    </Dialogo>
  )
}
