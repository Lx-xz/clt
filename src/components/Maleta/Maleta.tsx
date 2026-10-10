'use client'

import { Sparkles, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Avatar as Receita } from '@/data/avatar'
import { NOMES_DE_RARIDADE } from '@/game/colecao'
import { MALETAS, type Cosmetico, type TipoMaleta } from '@/game/cosmeticos'
import buttons from '@/styles/buttons.module.sass'
import Avatar from '../Avatar'
import styles from './Maleta.module.sass'

const METAIS: Record<TipoMaleta, string> = {
  bronze: styles.bronze,
  prata: styles.prata,
  ouro: styles.ouro,
}

/**
 * A maleta desenhada, de frente. Só CSS e chapada, como o envelope: couro
 * de cor lisa, a alça e os dois fechos — e os FECHOS são a única parte de
 * metal. É o metal deles que diz bronze, prata ou ouro; o resto é a mesma
 * maleta. (A primeira versão era toda de metal, com degradê, plaqueta e
 * tampa, e destoava do resto do jogo, que é papel e cor lisa.)
 *
 * Ela abre PELO MEIO, como uma maleta de verdade em pé: a metade da frente
 * inclina um pouco para a frente e a de trás um pouco para trás. Como a
 * vemos de frente, a abertura é pequena — aparece uma faixa do forro em
 * cima, e é dela que o prêmio sobe.
 */
export function MaletaDesenhada({ tipo, aberta = false, largura = 96, className, rotulo, onClick }: {
  tipo: TipoMaleta
  aberta?: boolean
  largura?: number
  className?: string
  rotulo?: string
  onClick?: () => void
}) {
  const corpo = (
    <>
      {/* a alça é da metade de TRÁS: na da frente ela afundava no vão ao
          abrir; atrás, ela sobe junto e fica por cima da abertura */}
      <span className={styles.costas} aria-hidden>
        <span className={styles.alca} />
      </span>
      <span className={styles.frente} aria-hidden>
        <span className={`${styles.fecho} ${styles.fechoE}`} />
        <span className={`${styles.fecho} ${styles.fechoD}`} />
      </span>
    </>
  )
  const props = {
    className: `${styles.maleta} ${METAIS[tipo]} ${aberta ? styles.aberta : ''} ${className ?? ''}`,
    style: { '--mal-w': `${largura}px` } as React.CSSProperties,
  }
  return onClick ? (
    <button type="button" {...props} onClick={onClick} aria-label={rotulo ?? MALETAS[tipo].nome}>
      {corpo}
    </button>
  ) : (
    <span {...props} role="img" aria-label={rotulo ?? MALETAS[tipo].nome}>
      {corpo}
    </span>
  )
}

type Fase = 'chegando' | 'esperando' | 'abrindo' | 'revelado'

/** Os tempos da abertura; cada um bate com uma animação do sass. */
const T = { chegada: 600, abrir: 1100 }

function semMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * A abertura de uma maleta, em tela cheia, no mesmo ritmo do envelope: ela
 * chega, espera o toque, os fechos saltam, a tampa abre e a peça sobe de
 * dentro, já VESTIDA no avatar — um cosmético se entende vendo no rosto, e
 * não lendo o nome. `onEquipar` põe o botão de vestir agora.
 *
 * O cosmético já está na coleção quando isto aparece (quem chama grava
 * antes): fechar no meio não perde nada. Vai por portal, como o envelope, e
 * ouve as teclas na captura para o Esc não fechar o que estiver atrás.
 */
export default function AberturaDeMaleta({ tipo, cosmetico, nova, avatar, onEquipar, onFechar }: {
  tipo: TipoMaleta
  cosmetico: Cosmetico
  nova: boolean
  /** O avatar de quem abre, com a peça já trocada. */
  avatar: Receita
  onEquipar?: () => void
  onFechar: () => void
}) {
  const [fase, setFase] = useState<Fase>(semMovimento() ? 'esperando' : 'chegando')
  const [escala, setEscala] = useState(1)
  const ocupado = useRef(false)

  useLayoutEffect(() => {
    const medir = () => setEscala(Math.min(1, (window.innerHeight - 120) / 560, (window.innerWidth - 24) / 360))
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const jaEstava = html.dataset.popup === 'aberto'
    html.dataset.popup = 'aberto'
    return () => {
      if (!jaEstava) delete html.dataset.popup
    }
  }, [])

  useEffect(() => {
    if (fase !== 'chegando') return
    const t = setTimeout(() => setFase('esperando'), T.chegada)
    return () => clearTimeout(t)
  }, [fase])

  function abrir() {
    if (fase !== 'esperando' || ocupado.current) return
    ocupado.current = true
    setFase('abrindo')
    setTimeout(() => setFase('revelado'), semMovimento() ? 0 : T.abrir)
  }

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return
      // revelada, Enter e espaço são dos botões (Equipar, Continuar)
      if (fase === 'revelado' && e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      if (e.key === 'Escape') onFechar()
      else abrir()
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  })

  const aberta = fase === 'abrindo' || fase === 'revelado'
  const tela = (
    <div className={styles.cortina} role="dialog" aria-modal="true" aria-label={MALETAS[tipo].nome}>
      <button type="button" className={styles.pular} onClick={onFechar}>
        Fechar <X size={14} aria-hidden />
      </button>
      <div className={styles.titulo}>{MALETAS[tipo].nome}</div>
      <div className={styles.areaToque} onClick={abrir} style={{ '--escala': escala } as React.CSSProperties}>
        <div className={styles.palco}>
          {aberta ? <span className={`${styles.raios} ${styles[`raio_${cosmetico.raridade}`]}`} aria-hidden /> : null}
          <div className={`${styles.maletaNoPalco} ${styles[`fase_${fase}`]}`}>
            <MaletaDesenhada tipo={tipo} aberta={aberta} largura={250} />
          </div>
          {fase === 'revelado' ? (
            <div className={`${styles.premio} ${styles[`premio_${cosmetico.raridade}`]}`}>
              <span className={styles.premioRosto}>
                <Avatar avatar={avatar} tamanho={220} />
              </span>
              <b className={styles.premioNome}>{cosmetico.nome}</b>
              <span className={styles.premioRaridade}>
                {nova ? (
                  <i className={styles.nova}>
                    <Sparkles size={11} aria-hidden /> nova
                  </i>
                ) : (
                  <i className={styles.repetida}>repetida</i>
                )}
                {NOMES_DE_RARIDADE[cosmetico.raridade]}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <p className={styles.dica}>
        {fase === 'esperando' ? 'Toque na maleta para abrir' : fase === 'revelado' ? '' : ' '}
      </p>
      {fase === 'revelado' ? (
        <div className={styles.acoes}>
          {onEquipar ? (
            <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onEquipar} autoFocus>
              Equipar agora
            </button>
          ) : null}
          <button type="button" className={buttons.button} onClick={onFechar} autoFocus={!onEquipar}>
            Continuar
          </button>
        </div>
      ) : null}
    </div>
  )
  return typeof document === 'undefined' ? null : createPortal(tela, document.body)
}
