'use client'

import { Coffee, Droplet, Hammer } from 'lucide-react'
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import type { ActionCard, EventCard } from '@/game/types'
import { LockIcon, TONE_ICONS, iconeDaClasse } from './icons'
import styles from './Card.module.sass'

/** Distância em px que separa um clique de um arraste. */
const LIMIAR_ARRASTE = 6
/** Janela para esperar o segundo clique antes de tratar como clique simples. */
const JANELA_DUPLO = 240

export interface CardProps {
  /** Carta de ação ou carta de evento — as duas usam o mesmo desenho. */
  card: ActionCard | EventCard
  /** Custo já ajustado por eventos; cai no custo base quando ausente. */
  cost?: number
  /** Quantas cópias, para a página do baralho. */
  copies?: number
  faceDown?: boolean
  locked?: boolean
  disabled?: boolean
  /** Ângulo no leque e deslocamento vertical do arco. */
  rotation?: number
  lift?: number
  /** Clique simples: abre o detalhe. */
  onOpen?: () => void
  /** Clique duplo ou soltar sobre o alvo: joga a carta. */
  onPlay?: () => void
  /** Alvo em que soltar a carta conta como jogada. */
  dropRef?: RefObject<HTMLElement | null>
  onDragOver?: (over: boolean) => void
  style?: CSSProperties
  className?: string
}

function isEvent(card: ActionCard | EventCard): card is EventCard {
  return 'tone' in card
}

// Os mesmos três ícones da logo (Coffee, Labor and Tears), repetidos como
// estampa do verso — sem nome nem texto, só o motivo.
const ICONES_VERSO = [Coffee, Hammer, Droplet, Droplet, Coffee, Hammer, Hammer, Droplet, Coffee]

export default function Card({
  card,
  cost,
  copies,
  faceDown,
  locked,
  disabled,
  rotation = 0,
  lift = 0,
  onOpen,
  onPlay,
  dropRef,
  onDragOver,
  style,
  className,
}: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const arraste = useRef<{ x: number; y: number; moveu: boolean } | null>(null)
  const cliqueSimples = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignorarClique = useRef(false)

  useEffect(() => () => {
    if (cliqueSimples.current) clearTimeout(cliqueSimples.current)
  }, [])

  const evento = isEvent(card)
  const Icon = evento ? TONE_ICONS[card.tone] : iconeDaClasse(card.kind)
  const custo = evento ? null : (cost ?? card.cost)
  const custoAlto = !evento && custo !== null && custo > card.cost
  const interativa = !locked && !faceDown && (Boolean(onOpen) || Boolean(onPlay))

  /** Informa só o deslocamento do ponteiro; o CSS compõe o resto. */
  function mover(dx: number, dy: number) {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--ddx', `${dx}px`)
    el.style.setProperty('--ddy', `${dy}px`)
  }

  function limpar() {
    const el = ref.current
    if (!el) return
    el.classList.remove(styles.arrastando)
    el.style.removeProperty('--ddx')
    el.style.removeProperty('--ddy')
  }

  function sobreAlvo(x: number, y: number) {
    const alvo = dropRef?.current
    if (!alvo) return false
    const r = alvo.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!onPlay || disabled || locked || faceDown || e.button !== 0) return
    ignorarClique.current = false
    arraste.current = { x: e.clientX, y: e.clientY, moveu: false }
    ref.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = arraste.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moveu) {
      if (Math.abs(dx) + Math.abs(dy) < LIMIAR_ARRASTE) return
      d.moveu = true
      ref.current?.classList.add(styles.arrastando)
    }
    // o deslocamento é o do ponteiro, em coordenadas de tela: a carta fica
    // exatamente sob o cursor, sem depender de medir a caixa girada
    mover(dx, dy)
    onDragOver?.(sobreAlvo(e.clientX, e.clientY))
  }

  function soltar(e: React.PointerEvent<HTMLDivElement>) {
    const d = arraste.current
    if (!d) return
    arraste.current = null
    ignorarClique.current = d.moveu
    onDragOver?.(false)
    if (!d.moveu) {
      limpar()
      return
    }
    const acertou = sobreAlvo(e.clientX, e.clientY)
    limpar()
    if (acertou) onPlay?.()
  }

  function onClick() {
    if (ignorarClique.current) {
      ignorarClique.current = false
      return
    }
    if (!onOpen) return
    // espera o segundo clique: clique simples abre, duplo joga
    if (cliqueSimples.current) clearTimeout(cliqueSimples.current)
    cliqueSimples.current = setTimeout(() => {
      cliqueSimples.current = null
      onOpen()
    }, onPlay ? JANELA_DUPLO : 0)
  }

  function onDoubleClick() {
    if (cliqueSimples.current) {
      clearTimeout(cliqueSimples.current)
      cliqueSimples.current = null
    }
    if (!disabled) onPlay?.()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onOpen?.()
    } else if (e.key === ' ') {
      e.preventDefault()
      if (!disabled) onPlay?.()
    }
  }

  const classes = [styles.carta]
  if (interativa) classes.push(styles.interativa)
  if (disabled) classes.push(styles.indisponivel)
  if (locked) classes.push(styles.bloqueada)

  const rotulo = evento
    ? faceDown
      ? 'Carta de evento virada para baixo. Clique para revelar.'
      : `${card.name}. ${card.text}`
    : `${card.name}, custa ${custo} de energia. Clique para ver o detalhe, clique duplo para jogar.`

  return (
    <div className={`${styles.palco} ${className ?? ''}`} style={style}>
      <div
        ref={ref}
        data-carta
        className={classes.join(' ')}
        style={
          {
            '--rot': `${rotation}deg`,
            '--lift': `${lift}px`,
            '--flip': faceDown ? '180deg' : '0deg',
          } as CSSProperties
        }
        role={interativa || faceDown ? 'button' : undefined}
        tabIndex={interativa || (faceDown && onOpen) ? 0 : undefined}
        aria-label={rotulo}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onClick={faceDown ? onOpen : onClick}
        onDoubleClick={onDoubleClick}
        onKeyDown={faceDown ? undefined : onKeyDown}
      >
        <div
          className={[
            styles.face,
            styles.frente,
            evento ? styles[`ev${card.tone[0].toUpperCase()}${card.tone.slice(1)}`] : '',
          ].join(' ')}
        >
          {custo !== null ? (
            <span className={`${styles.custo} ${custoAlto ? styles.custoAlto : ''}`}>{custo}</span>
          ) : null}
          <span className={styles.selo} aria-label={locked ? 'bloqueada' : undefined} aria-hidden={!locked}>
            {locked ? <LockIcon size={13} /> : <Icon size={13} />}
          </span>
          {copies && copies > 1 ? <span className={styles.copias}>×{copies}</span> : null}
          <div className={styles.arte}>
            <Icon size={40} aria-hidden />
          </div>
          <div className={styles.topo}>
            <span className={styles.nome}>{card.name}</span>
          </div>
          <div className={styles.corpo}>
            <p className={styles.texto}>{card.text}</p>
          </div>
        </div>
        <div className={`${styles.face} ${styles.tras}`}>
          <div className={styles.padrao} aria-hidden>
            {ICONES_VERSO.map((Icone, i) => (
              <Icone key={i} className={styles.padraoIcone} strokeWidth={1.5} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
