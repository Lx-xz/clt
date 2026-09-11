'use client'

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import styles from './Dialogo.module.sass'

/** Quantos popups estão abertos agora — é o que trava a página atrás. */
let abertos = 0

/**
 * O popup do site inteiro: configurações, como jogar, confirmação de
 * reinício, relato de bug. Antes cada tela tinha o seu, e cada um errava uma
 * coisa diferente — este resolve os três de uma vez:
 *
 *  - **trava a página atrás.** Enquanto houver popup aberto, o conteúdo não
 *    rola (é o que a marca `data-popup` no <html> desliga, em
 *    `shell.module.sass`) e o gesto de arrastar o menu lateral é ignorado.
 *  - **fecha ao clicar fora**, e com Esc.
 *  - **largura previsível.** `largo` existe porque o diálogo de volume
 *    mudava de tamanho quando o número virava "100%".
 */
export default function Dialogo({
  titulo,
  onFechar,
  largo = false,
  children,
  acoes,
}: {
  titulo: string
  onFechar: () => void
  largo?: boolean
  children: React.ReactNode
  acoes?: React.ReactNode
}) {
  const fundo = useRef<HTMLDivElement>(null)
  const comecouNoFundo = useRef(false)

  useEffect(() => {
    // contagem, e não um booleano: um popup aberto por cima de outro não pode
    // destravar a página ao fechar só o de cima
    abertos += 1
    document.documentElement.dataset.popup = 'aberto'

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)

    return () => {
      window.removeEventListener('keydown', aoTeclar)
      abertos -= 1
      if (abertos <= 0) {
        abertos = 0
        delete document.documentElement.dataset.popup
      }
    }
  }, [onFechar])

  return (
    <div
      ref={fundo}
      className={styles.fundo}
      // o clique de fora só conta quando começou E terminou no fundo: sem
      // isso, selecionar texto de dentro e soltar o dedo fora fechava tudo
      onMouseDown={(e) => {
        comecouNoFundo.current = e.target === fundo.current
      }}
      onClick={(e) => {
        if (comecouNoFundo.current && e.target === fundo.current) onFechar()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className={`${styles.dialogo} ${largo ? styles.largo : ''}`}>
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>{titulo}</h2>
          <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className={styles.corpo}>{children}</div>
        {acoes ? <div className={styles.acoes}>{acoes}</div> : null}
      </div>
    </div>
  )
}

/** A barra lateral consulta isto para não abrir com arraste por baixo do popup. */
export function popupAberto(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.popup === 'aberto'
}
