'use client'

import { useEffect, useState } from 'react'
import { buscarEstatisticasGerais, type EstatisticasGerais } from '@/data/analytics'
import buttons from '@/styles/buttons.module.sass'
import styles from './analytics.module.sass'

/**
 * Página de análise, reservada: sem link na barra lateral, só acessível
 * digitando /analytics. Serve para acompanhar balanceamento — quantas runs
 * terminam em quê — sem expor nada disso ao jogador comum.
 */
type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; dados: EstatisticasGerais }

const DERROTAS = [
  { chave: 'burnouts' as const, rotulo: 'Burnout', cor: 'var(--estresse)' },
  { chave: 'demissoes' as const, rotulo: 'Demissão', cor: 'var(--destaque)' },
  { chave: 'despejos' as const, rotulo: 'Despejo', cor: 'var(--tinta-fraca)' },
]

export default function AnalyticsPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })

  function carregar() {
    setEstado({ tipo: 'carregando' })
    buscarEstatisticasGerais()
      .then((dados) => setEstado({ tipo: 'pronto', dados }))
      .catch((e: unknown) =>
        setEstado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não deu para falar com o banco.' }),
      )
  }

  useEffect(carregar, [])

  return (
    <main className="page">
      <div className={styles.top}>
        <h1 className={styles.title}>Análise</h1>
      </div>
      <p className={styles.hint}>
        Página reservada — sem link no menu. Contagens agregadas de todo mundo, para acompanhar
        balanceamento; nenhum nick aparece aqui.
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

      {estado.tipo === 'pronto' ? <Conteudo dados={estado.dados} /> : null}
    </main>
  )
}

function Conteudo({ dados }: { dados: EstatisticasGerais }) {
  const totalDerrotas = dados.burnouts + dados.demissoes + dados.despejos
  const taxaVitoria = dados.total_runs > 0 ? Math.round((dados.vitorias / dados.total_runs) * 100) : 0

  return (
    <>
      <div className={styles.grade}>
        <Ladrilho rotulo="Jogadores" valor={dados.jogadores} sub={`${dados.jogadores_que_jogaram} já jogaram`} />
        <Ladrilho rotulo="Runs terminadas" valor={dados.total_runs} />
        <Ladrilho rotulo="Vitórias" valor={dados.vitorias} sub={`${taxaVitoria}% de taxa`} />
        <Ladrilho rotulo="Derrotas" valor={totalDerrotas} />
        <Ladrilho rotulo="Dia médio" valor={dados.dia_medio ?? '—'} sub="de 20" />
      </div>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Tipo de derrota</h2>
        </div>
        {totalDerrotas === 0 ? (
          <p className={styles.empty}>Ninguém perdeu ainda.</p>
        ) : (
          <div className={styles.barras}>
            {DERROTAS.map(({ chave, rotulo, cor }) => {
              const n = dados[chave]
              const pct = totalDerrotas > 0 ? (n / totalDerrotas) * 100 : 0
              return (
                <div className={styles.barraLinha} key={chave}>
                  <span>{rotulo}</span>
                  <span className={styles.barraFundo}>
                    <span className={styles.barraPreenchida} style={{ width: `${pct}%`, background: cor }} />
                  </span>
                  <span className={styles.numBarra}>
                    {n} · {Math.round(pct)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

function Ladrilho({ rotulo, valor, sub }: { rotulo: string; valor: number | string; sub?: string }) {
  return (
    <div className={styles.ladrilho}>
      <span className={styles.rotulo}>{rotulo}</span>
      <span className={styles.valor}>{valor}</span>
      {sub ? <span className={styles.sub}>{sub}</span> : null}
    </div>
  )
}
