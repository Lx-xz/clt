'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Perfil from '@/components/Perfil/Perfil'
import { useSessao } from '@/components/SessaoGuard'
import styles from './jogador.module.sass'

/**
 * O perfil de outra pessoa, aberto ao clicar num nick no ranking — o mesmo
 * componente do seu (v0.34). Quem não é amigo vê o resumo; o amigo vê também
 * os baralhos e as cartas. **Nome, e-mail e pontos não passam por aqui.**
 *
 * O nick vem por query string porque o site é export estático; query string
 * precisa de `<Suspense>` em volta, senão o build estático falha.
 */
function Conteudo() {
  const nick = useSearchParams().get('nick') ?? ''
  const sessao = useSessao()
  if (!nick) return <p className={styles.vazio}>Ninguém foi escolhido.</p>
  return <Perfil nick={nick} meu={nick === sessao.nick} />
}

export default function JogadorPage() {
  return (
    <main className="page">
      <Link className={styles.voltar} href="/ranking">
        <ArrowLeft size={14} aria-hidden />
        voltar ao ranking
      </Link>
      <Suspense fallback={<p className={styles.vazio}>Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  )
}
