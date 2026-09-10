'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Coffee, Droplet, Hammer, House, Layers, Play, RotateCcw, Trophy } from 'lucide-react'
import buttons from '@/styles/buttons.module.sass'
import styles from './SideNav.module.sass'

const LINKS = [
  { href: '/', label: 'Início', Icon: House },
  { href: '/jogar', label: 'Jogar', Icon: Play },
  { href: '/baralho', label: 'Baralho', Icon: Layers },
  { href: '/ranking', label: 'Ranking', Icon: Trophy },
]

/** Disparado ao confirmar o reinício; a mesa escuta e começa uma run nova. */
export const EVENTO_REINICIAR = 'clt:reiniciar-run'

export default function SideNav() {
  const pathname = usePathname()
  const [aberta, setAberta] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)

  // ao mudar de página o gaveteiro do celular se fecha sozinho
  useEffect(() => {
    setAberta(false)
    setConfirmando(false)
  }, [pathname])

  // no celular a barra fica escondida: arrastar da esquerda para a direita em
  // qualquer ponto da tela abre, e o painel acompanha o dedo em tempo real —
  // arrastar de volta para a esquerda fecha. Um arraste que começa numa carta
  // é ignorado, porque a carta já usa o mesmo gesto para ser jogada.
  useEffect(() => {
    let x0 = 0
    let y0 = 0
    let larguraPainel = 216
    // 'esperando': ainda decidindo se é um arraste do menu; 'seguindo': é, e
    // o painel já está sendo movido; 'ignorando': gesto de outra coisa.
    let fase: 'esperando' | 'seguindo' | 'ignorando' = 'ignorando'

    function progresso(dx: number) {
      const base = aberta ? larguraPainel : 0
      return Math.min(larguraPainel, Math.max(0, base + dx))
    }

    function inicio(e: TouchEvent) {
      const alvo = e.target as Element | null
      if (alvo?.closest('[data-carta]')) {
        fase = 'ignorando'
        return
      }
      const t = e.touches[0]
      x0 = t.clientX
      y0 = t.clientY
      larguraPainel = painelRef.current?.getBoundingClientRect().width || larguraPainel
      fase = 'esperando'
    }

    function mover(e: TouchEvent) {
      if (fase === 'ignorando') return
      const t = e.touches[0]
      const dx = t.clientX - x0
      const dy = t.clientY - y0

      if (fase === 'esperando') {
        if (Math.abs(dy) > Math.abs(dx) + 8) {
          fase = 'ignorando'
          return
        }
        if (Math.abs(dx) < 10) return
        // fechado só abre arrastando pra direita; aberto só fecha pra esquerda
        const direcaoValida = aberta ? dx < 0 : dx > 0
        if (!direcaoValida) {
          fase = 'ignorando'
          return
        }
        fase = 'seguindo'
        painelRef.current?.classList.add(styles.arrastando)
      }

      painelRef.current?.style.setProperty('--arraste', `${progresso(dx)}px`)
    }

    function fim(e: TouchEvent) {
      if (fase === 'seguindo') {
        const t = e.changedTouches[0]
        const posicao = progresso(t.clientX - x0)
        painelRef.current?.classList.remove(styles.arrastando)
        painelRef.current?.style.removeProperty('--arraste')
        setAberta(posicao > larguraPainel / 2)
      }
      fase = 'ignorando'
    }

    window.addEventListener('touchstart', inicio, { passive: true })
    window.addEventListener('touchmove', mover, { passive: true })
    window.addEventListener('touchend', fim, { passive: true })
    return () => {
      window.removeEventListener('touchstart', inicio)
      window.removeEventListener('touchmove', mover)
      window.removeEventListener('touchend', fim)
    }
  }, [aberta])

  const naMesa = pathname.startsWith('/jogar')

  function confirmarReinicio() {
    setConfirmando(false)
    setAberta(false)
    window.dispatchEvent(new CustomEvent(EVENTO_REINICIAR))
  }

  return (
    <>
      <button
        type="button"
        className={styles.puxador}
        aria-label="Abrir menu"
        onClick={() => setAberta(true)}
      />

      <div
        className={`${styles.backdrop} ${aberta ? styles.backdropVisivel : ''}`}
        onClick={() => setAberta(false)}
        aria-hidden
      />

      <nav className={`${styles.nav} ${aberta ? styles.aberta : ''}`} aria-label="Navegação principal">
        <div ref={painelRef} className={styles.painel}>
          <div className={styles.corpo}>
            <Link className={styles.marca} href="/">
              <span className={styles.logo} aria-hidden>
                <Coffee size={15} />
                <Hammer size={15} />
                <Droplet size={15} />
              </span>
              <span className={styles.texto}>
                <span className={styles.sigla}>CLT</span>
                <span className={styles.sub}>Coffee, Labor and Tears</span>
              </span>
            </Link>

            {LINKS.map(({ href, label, Icon }) => {
              const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  className={`${styles.link} ${ativo ? styles.ativo : ''}`}
                  href={href}
                  aria-current={ativo ? 'page' : undefined}
                >
                  <Icon size={18} aria-hidden />
                  <span className={styles.rotulo}>{label}</span>
                </Link>
              )
            })}

            <span className={styles.empurra} />

            {naMesa ? (
              <button type="button" className={styles.link} onClick={() => setConfirmando(true)}>
                <RotateCcw size={18} aria-hidden />
                <span className={styles.rotulo}>Reiniciar run</span>
              </button>
            ) : null}

            <span className={styles.rodape}>4 semanas · 20 dias</span>
          </div>
        </div>
      </nav>

      {confirmando ? (
        <div className={styles.fundo} role="dialog" aria-modal="true" aria-labelledby="titulo-reiniciar">
          <div className={styles.dialogo}>
            <h2 className={styles.dialogoTitulo} id="titulo-reiniciar">
              Reiniciar a run?
            </h2>
            <p className={styles.dialogoTexto}>
              O mês atual é descartado e um novo começa do dia 1. Não dá para desfazer.
            </p>
            <div className={styles.dialogoAcoes}>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={confirmarReinicio}
              >
                Reiniciar
              </button>
              <button type="button" className={buttons.button} onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
