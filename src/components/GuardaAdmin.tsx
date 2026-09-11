'use client'

import { useEffect, useState } from 'react'
import { useSessao } from './SessaoGuard'
import { souAdmin } from '@/data/feedback'
import styles from './GuardaAdmin.module.sass'

/**
 * A trava do `/lab`. Quem responde se você é admin é o BANCO (`sou_admin()`),
 * e não o perfil espelhado no navegador — que pode estar velho, e que
 * qualquer pessoa consegue reescrever.
 *
 * Dito isso, esta guarda é conveniência, não segurança: o código das páginas
 * de dentro vai no mesmo bundle para todo mundo, porque o site é estático. O
 * que protege de verdade é que nenhuma ação do lab grava coisa alheia — as
 * de admin de verdade (status de feedback, por exemplo) são recusadas pelo
 * próprio Postgres. Não ponha aqui dentro nada que dependa de esconder.
 */
export default function GuardaAdmin({ children }: { children: React.ReactNode }) {
  const sessao = useSessao()
  const [admin, setAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (sessao.convidado) {
      setAdmin(false)
      return
    }
    void souAdmin().then(setAdmin)
  }, [sessao.convidado])

  if (admin === null) return <main className="page">Conferindo…</main>
  if (!admin) {
    return (
      <main className="page">
        <h1 className={styles.titulo}>Lab</h1>
        <p className={styles.texto}>
          Esta é a oficina de quem constrói o jogo, e só o admin abre. Nada aqui muda a sua conta
          nem o seu jogo — para isso são o perfil e a mesa.
        </p>
      </main>
    )
  }
  return <>{children}</>
}
