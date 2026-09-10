'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Coffee, Droplet, Hammer, House, Layers, Play, RotateCcw } from 'lucide-react'
import buttons from '@/styles/buttons.module.sass'
import styles from './SideNav.module.sass'

const LINKS = [
  { href: '/', label: 'Início', Icon: House },
  { href: '/jogar', label: 'Jogar', Icon: Play },
  { href: '/baralho', label: 'Baralho', Icon: Layers },
]

/** Disparado ao confirmar o reinício; a mesa escuta e começa uma run nova. */
export const EVENTO_REINICIAR = 'clt:reiniciar-run'

export default function SideNav() {
  const pathname = usePathname()
  const [aberta, setAberta] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  // ao mudar de página o gaveteiro do celular se fecha sozinho
  useEffect(() => {
    setAberta(false)
    setConfirmando(false)
  }, [pathname])

  // no celular a barra fica escondida: arrastar da borda esquerda para a
  // direita abre; arrastar de volta para a esquerda fecha
  useEffect(() => {
    let x0 = 0
    let y0 = 0
    let seguindo = false

    function inicio(e: TouchEvent) {
      const t = e.touches[0]
      x0 = t.clientX
      y0 = t.clientY
      seguindo = aberta || x0 <= 28
    }
    function mover(e: TouchEvent) {
      if (!seguindo) return
      const t = e.touches[0]
      const dx = t.clientX - x0
      const dy = t.clientY - y0
      if (Math.abs(dy) > Math.abs(dx) + 8) {
        seguindo = false
        return
      }
      if (!aberta && dx > 44) {
        setAberta(true)
        seguindo = false
      } else if (aberta && dx < -44) {
        setAberta(false)
        seguindo = false
      }
    }
    function fim() {
      seguindo = false
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
        <div className={styles.painel}>
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
