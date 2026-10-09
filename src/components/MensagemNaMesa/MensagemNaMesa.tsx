'use client'

import { useEffect, useState } from 'react'
import type { GameState } from '@/game/types'
import styles from './MensagemNaMesa.module.sass'

/**
 * A mensagem de uma carta ou evento, aparecendo na mesa.
 *
 * Ela existe porque a ação `mensagem` (que era `aviso`) escrevia numa lista
 * que **nenhum componente do site desenhava**: o efeito funcionava, e o
 * jogador nunca via. "Segunda reunião do dia: só estresse" é justamente o tipo
 * de coisa que precisa ser dita na hora, senão a carta parece quebrada.
 *
 * Mesmo mecanismo do `DescarteNaMesa`: o `selo` sobe a cada mensagem, e é ele
 * que distingue duas mensagens iguais seguidas — sem isso o React não teria
 * como saber que aconteceu de novo. Fica um pouco mais de tempo na tela do que
 * o descarte porque texto se lê mais devagar do que uma carta se reconhece.
 */
const DURACAO = 2800

export default function MensagemNaMesa({ mensagem }: { mensagem: GameState['ultimaMensagem'] }) {
  const [mostrando, setMostrando] = useState<number | null>(null)

  useEffect(() => {
    if (!mensagem) return
    setMostrando(mensagem.selo)
    const t = setTimeout(() => setMostrando(null), DURACAO)
    return () => clearTimeout(t)
  }, [mensagem])

  if (!mensagem || mostrando !== mensagem.selo) return null

  return (
    <p className={styles.caixa} role="status" aria-live="polite">
      {mensagem.texto}
    </p>
  )
}
