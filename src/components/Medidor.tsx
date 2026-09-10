'use client'

import { useEffect, useRef, useState } from 'react'
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

  const bom = delta === null ? false : subirEhRuim ? delta < 0 : delta > 0
  const classes = [styles.medidor]
  if (delta !== null) classes.push(bom ? styles.subiu : styles.desceu)

  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={`${nome}: ${valor}${total !== undefined ? ` de ${total}` : ''}. ${descricao}`}
      onClick={() => setDica((d) => !d)}
      onPointerEnter={() => setDica(true)}
      onPointerLeave={() => setDica(false)}
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
        <span className={styles.dica} role="tooltip">
          <strong>{nome}</strong> — {descricao}
        </span>
      ) : null}
    </button>
  )
}
