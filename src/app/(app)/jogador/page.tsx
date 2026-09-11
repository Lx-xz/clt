'use client'

import { ArrowLeft, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import ListaDeJogos from '@/components/ListaDeJogos'
import { jogosDoJogador, perfilPublico, type JogoResumo, type PerfilPublico } from '@/data/jogadores'
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

      <h2 className={styles.secao}>Partidas</h2>
      {/* sem replay: `jogo_detalhe()` confere o dono e devolveria vazio */}
      <ListaDeJogos jogos={jogos} comReplay={false} vazio="Ainda não terminou nenhuma partida." />
    </>
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
