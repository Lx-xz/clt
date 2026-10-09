'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './BotaoConfirmar.module.sass'

/** Quanto tempo o botão fica armado esperando o segundo clique. */
const JANELA = 3000

/**
 * Ação destrutiva confirmada com o SEGUNDO clique, no mesmo lugar.
 *
 * Sair e pedir demissão abriam um popup de confirmação — que é uma tela
 * inteira para responder "tem certeza?", e que no celular cobria a coisa
 * sobre a qual se perguntava. Aqui o primeiro clique ARMA: o texto troca
 * ("Confirmar saída"), o botão fica vermelho e treme uma vez; o segundo
 * clique executa. Sem segundo clique em 3 s, ou com o foco indo embora, ele
 * desarma sozinho — um botão armado esquecido seria uma armadilha.
 *
 * O estado armado é anunciado ao leitor de tela (`aria-live`): sem isso,
 * quem não vê a troca de texto clicaria duas vezes achando que o primeiro
 * clique não pegou.
 */
export default function BotaoConfirmar({
  children,
  armado: textoArmado,
  onConfirmar,
  className = '',
  classeArmado = '',
  desabilitado = false,
  rotulo,
}: {
  children: ReactNode
  /** O que o botão diz depois do primeiro clique. */
  armado: ReactNode
  onConfirmar: () => void
  className?: string
  /** Classe extra enquanto armado — para quem já tem o próprio vermelho. */
  classeArmado?: string
  desabilitado?: boolean
  /** Rótulo acessível, quando o conteúdo é só ícone. */
  rotulo?: string
}) {
  const [armado, setArmado] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  function desarmar() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setArmado(false)
  }

  function clicar() {
    if (armado) {
      desarmar()
      onConfirmar()
      return
    }
    setArmado(true)
    timer.current = setTimeout(desarmar, JANELA)
  }

  return (
    <button
      type="button"
      className={`${className} ${styles.botao} ${armado ? `${styles.armado} ${classeArmado}` : ''}`}
      onClick={clicar}
      onBlur={desarmar}
      disabled={desabilitado}
      aria-label={rotulo}
    >
      {armado ? textoArmado : children}
      <span className={styles.leitor} aria-live="polite">
        {armado ? 'Clique de novo para confirmar.' : ''}
      </span>
    </button>
  )
}
