'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import { getCard } from '@/game/catalogo'
import type { GameState } from '@/game/types'
import styles from './DescarteNaMesa.module.sass'

/** Quanto tempo as cartas descartadas ficam à vista antes de saírem. */
const DURACAO = 2200

/**
 * Mostra o que acabou de ser descartado.
 *
 * Isto existe porque o descarte era invisível: a Fofoca de Corredor levava
 * uma carta da mão e o único vestígio era uma linha no histórico, que ninguém
 * lê no meio da jogada. A mão simplesmente tinha uma carta a menos — e o
 * jogador não sabia qual, nem que tinha acontecido.
 *
 * Aparece em cima da mesa, com a carta INTEIRA e não só o nome: o jogador
 * reconhece as cartas pelo desenho, e ler "Atalho no Sistema" num aviso não é
 * a mesma coisa que ver o Atalho no Sistema indo embora.
 */
export default function DescarteNaMesa({ descarte }: { descarte: GameState['ultimoDescarte'] }) {
  const selo = descarte?.selo ?? 0
  const [mostrando, setMostrando] = useState(0)

  useEffect(() => {
    if (!selo) return
    setMostrando(selo)
    const t = setTimeout(() => setMostrando(0), DURACAO)
    return () => clearTimeout(t)
  }, [selo])

  if (!descarte || mostrando !== selo || descarte.cartas.length === 0) return null

  return (
    // aria-live: quem usa leitor de tela também precisa saber que a mão
    // encolheu, e por quê
    <div className={styles.caixa} role="status" aria-live="polite">
      <span className={styles.motivo}>
        {descarte.porque} descartou {descarte.cartas.length === 1 ? 'esta carta' : `${descarte.cartas.length} cartas`}
      </span>
      <div className={styles.cartas}>
        {descarte.cartas.map((id, i) => (
          <div
            key={`${id}-${i}`}
            className={styles.saindo}
            style={{ '--i': i } as React.CSSProperties}
          >
            <Card card={getCard(id)} />
          </div>
        ))}
      </div>
    </div>
  )
}
