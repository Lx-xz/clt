'use client'

import Link from 'next/link'
import { Fragment, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Avatar from '@/components/Avatar'
import Segmentado from '@/components/Segmentado'
import { meusAmigos } from '@/data/amizades'
import { buscarRanking, type LinhaRanking } from '@/data/analytics'
import { lerAvatar } from '@/data/avatar'
import { useSessao } from '@/components/SessaoGuard'
import buttons from '@/styles/buttons.module.sass'
import styles from './ranking.module.sass'

type Estado = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; linhas: LinhaRanking[] }

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

export default function RankingPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  // no celular só cabem nick/vitórias/derrotas; o resto vira uma linha que
  // abre por toque. No desktop as colunas já estão todas à vista e isto não
  // tem efeito nenhum (a linha extra fica display:none)
  const [aberto, setAberto] = useState<string | null>(null)
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
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th className={styles.num}>
                <span className={styles.longo}>Vitórias</span>
                <span className={styles.curto}>V</span>
              </th>
              <th className={styles.num}>
                <span className={styles.longo}>Derrotas</span>
                <span className={styles.curto}>D</span>
              </th>
              <th className={`${styles.num} ${styles.colOculta}`}>Partidas</th>
              <th className={`${styles.num} ${styles.colOculta}`}>Melhor R$</th>
              <th className={styles.colOculta}>Última vez</th>
            </tr>
          </thead>
          <tbody>
            {estado.linhas.map((linha, i) => {
              const euMesmo = linha.nick === sessao.nick
              // a posição continua a do ranking geral: filtrar é olhar, não
              // reordenar — o amigo em 14º continua em 14º
              if (filtro === 'amigos' && !euMesmo && !amigos?.has(linha.nick)) return null
              const expandida = aberto === linha.nick
              return (
                <Fragment key={linha.nick}>
                  <tr
                    className={`${styles.linha} ${euMesmo ? styles.euMesmo : ''}`}
                    onClick={() => setAberto(expandida ? null : linha.nick)}
                  >
                    <td className={styles.posicao}>{i + 1}</td>
                    <td className={styles.jogador}>
                      <Avatar avatar={lerAvatar(linha.avatar)} tamanho={28} className={styles.avatar} />
                      {/* o nick abre o perfil daquela pessoa; o resto da
                          linha continua servindo para expandir no celular,
                          então o clique do link não pode subir para a <tr> */}
                      <Link
                        className={styles.nick}
                        href={`/jogador?nick=${encodeURIComponent(linha.nick)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {linha.nick}
                      </Link>
                      {euMesmo ? <span className={styles.voce}>você</span> : null}
                      <ChevronDown
                        className={`${styles.seta} ${expandida ? styles.setaAberta : ''}`}
                        size={14}
                        aria-hidden
                      />
                    </td>
                    <td className={`${styles.num} ${styles.vitorias}`}>{linha.vitorias}</td>
                    <td className={styles.num}>{linha.derrotas}</td>
                    <td className={`${styles.num} ${styles.colOculta}`}>{linha.total_runs}</td>
                    <td className={`${styles.num} ${styles.colOculta}`}>R$ {linha.melhor_dinheiro}</td>
                    <td className={`${styles.data} ${styles.colOculta}`}>{formatarData(linha.ultima_partida)}</td>
                  </tr>

                  {expandida ? (
                    <tr className={styles.detalhe}>
                      <td colSpan={4}>
                        <dl className={styles.campos}>
                          <div>
                            <dt>Partidas</dt>
                            <dd>{linha.total_runs}</dd>
                          </div>
                          <div>
                            <dt>Melhor R$</dt>
                            <dd>{linha.melhor_dinheiro}</dd>
                          </div>
                          <div>
                            <dt>Última vez</dt>
                            <dd>{formatarData(linha.ultima_partida)}</dd>
                          </div>
                        </dl>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      ) : null}
    </main>
  )
}
