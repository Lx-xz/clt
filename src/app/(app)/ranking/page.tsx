'use client'

import { useEffect, useState } from 'react'
import { buscarRanking, type LinhaRanking } from '@/data/analytics'
import { useSessao } from '@/components/SessaoGuard'
import buttons from '@/styles/buttons.module.sass'
import styles from './ranking.module.sass'

type Estado = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; linhas: LinhaRanking[] }

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

export default function RankingPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const sessao = useSessao()

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
        Todo mundo que já terminou pelo menos uma run, ordenado por vitórias. O nick não é senha — é
        só quem está jogando cada save.
      </p>

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
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>#</th>
                <th>Jogador</th>
                <th className={styles.num}>Vitórias</th>
                <th className={styles.num}>Derrotas</th>
                <th className={`${styles.num} ${styles.colOculta}`}>Partidas</th>
                <th className={`${styles.num} ${styles.colOculta}`}>Melhor R$</th>
                <th className={styles.colOculta}>Última vez</th>
              </tr>
            </thead>
            <tbody>
              {estado.linhas.map((linha, i) => {
                const euMesmo = linha.nick === sessao.nick
                return (
                  <tr key={linha.nick} className={`${styles.linha} ${euMesmo ? styles.euMesmo : ''}`}>
                    <td className={styles.posicao}>{i + 1}</td>
                    <td>
                      <span className={styles.nick}>{linha.nick}</span>
                      {euMesmo ? <span className={styles.voce}>você</span> : null}
                    </td>
                    <td className={`${styles.num} ${styles.vitorias}`}>{linha.vitorias}</td>
                    <td className={styles.num}>{linha.derrotas}</td>
                    <td className={`${styles.num} ${styles.colOculta}`}>{linha.total_runs}</td>
                    <td className={`${styles.num} ${styles.colOculta}`}>R$ {linha.melhor_dinheiro}</td>
                    <td className={`${styles.data} ${styles.colOculta}`}>{formatarData(linha.ultima_partida)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  )
}
