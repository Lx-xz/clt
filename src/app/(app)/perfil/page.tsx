'use client'

import { useSessao } from '@/components/SessaoGuard'
import styles from './perfil.module.sass'

/** Por enquanto só o nick: é a única coisa que uma conta tem. */
export default function PerfilPage() {
  const sessao = useSessao()

  return (
    <main className="page">
      <h1 className={styles.title}>Perfil</h1>
      <p className={styles.rotulo}>Jogando como</p>
      <p className={styles.nick}>{sessao.nick}</p>
    </main>
  )
}
