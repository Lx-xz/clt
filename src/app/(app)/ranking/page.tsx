'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import Segmentado from '@/components/Segmentado'
import { meusAmigos } from '@/data/amizades'
import { buscarRanking, type LinhaRanking } from '@/data/analytics'
import { lerAvatar } from '@/data/avatar'
import { useSessao } from '@/components/SessaoGuard'
import buttons from '@/styles/buttons.module.sass'
import styles from './ranking.module.sass'
import Dinheiro from '@/components/Dinheiro'

type Estado = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; linhas: LinhaRanking[] }

export default function RankingPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const sessao = useSessao()
  // "amigos" filtra no cliente: o ranking já vem inteiro, e uma função
  // nova no banco só para isso seria uma viagem a mais para a mesma lista
  const [filtro, setFiltro] = useState<'todos' | 'amigos'>('todos')
  const [amigos, setAmigos] = useState<Set<string> | null>(null)

  useEffect(() => {
    if (sessao.convidado) return
    void meusAmigos()
      .then((lista) => setAmigos(new Set(lista.map((a) => a.nick))))
      .catch(() => {})
  }, [sessao.convidado])

  function carregar() {
    setEstado({ tipo: 'carregando' })
    buscarRanking()
      .then((linhas) => setEstado({ tipo: 'pronto', linhas }))
      .catch((e: unknown) =>
        setEstado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não deu para falar com o banco.' }),
      )
  }

  useEffect(carregar, [])

  return (
    <main className="page">
      <div className={styles.top}>
        <h1 className={styles.title}>Ranking</h1>
      </div>
      <p className={styles.hint}>
        Todo mundo com conta que já terminou pelo menos uma run, ordenado por vitórias. Convidado
        não entra: o nick dele é sorteado e some quando ele sai.
      </p>

      {amigos && amigos.size > 0 ? (
        <div className={styles.filtro}>
          <Segmentado
            rotulo="Quem mostrar"
            valor={filtro}
            onChange={setFiltro}
            opcoes={[
              { valor: 'todos', rotulo: 'Todos' },
              { valor: 'amigos', rotulo: `Amigos (${amigos.size})` },
            ]}
          />
        </div>
      ) : null}

      {estado.tipo === 'carregando' ? <p className={styles.empty}>Carregando…</p> : null}

      {estado.tipo === 'erro' ? (
        <div className={styles.erro}>
          <span>{estado.mensagem}</span>
          <button type="button" className={buttons.button} onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      ) : null}

      {estado.tipo === 'pronto' && estado.linhas.length === 0 ? (
        <p className={styles.empty}>Ninguém terminou uma run ainda — seja a primeira.</p>
      ) : null}

      {estado.tipo === 'pronto' && estado.linhas.length > 0 ? (
        // uma lista de linhas, como o placar do Duolingo: medalha, rosto,
        // nick e o placar à direita. A linha inteira leva ao perfil — o
        // "abrir para ver mais" que existia antes mostrava partidas, melhor
        // saldo e data, e isso agora mora no perfil de cada um
        <ol className={styles.lista}>
          {estado.linhas.map((linha, i) => {
            const euMesmo = linha.nick === sessao.nick
            // a posição continua a do ranking geral: filtrar é olhar, não
            // reordenar — o amigo em 14º continua em 14º
            if (filtro === 'amigos' && !euMesmo && !amigos?.has(linha.nick)) return null
            const posicao = i + 1
            return (
              <li key={linha.nick}>
                <Link
                  className={`${styles.linha} ${euMesmo ? styles.euMesmo : ''}`}
                  href={`/jogador?nick=${encodeURIComponent(linha.nick)}`}
                  aria-current={euMesmo ? 'true' : undefined}
                >
                  <span
                    className={`${styles.posicao} ${posicao <= 3 ? `${styles.medalha} ${styles[`medalha${posicao}`]}` : ''}`}
                    aria-label={`${posicao}º lugar`}
                  >
                    {posicao}
                  </span>
                  <Avatar avatar={lerAvatar(linha.avatar)} tamanho={64} redondo className={styles.avatar} />
                  <span className={styles.quem}>
                    <span className={styles.nick}>{linha.nick}</span>
                    <span className={styles.sub}>
                      {linha.total_runs} {linha.total_runs === 1 ? 'partida' : 'partidas'}
                      {linha.melhor_dinheiro !== null ? (
                        <>
                          {' '}· melhor <Dinheiro valor={linha.melhor_dinheiro} />
                        </>
                      ) : null}
                    </span>
                  </span>
                  {/* no lugar do XP: vitórias e derrotas, que é o que o
                      ranking ordena */}
                  <span className={styles.placar}>
                    <span className={styles.v}>
                      {linha.vitorias}
                      <small> V</small>
                    </span>
                    <span className={styles.d}>
                      {linha.derrotas}
                      <small> D</small>
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      ) : null}
    </main>
  )
}
