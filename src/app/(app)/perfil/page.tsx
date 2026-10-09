'use client'

import { Pencil, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AvatarHero from '@/components/AvatarHero'
import Conquistas from '@/components/Conquistas'
import ListaDeAmigos from '@/components/ListaDeAmigos'
import ListaDeJogos from '@/components/ListaDeJogos'
import { useSessao } from '@/components/SessaoGuard'
import { buscarMeusJogos, buscarRanking } from '@/data/analytics'
import { meusAmigos, pedidosDeAmizade, type Amigo, type Pedido } from '@/data/amizades'
import { minhasConquistas, type Conquista } from '@/data/conquistas'
import type { JogoResumo } from '@/data/jogadores'
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
  const [jogos, setJogos] = useState<JogoResumo[] | null>(null)
  const [posto, setPosto] = useState<Posto | null>(null)
  const [amigos, setAmigos] = useState<Amigo[] | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [conquistas, setConquistas] = useState<Conquista[] | null>(null)

  function carregarAmigos() {
    if (sessao.convidado) return
    void meusAmigos().then(setAmigos).catch(() => setAmigos(null))
    void pedidosDeAmizade().then(setPedidos).catch(() => {})
  }

  useEffect(carregarAmigos, [sessao.convidado])
  useEffect(() => {
    void minhasConquistas(sessao.id).then(setConquistas).catch(() => {})
  }, [sessao.id])

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

  return (
    <main className="page">
      <h1 className={styles.titulo}>Perfil</h1>

      {/* o avatar como capa da página; editar é o lápis no canto, e não um
          botão a mais ao lado do nick */}
      <AvatarHero avatar={sessao.avatar} className={styles.hero}>
        <Link className={styles.editar} href="/perfil/editar" aria-label="Editar avatar" title="Editar avatar">
          <Pencil size={18} aria-hidden />
        </Link>
      </AvatarHero>
      <div className={styles.quem}>
        <span className={styles.destaque}>{sessao.nick}</span>
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

      {/* amigos: só com conta, e só quando o banco já as tem */}
      {!sessao.convidado && amigos !== null ? (
        <>
          <h2 className={styles.secao}>Amigos</h2>
          {amigos.length === 0 && pedidos.length === 0 ? (
            <p className={styles.nota}>
              Ninguém ainda. Abra o perfil de alguém pelo <Link href="/ranking">ranking</Link> e
              peça amizade.
            </p>
          ) : (
            <ListaDeAmigos amigos={amigos} pedidos={pedidos} aoMudar={carregarAmigos} />
          )}
        </>
      ) : null}

      {conquistas ? (
        <>
          <h2 className={styles.secao}>
            Conquistas · {conquistas.filter((c) => c.ganha_em).length} de {conquistas.length}
          </h2>
          <Conquistas lista={conquistas} />
        </>
      ) : null}

      <h2 className={styles.secao}>Minhas partidas</h2>
      {jogos === null ? (
        <p className={styles.nota}>Carregando…</p>
      ) : (
        <ListaDeJogos
          jogos={jogos}
          vazio="Nenhuma run terminada ainda — jogue até o fim para aparecer aqui."
        />
      )}

    </main>
  )
}
