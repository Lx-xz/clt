'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Layers, Play } from 'lucide-react'
import styles from './SideNav.module.sass'

const LINKS = [
  { href: '/', label: 'Início', Icon: House },
  { href: '/jogar', label: 'Jogar', Icon: Play },
  { href: '/baralho', label: 'Baralho', Icon: Layers },
]

export default function SideNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav} aria-label="Navegação principal">
      <Link className={styles.marca} href="/">
        <span className={styles.sigla}>CLT</span>
        <span className={styles.sub}>Coffee, Labor and Tears</span>
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
            <Icon size={16} aria-hidden />
            {label}
          </Link>
        )
      })}

      <span className={styles.rodape}>4 semanas · 20 dias</span>
    </nav>
  )
}
