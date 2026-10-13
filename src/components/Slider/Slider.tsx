'use client'

import { Minus, Plus } from 'lucide-react'
import { useRef } from 'react'
import styles from './Slider.module.sass'

/** O lugar do botão de cada ponta (bate com o sass). */
const PONTA = 40
/** Quanto o dedo anda antes de o toque virar arraste. */
const FOLGA = 4

/**
 * Controle de volume. Não é um `input[type=range]`: o nativo é irregular de
 * navegador para navegador, e no celular ele rouba o gesto de arrastar do
 * menu lateral com frequência. Aqui a barra anda com Pointer Events (os
 * mesmos da carta), com captura do ponteiro — então o dedo pode sair dela
 * durante o arraste sem o valor travar.
 *
 * É a barra do iPhone: não há bolinha para mirar. Segura-se a PRÓPRIA
 * barra, em qualquer ponto, e o valor anda o quanto o dedo andar (arraste
 * RELATIVO) — tocar não pula para onde caiu o dedo, então pegar a barra
 * para ajustar 5% não a manda para o outro lado antes.
 *
 * Os botões de − e + moram DENTRO da barra, nas pontas (o − por cima do
 * preenchido, o + no vazio): acertar 5% arrastando num celular é loteria, e
 * teclado e leitor de tela precisam de um alvo de verdade. Um toque neles é
 * passo; se o dedo andar, vira arraste da barra como em qualquer outro
 * ponto. O desenho é o do `Interruptor`: o mesmo trilho e a mesma cor.
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
  const barra = useRef<HTMLDivElement>(null)
  // onde o dedo desceu e com que valor: o arraste soma a partir dali
  const gesto = useRef<{ id: number; x: number; v: number; arrastando: boolean } | null>(null)

  function limitar(v: number) {
    return Math.min(100, Math.max(0, Math.round(v)))
  }

  function aoDescer(e: React.PointerEvent<HTMLDivElement>) {
    if (desabilitado || gesto.current) return
    gesto.current = { id: e.pointerId, x: e.clientX, v: valor, arrastando: false }
  }

  function aoMover(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesto.current
    const caixa = barra.current?.getBoundingClientRect()
    if (!g || g.id !== e.pointerId || !caixa) return
    const dx = e.clientX - g.x
    if (!g.arrastando) {
      if (Math.abs(dx) < FOLGA) return
      // só agora a barra toma o ponteiro: capturar já na descida engoliria
      // o clique do − e do +, que é entregue a quem capturou. E é a captura
      // que impede o menu lateral de achar que o gesto é dele
      g.arrastando = true
      barra.current?.setPointerCapture(e.pointerId)
    }
    // a barra inteira é o curso: atravessá-la de ponta a ponta é 0 → 100
    const v = limitar(g.v + (dx / Math.max(1, caixa.width - 2 * PONTA)) * 100)
    if (v !== valor) onChange(v)
  }

  function aoSoltar(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesto.current
    if (!g || g.id !== e.pointerId) return
    gesto.current = null
    if (g.arrastando) onSoltar?.()
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
      ref={barra}
      className={`${styles.barra} ${desabilitado ? styles.desligado : ''}`}
      style={{ '--p': valor / 100, '--ponta': `${PONTA}px` } as React.CSSProperties}
      onPointerDown={aoDescer}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      // a carta e o menu usam o mesmo gesto; este atributo é o que faz a
      // barra lateral ignorar um arraste que começou aqui dentro
      data-carta="slider"
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
      />

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
