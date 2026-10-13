'use client'

import { Minus, Plus } from 'lucide-react'
import { useRef } from 'react'
import styles from './Slider.module.sass'

/** O lugar do botão de cada ponta, e o tamanho da bolinha (bate com o sass). */
const PONTA = 40
const BOLINHA = 28

/**
 * Controle de volume. Não é um `input[type=range]`: o nativo é irregular de
 * navegador para navegador, e no celular ele rouba o gesto de arrastar do
 * menu lateral com frequência. Aqui o curso é uma div que anda com Pointer
 * Events (os mesmos da carta), com captura do ponteiro — então o dedo pode
 * sair da barra durante o arraste sem o valor travar.
 *
 * Os botões de − e + moram DENTRO da barra, nas pontas (o − por cima do
 * preenchido, o + no vazio): acertar 5% arrastando num celular é loteria, e
 * teclado e leitor de tela precisam de um alvo de verdade. O desenho é o do
 * `Interruptor` — o trilho, a cor de ligado e a bolinha branca são os mesmos.
 *
 * `onChange` dispara a cada passo do arraste; `onSoltar`, uma vez, quando o
 * ajuste termina (soltar o dedo, um clique no − ou +, soltar a tecla). É ali
 * que mora o que não pode repetir a cada pixel, como tocar o som de prova.
 */
export default function Slider({
  valor,
  onChange,
  onSoltar,
  rotulo,
  passo = 5,
  desabilitado = false,
}: {
  /** De 0 a 100. */
  valor: number
  onChange: (v: number) => void
  onSoltar?: () => void
  rotulo: string
  passo?: number
  desabilitado?: boolean
}) {
  const curso = useRef<HTMLDivElement>(null)

  function limitar(v: number) {
    return Math.min(100, Math.max(0, Math.round(v)))
  }

  function doPonteiro(clientX: number) {
    const caixa = curso.current?.getBoundingClientRect()
    if (!caixa || caixa.width <= BOLINHA) return
    // o centro da bolinha anda de meia bolinha até a outra meia: mirar o
    // dedo no centro dela, e não na borda do curso
    const p = (clientX - caixa.left - BOLINHA / 2) / (caixa.width - BOLINHA)
    const v = limitar(p * 100)
    if (v !== valor) onChange(v)
  }

  const TECLAS: Record<string, number> = {
    ArrowLeft: -passo,
    ArrowDown: -passo,
    ArrowRight: passo,
    ArrowUp: passo,
    PageDown: -passo * 2,
    PageUp: passo * 2,
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === 'Home') return onChange(0), e.preventDefault()
    if (e.key === 'End') return onChange(100), e.preventDefault()
    const d = TECLAS[e.key]
    if (d === undefined) return
    e.preventDefault()
    onChange(limitar(valor + d))
  }

  function passar(d: number) {
    onChange(limitar(valor + d))
    onSoltar?.()
  }

  return (
    <div
      className={`${styles.barra} ${desabilitado ? styles.desligado : ''}`}
      style={{ '--p': valor / 100, '--ponta': `${PONTA}px`, '--bolinha': `${BOLINHA}px` } as React.CSSProperties}
    >
      <span className={styles.preenchida} aria-hidden />

      <button
        type="button"
        className={`${styles.passo} ${styles.menos}`}
        aria-label={`Diminuir ${rotulo}`}
        disabled={desabilitado || valor <= 0}
        onClick={() => passar(-passo)}
      >
        <Minus size={16} strokeWidth={2.6} aria-hidden />
      </button>

      <div
        ref={curso}
        className={styles.curso}
        role="slider"
        tabIndex={desabilitado ? -1 : 0}
        aria-label={rotulo}
        aria-disabled={desabilitado || undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
        aria-valuetext={`${valor} por cento`}
        onKeyDown={aoTeclar}
        // segurar a seta repete o keydown: o som de prova espera a tecla subir
        onKeyUp={(e) => {
          if (e.key in TECLAS || e.key === 'Home' || e.key === 'End') onSoltar?.()
        }}
        onPointerDown={(e) => {
          if (desabilitado) return
          // capturar o ponteiro deixa o dedo sair da barra sem largar o
          // controle — e impede o menu lateral de achar que é o gesto dele
          e.currentTarget.setPointerCapture(e.pointerId)
          doPonteiro(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) doPonteiro(e.clientX)
        }}
        onPointerUp={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
          e.currentTarget.releasePointerCapture(e.pointerId)
          onSoltar?.()
        }}
        onPointerCancel={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) onSoltar?.()
        }}
        // a carta e o menu usam o mesmo gesto; este atributo é o que faz a
        // barra lateral ignorar um arraste que começou aqui dentro
        data-carta="slider"
      >
        <span className={styles.bolinha} aria-hidden />
      </div>

      <button
        type="button"
        className={`${styles.passo} ${styles.mais}`}
        aria-label={`Aumentar ${rotulo}`}
        disabled={desabilitado || valor >= 100}
        onClick={() => passar(passo)}
      >
        <Plus size={16} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  )
}
