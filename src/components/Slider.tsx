'use client'

import { Minus, Plus } from 'lucide-react'
import { useRef } from 'react'
import styles from './Slider.module.sass'

/**
 * Controle de volume. Não é um `input[type=range]`: o nativo é irregular de
 * navegador para navegador, e no celular ele rouba o gesto de arrastar do
 * menu lateral com frequência. Aqui a trilha é uma div que anda com Pointer
 * Events (os mesmos da carta), com captura do ponteiro — então o dedo pode
 * sair da trilha durante o arraste sem o valor travar.
 *
 * Os botões de − e + existem porque acertar 5% arrastando num celular é
 * loteria, e porque teclado e leitor de tela precisam de um alvo de verdade.
 */
export default function Slider({
  valor,
  onChange,
  rotulo,
  passo = 5,
  desabilitado = false,
}: {
  /** De 0 a 100. */
  valor: number
  onChange: (v: number) => void
  rotulo: string
  passo?: number
  desabilitado?: boolean
}) {
  const trilha = useRef<HTMLDivElement>(null)

  function limitar(v: number) {
    return Math.min(100, Math.max(0, Math.round(v)))
  }

  function doPonteiro(clientX: number) {
    const caixa = trilha.current?.getBoundingClientRect()
    if (!caixa || caixa.width === 0) return
    onChange(limitar(((clientX - caixa.left) / caixa.width) * 100))
  }

  function aoTeclar(e: React.KeyboardEvent) {
    const mapa: Record<string, number> = {
      ArrowLeft: -passo,
      ArrowDown: -passo,
      ArrowRight: passo,
      ArrowUp: passo,
      PageDown: -passo * 2,
      PageUp: passo * 2,
    }
    if (e.key === 'Home') return onChange(0), e.preventDefault()
    if (e.key === 'End') return onChange(100), e.preventDefault()
    const d = mapa[e.key]
    if (d === undefined) return
    e.preventDefault()
    onChange(limitar(valor + d))
  }

  return (
    <div className={`${styles.linha} ${desabilitado ? styles.desligado : ''}`}>
      <button
        type="button"
        className={styles.passo}
        aria-label={`Diminuir ${rotulo}`}
        onClick={() => onChange(limitar(valor - passo))}
      >
        <Minus size={15} aria-hidden />
      </button>

      <div
        ref={trilha}
        className={styles.trilha}
        role="slider"
        tabIndex={0}
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
        aria-valuetext={`${valor} por cento`}
        onKeyDown={aoTeclar}
        onPointerDown={(e) => {
          // capturar o ponteiro deixa o dedo sair da trilha sem largar o
          // controle — e impede o menu lateral de achar que é o gesto dele
          e.currentTarget.setPointerCapture(e.pointerId)
          doPonteiro(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) doPonteiro(e.clientX)
        }}
        // a carta e o menu usam o mesmo gesto; este atributo é o que faz a
        // barra lateral ignorar um arraste que começou aqui dentro
        data-carta="slider"
      >
        <span className={styles.preenchida} style={{ width: `${valor}%` }} />
        <span className={styles.bolinha} style={{ left: `${valor}%` }} />
      </div>

      <button
        type="button"
        className={styles.passo}
        aria-label={`Aumentar ${rotulo}`}
        onClick={() => onChange(limitar(valor + passo))}
      >
        <Plus size={15} aria-hidden />
      </button>
    </div>
  )
}
