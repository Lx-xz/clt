'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { lerSessao, type Sessao } from '@/game/session'
import styles from './SessaoGuard.module.sass'

const Contexto = createContext<Sessao | null>(null)

/** Quem está jogando. Só pode ser chamado dentro do guarda. */
export function useSessao(): Sessao {
  const sessao = useContext(Contexto)
  if (!sessao) throw new Error('useSessao precisa estar dentro de SessaoGuard.')
  return sessao
}

/** Sem nick não há save: manda escolher um antes de abrir mesa ou baralho. */
export default function SessaoGuard({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [pronto, setPronto] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const s = lerSessao()
    if (!s) {
      router.replace('/')
      return
    }
    setSessao(s)
    setPronto(true)
  }, [router])

  if (!pronto || !sessao) {
    return <div className={styles.espera}>Batendo o ponto…</div>
  }

  return <Contexto.Provider value={sessao}>{children}</Contexto.Provider>
}
