'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { aoMudarConta, lerConta } from '@/data/conta'
import { lerSessao, type Sessao } from '@/game/session'
import styles from './SessaoGuard.module.sass'

const Contexto = createContext<Sessao | null>(null)

/** Quem está jogando. Só pode ser chamado dentro do guarda. */
export function useSessao(): Sessao {
  const sessao = useContext(Contexto)
  if (!sessao) throw new Error('useSessao precisa estar dentro de SessaoGuard.')
  return sessao
}

/**
 * Sem conta (ou sem convidado) não há save: manda voltar para a entrada.
 *
 * O espelho local do perfil serve para a mesa abrir sem piscar "carregando" a
 * cada navegação; a confirmação com o banco vem logo atrás e corrige o que
 * estiver velho — inclusive mandar embora quem saiu da conta em outra aba.
 */
export default function SessaoGuard({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => lerSessao())
  const [pronto, setPronto] = useState(false)
  const router = useRouter()

  const conferir = useCallback(() => {
    lerConta()
      .then((conta) => {
        if (conta.tipo === 'conta' || conta.tipo === 'convidado') {
          setSessao(conta.perfil)
          setPronto(true)
          return
        }
        // fora, ou cadastro pela metade: as duas coisas se resolvem na home
        setSessao(null)
        router.replace('/')
      })
      .catch(() => {
        // banco fora do ar: quem já tem espelho local continua jogando (o
        // save local segura a run), quem não tem volta para a entrada
        if (lerSessao()) setPronto(true)
        else router.replace('/')
      })
  }, [router])

  useEffect(() => {
    conferir()
    return aoMudarConta(conferir)
  }, [conferir])

  if (!pronto || !sessao) {
    return <div className={styles.espera}>Batendo o ponto…</div>
  }

  return <Contexto.Provider value={sessao}>{children}</Contexto.Provider>
}
