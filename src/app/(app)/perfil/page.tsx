'use client'

import { Pencil, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import ListaDeJogos from '@/components/ListaDeJogos'
import { useSessao } from '@/components/SessaoGuard'
import { buscarMeusJogos, buscarRanking } from '@/data/analytics'
import { sair } from '@/data/conta'
import type { JogoResumo } from '@/data/jogadores'
import { cancelarSync } from '@/data/sync'
import { limparLocalDoJogo } from '@/game/storage'
import buttons from '@/styles/buttons.module.sass'
import styles from './perfil.module.sass'

interface Posto {
  posicao: number
  total: number
  vitorias: number
  derrotas: number
}

export default function PerfilPage() {
  const sessao = useSessao()
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)
  const [jogos, setJogos] = useState<JogoResumo[] | null>(null)
  const [posto, setPosto] = useState<Posto | null>(null)

  // as partidas e a posição no ranking vieram para cá: "os jogos de fulano" é
  // informação de perfil, não uma seção do site
  useEffect(() => {
    void buscarMeusJogos(sessao.id)
      .then((l) => setJogos(l as JogoResumo[]))
      .catch(() => setJogos([]))
    void buscarRanking()
      .then((linhas) => {
        const i = linhas.findIndex((l) => l.nick === sessao.nick)
        if (i < 0) return
        setPosto({
          posicao: i + 1,
          total: linhas.length,
          vitorias: linhas[i].vitorias,
          derrotas: linhas[i].derrotas,
        })
      })
      .catch(() => {})
  }, [sessao.id, sessao.nick])

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

      <div className={styles.cabecalho}>
        <Avatar avatar={sessao.avatar} tamanho={112} className={styles.retrato} />
        <div className={styles.quem}>
          <span className={styles.destaque}>{sessao.nick}</span>
          <Link className={`${buttons.button} ${styles.editar}`} href="/perfil/editar">
            <Pencil size={14} aria-hidden />
            Editar avatar
          </Link>
        </div>
      </div>

      {posto ? (
        <Link className={styles.posto} href="/ranking">
          <Trophy size={20} aria-hidden />
          <span className={styles.postoNumero}>#{posto.posicao}</span>
          <span className={styles.postoTexto}>
            de {posto.total} no ranking · {posto.vitorias} vitórias, {posto.derrotas} derrotas
          </span>
        </Link>
      ) : null}

      <dl className={styles.dados}>
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
            <dd>Admin — você vê os controles de estado nos feedbacks e o Lab.</dd>
          </div>
        ) : null}
      </dl>
      <p className={styles.nota}>
        Nome e e-mail são só seus: quem abrir o seu perfil vê o nick, o avatar e as partidas.
      </p>

      {sessao.convidado ? (
        <p className={styles.aviso}>
          Como convidado, tudo isto vive só neste navegador: ao sair, as partidas e as cartas
          ganhas se perdem, e não dá para relatar bug. Criar conta leva um minuto e mantém o
          histórico e o lugar no ranking.
        </p>
      ) : null}

      <h2 className={styles.secao}>Minhas partidas</h2>
      {jogos === null ? (
        <p className={styles.nota}>Carregando…</p>
      ) : (
        <ListaDeJogos
          jogos={jogos}
          comReplay
          vazio="Nenhuma run terminada ainda — jogue até o fim para aparecer aqui."
        />
      )}

      <div className={styles.acoes}>
        <button type="button" className={buttons.button} onClick={sairDaConta} disabled={saindo}>
          {saindo ? 'Saindo…' : sessao.convidado ? 'Sair e criar conta' : 'Sair da conta'}
        </button>
      </div>
    </main>
  )
}
