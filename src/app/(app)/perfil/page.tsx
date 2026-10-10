'use client'

import { Pencil, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AvatarHero from '@/components/AvatarHero'
import Conquistas from '@/components/Conquistas'
import Dialogo from '@/components/Dialogo'
// direto do arquivo, e não do `index.ts` da pasta: com o perfil sendo a ÚNICA
// página que importa o componente pelo índice, o Next 15.5 perde a página do
// manifesto de cliente e o build falha em "/perfil" ("Could not find the
// module ... in the React Client Manifest"). Apareceu quando o início deixou
// de mostrar os amigos; veja a armadilha no CLAUDE.md
import ListaDeAmigos from '@/components/ListaDeAmigos/ListaDeAmigos'
import { ReciboResumido, dadosDaLinha } from '@/components/Recibo'
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
  const [vendo, setVendo] = useState<'conquistas' | null>(null)

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
      <AvatarHero avatar={sessao.avatar} className={styles.hero}>
        <Link className={styles.editar} href="/perfil/editar" aria-label="Editar avatar" title="Editar avatar">
          <Pencil size={18} aria-hidden />
        </Link>
      </AvatarHero>
      <div className={styles.quem}>
        <span className={styles.destaque}>{sessao.nick}</span>
      </div>

      {/* o rank, com o placar no mesmo jeito do ranking */}
      {posto ? (
        <Link className={styles.posto} href="/ranking">
          <Trophy size={22} aria-hidden />
          <span className={styles.postoNumero}>#{posto.posicao}</span>
          <span className={styles.postoTexto}>de {posto.total} no ranking</span>
          <span className={styles.placar}>
            <span className={styles.v}>
              {posto.vitorias}
              <small> V</small>
            </span>
            <span className={styles.d}>
              {posto.derrotas}
              <small> D</small>
            </span>
          </span>
        </Link>
      ) : (
        <p className={styles.nota}>
          {sessao.convidado
            ? 'Convidado não entra no ranking. Crie uma conta para ter um lugar no placar.'
            : 'Fora do ranking por enquanto — termine um mês para entrar.'}
        </p>
      )}

      {/* a última partida e as conquistas mostram o RESUMO; a lista inteira
          abre no "ver todas". O perfil era uma parede que se atravessava
          rolando: dados da conta, amigos, todas as conquistas com
          descrição e todas as partidas, uma embaixo da outra */}
      <div className={styles.cabecaSecao}>
        <h2 className={styles.secao}>Última partida</h2>
        {jogos && jogos.length > 1 ? (
          <Link className={styles.verTodas} href="/meus-jogos">
            Ver todas ({jogos.length})
          </Link>
        ) : null}
      </div>
      {/* a última partida como recibo resumido — o "bilhete" que o início
          mostrava antes de ficar limpo. A lista inteira é uma página, com
          filtro e ordem: é para percorrer, e popup é para olhar e fechar */}
      {jogos === null ? (
        <p className={styles.nota}>Carregando…</p>
      ) : jogos[0] ? (
        <ReciboResumido id={jogos[0].id} dados={dadosDaLinha(jogos[0])} className={styles.ultima} />
      ) : (
        <p className={styles.nota}>Nenhuma run terminada ainda — jogue até o fim para aparecer aqui.</p>
      )}

      {conquistas ? (
        <>
          <div className={styles.cabecaSecao}>
            <h2 className={styles.secao}>
              Conquistas · {conquistas.filter((c) => c.ganha_em).length} de {conquistas.length}
            </h2>
            <button type="button" className={styles.verTodas} onClick={() => setVendo('conquistas')}>
              Ver todas
            </button>
          </div>
          <Conquistas lista={conquistas} selos />
        </>
      ) : null}

      {/* amigos: só com conta, e só quando o banco já as tem. É aqui que se
          aceita pedido, então fica inteiro */}
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

      {vendo === 'conquistas' && conquistas ? (
        <Dialogo titulo="Conquistas" largo onFechar={() => setVendo(null)}>
          <Conquistas lista={conquistas} />
        </Dialogo>
      ) : null}
    </main>
  )
}
