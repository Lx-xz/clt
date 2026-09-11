'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSessao } from '@/components/SessaoGuard'
import { sair } from '@/data/conta'
import { cancelarSync } from '@/data/sync'
import { limparLocalDoJogo } from '@/game/storage'
import buttons from '@/styles/buttons.module.sass'
import styles from './perfil.module.sass'

export default function PerfilPage() {
  const sessao = useSessao()
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)

  function sairDaConta() {
    setSaindo(true)
    // o espelho local do jogo não pode sobrar para o próximo que entrar
    cancelarSync()
    limparLocalDoJogo()
    void sair().finally(() => router.replace('/'))
  }

  return (
    <main className="page">
      <h1 className={styles.titulo}>Perfil</h1>

      <dl className={styles.dados}>
        <div>
          <dt>Nick</dt>
          <dd className={styles.destaque}>{sessao.nick}</dd>
        </div>
        {sessao.nome ? (
          <div>
            <dt>Nome</dt>
            <dd>{sessao.nome}</dd>
          </div>
        ) : null}
        {sessao.email ? (
          <div>
            <dt>E-mail</dt>
            <dd className={styles.mono}>{sessao.email}</dd>
          </div>
        ) : null}
        <div>
          <dt>Conta</dt>
          <dd>{sessao.convidado ? 'Convidado (sem conta)' : 'Conta própria'}</dd>
        </div>
        {sessao.convidado ? null : (
          <div>
            <dt>Pontos de feedback</dt>
            <dd className={styles.mono}>{sessao.pontos}</dd>
          </div>
        )}
        {sessao.admin ? (
          <div>
            <dt>Permissão</dt>
            <dd>Admin — você vê os controles de estado, urgência e nota nos feedbacks.</dd>
          </div>
        ) : null}
      </dl>

      {sessao.convidado ? (
        <p className={styles.aviso}>
          Como convidado, tudo isto vive só neste navegador: ao sair, as partidas e as cartas
          ganhas se perdem, e não dá para relatar bug. Criar conta leva um minuto e mantém o
          histórico e o lugar no ranking.
        </p>
      ) : (
        <p className={styles.nota}>
          Os pontos vêm da nota que os relatos recebem em <Link href="/feedback">Feedbacks</Link>.
          Ainda não dá para gastá-los — a recompensa está em <Link href="/changelog">Novidades</Link>
          , na lista do que está sendo feito.
        </p>
      )}

      <div className={styles.acoes}>
        <button type="button" className={buttons.button} onClick={sairDaConta} disabled={saindo}>
          {saindo ? 'Saindo…' : sessao.convidado ? 'Sair e criar conta' : 'Sair da conta'}
        </button>
      </div>
    </main>
  )
}
