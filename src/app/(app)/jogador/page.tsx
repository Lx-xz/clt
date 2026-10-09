'use client'

import { ArrowLeft, Trophy, UserCheck, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import BotaoConfirmar from '@/components/BotaoConfirmar'
import Conquistas from '@/components/Conquistas'
import ListaDeJogos from '@/components/ListaDeJogos'
import { useSessao } from '@/components/SessaoGuard'
import {
  amizadeCom,
  desfazerAmizade,
  pedirAmizade,
  responderAmizade,
  type EstadoDaAmizade,
} from '@/data/amizades'
import { conquistasPublicas, type Conquista } from '@/data/conquistas'
import { jogosDoJogador, perfilPublico, type JogoResumo, type PerfilPublico } from '@/data/jogadores'
import buttons from '@/styles/buttons.module.sass'
import styles from './jogador.module.sass'

/**
 * O perfil de outra pessoa, aberto ao clicar num nick no ranking.
 *
 * O que ele mostra já era público antes dele existir: nick, avatar, vitórias,
 * derrotas e as partidas guardadas. **Nome, e-mail e pontos não passam por
 * aqui** — quem devolve esses é `meu_perfil()`, filtrado por `auth.uid()`, e
 * a decisão de o que é público mora na função do banco, não nesta tela.
 *
 * O nick vem por query string porque o site é export estático: uma rota
 * `/jogador/[nick]` exigiria listar em build time todo nick que um dia vai
 * existir. Query string precisa de `<Suspense>` em volta, senão o build
 * estático falha.
 */
function Conteudo() {
  const nick = useSearchParams().get('nick') ?? ''
  const [perfil, setPerfil] = useState<PerfilPublico | null | 'nao-achou'>(null)
  const [jogos, setJogos] = useState<JogoResumo[]>([])
  const [conquistas, setConquistas] = useState<Conquista[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!nick) {
      setPerfil('nao-achou')
      return
    }
    perfilPublico(nick)
      .then((p) => setPerfil(p ?? 'nao-achou'))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Não deu para carregar.'))
    void jogosDoJogador(nick).then(setJogos).catch(() => {})
    void conquistasPublicas(nick).then(setConquistas).catch(() => {})
  }, [nick])

  if (erro) return <p className={styles.vazio}>{erro}</p>
  if (perfil === null) return <p className={styles.vazio}>Carregando…</p>
  if (perfil === 'nao-achou') {
    return <p className={styles.vazio}>Não existe ninguém com o nick “{nick}”.</p>
  }

  const desde = new Date(perfil.desde).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <div className={styles.cabecalho}>
        <Avatar avatar={perfil.avatar} tamanho={112} className={styles.retrato} />
        <div className={styles.quem}>
          <span className={styles.nick}>{perfil.nick}</span>
          <span className={styles.desde}>por aqui desde {desde}</span>
          <BotaoAmizade nick={perfil.nick} />
        </div>
      </div>

      <div className={styles.placar}>
        <div>
          <Trophy size={18} aria-hidden />
          <b>{perfil.vitorias}</b>
          <span>vitórias</span>
        </div>
        <div>
          <b>{perfil.derrotas}</b>
          <span>derrotas</span>
        </div>
        <div>
          <b>{perfil.melhor_dinheiro === null ? '—' : `R$ ${perfil.melhor_dinheiro}`}</b>
          <span>melhor saldo</span>
        </div>
      </div>

      {conquistas && conquistas.length > 0 ? (
        <>
          <h2 className={styles.secao}>Conquistas</h2>
          <Conquistas lista={conquistas} />
        </>
      ) : null}

      <h2 className={styles.secao}>Partidas</h2>
      <ListaDeJogos jogos={jogos} vazio="Ainda não terminou nenhuma partida." />
    </>
  )
}

/**
 * O botão de amizade. Um só, que muda de papel conforme o estado: pedir,
 * aceitar o pedido que ela mandou, ou desfazer — com o segundo clique, como
 * toda ação que não se desfaz sozinha. Some quando não faz sentido: o
 * próprio perfil, o banco antigo (sem amizades) e o convidado, que ganha a
 * explicação em vez do botão.
 */
function BotaoAmizade({ nick }: { nick: string }) {
  const sessao = useSessao()
  const [estado, setEstado] = useState<EstadoDaAmizade | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    void amizadeCom(nick).then(setEstado).catch(() => setEstado(null))
  }, [nick])

  if (sessao.convidado) {
    return <span className={styles.amizadeNota}>Crie uma conta para adicionar amigos.</span>
  }
  if (estado === null || estado === 'eu' || estado === 'sem_conta') return null

  function agir(acao: () => Promise<EstadoDaAmizade>) {
    setOcupado(true)
    setErro(null)
    acao()
      .then(setEstado)
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Não deu certo.'))
      .finally(() => setOcupado(false))
  }

  return (
    <span className={styles.amizade}>
      {estado === 'nenhuma' ? (
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          disabled={ocupado}
          onClick={() => agir(() => pedirAmizade(nick))}
        >
          <UserPlus size={15} aria-hidden /> Pedir amizade
        </button>
      ) : null}
      {estado === 'recebido' ? (
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          disabled={ocupado}
          onClick={() => agir(async () => (await responderAmizade(nick, true), 'amigos'))}
        >
          <UserCheck size={15} aria-hidden /> Aceitar pedido
        </button>
      ) : null}
      {estado === 'enviado' || estado === 'amigos' ? (
        <>
          <span className={styles.amizadeEstado}>
            {estado === 'amigos' ? <><UserCheck size={15} aria-hidden /> Amigos</> : 'Pedido enviado'}
          </span>
          <BotaoConfirmar
            className={`${buttons.button} ${styles.desfazer}`}
            armado={estado === 'amigos' ? 'Confirmar: desfazer' : 'Confirmar: cancelar'}
            desabilitado={ocupado}
            onConfirmar={() => agir(async () => (await desfazerAmizade(nick), 'nenhuma'))}
          >
            {estado === 'amigos' ? 'Desfazer' : 'Cancelar'}
          </BotaoConfirmar>
        </>
      ) : null}
      {erro ? <span className={styles.amizadeNota}>{erro}</span> : null}
    </span>
  )
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
