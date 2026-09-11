'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './Medidor.module.sass'

interface MedidorProps {
  icon: LucideIcon
  /** Nome por extenso — sai do chip e vive na dica, para o painel respirar. */
  nome: string
  descricao: string
  valor: number
  total?: number
  prefixo?: string
  tom?: string
  /** Quando subir é ruim, como estresse e advertências. */
  subirEhRuim?: boolean
}

/** Interpola o número mostrado para a mudança ser vista, não só notada. */
function useNumeroAnimado(alvo: number, duracao = 550) {
  const [valor, setValor] = useState(alvo)
  const anterior = useRef(alvo)

  useEffect(() => {
    const de = anterior.current
    anterior.current = alvo
    if (de === alvo) return

    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduzido) {
      setValor(alvo)
      return
    }

    let frame = 0
    const inicio = performance.now()
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao)
      const suave = 1 - (1 - t) ** 3
      setValor(Math.round(de + (alvo - de) * suave))
      if (t < 1) frame = requestAnimationFrame(passo)
    }
    frame = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(frame)
  }, [alvo, duracao])

  return valor
}

export default function Medidor({
  icon: Icon,
  nome,
  descricao,
  valor,
  total,
  prefixo,
  tom,
  subirEhRuim,
}: MedidorProps) {
  const mostrado = useNumeroAnimado(valor)
  const [dica, setDica] = useState(false)
  const chip = useRef<HTMLButtonElement>(null)
  const balao = useRef<HTMLSpanElement>(null)
  const [posicao, setPosicao] = useState<{ left: number; top: number } | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const anterior = useRef(valor)

  useEffect(() => {
    const diferenca = valor - anterior.current
    anterior.current = valor
    if (diferenca === 0) return
    setDelta(diferenca)
    const t = setTimeout(() => setDelta(null), 1100)
    return () => clearTimeout(t)
  }, [valor])

  /**
   * A dica é `position: fixed` e posicionada por JS de propósito. Presa ao
   * chip com `absolute`, ela era cortada nos medidores das pontas — e no
   * celular, com seis tijolos numa grade, "as pontas" é metade deles. Aqui
   * ela é grudada no chip e depois empurrada para dentro da janela.
   */
  useLayoutEffect(() => {
    if (!dica) return

    function posicionar() {
      const c = chip.current?.getBoundingClientRect()
      const b = balao.current?.getBoundingClientRect()
      if (!c) return
      const largura = b?.width ?? 230
      const altura = b?.height ?? 44
      const margem = 8
      const meio = c.left + c.width / 2
      const left = Math.min(
        Math.max(meio, margem + largura / 2),
        window.innerWidth - margem - largura / 2,
      )
      // não cabendo embaixo, vira para cima em vez de sumir na dobra
      const abaixo = c.bottom + 6
      const top = abaixo + altura + margem > window.innerHeight ? c.top - altura - 6 : abaixo
      setPosicao({ left, top })
    }

    posicionar()
    window.addEventListener('resize', posicionar)
    window.addEventListener('scroll', posicionar, true)
    return () => {
      window.removeEventListener('resize', posicionar)
      window.removeEventListener('scroll', posicionar, true)
    }
  }, [dica])

  // fechar tocando fora, e no Esc. No celular não existe "tirar o mouse de
  // cima": sem isto a dica ficava aberta para sempre depois do primeiro toque
  useEffect(() => {
    if (!dica) return
    const foraFecha = (e: Event) => {
      if (!chip.current?.contains(e.target as Node)) setDica(false)
    }
    const escFecha = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDica(false)
    }
    window.addEventListener('pointerdown', foraFecha)
    window.addEventListener('keydown', escFecha)
    return () => {
      window.removeEventListener('pointerdown', foraFecha)
      window.removeEventListener('keydown', escFecha)
    }
  }, [dica])

  const bom = delta === null ? false : subirEhRuim ? delta < 0 : delta > 0
  const classes = [styles.medidor]
  if (delta !== null) classes.push(bom ? styles.subiu : styles.desceu)

  return (
    <button
      ref={chip}
      type="button"
      className={classes.join(' ')}
      aria-label={`${nome}: ${valor}${total !== undefined ? ` de ${total}` : ''}. ${descricao}`}
      // no toque, `pointerenter` dispara junto com o clique e os dois se
      // anulavam: a dica abria e fechava na mesma batida, ou pior, ficava
      // presa aberta. Passar o mouse é do mouse; tocar é só o clique.
      onClick={() => setDica((d) => !d)}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setDica(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setDica(false)
      }}
      onBlur={() => setDica(false)}
    >
      <Icon size={14} className={tom} aria-hidden />
      <span className={`${styles.valor} ${tom ?? ''}`}>
        {prefixo ? <span className={styles.prefixo}>{prefixo}</span> : null}
        {mostrado}
      </span>
      {total !== undefined ? <span className={styles.total}>/{total}</span> : null}
      {delta !== null ? (
        <span className={`${styles.delta} ${bom ? styles.deltaBom : styles.deltaRuim}`}>
          {delta > 0 ? '+' : '−'}
          {Math.abs(delta)}
        </span>
      ) : null}
      {dica ? (
        <span
          ref={balao}
          className={styles.dica}
          role="tooltip"
          style={posicao ? { left: posicao.left, top: posicao.top } : { opacity: 0 }}
        >
          <strong>{nome}</strong> — {descricao}
        </span>
      ) : null}
    </button>
  )
}
