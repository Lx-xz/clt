'use client'

import { useEffect, useState } from 'react'
import {
  buscarCartasFatais,
  buscarCartasJogadas,
  buscarEscolhasDeEvento,
  buscarEstatisticasGerais,
  buscarEstatisticasNerds,
  buscarEstressePorDia,
  type CartaFatal,
  type CartaJogada,
  type EscolhaDeEvento,
  type EstatisticasGerais,
  type EstatisticasNerds,
  type EstressePorDia,
} from '@/data/analytics'
import { getCard } from '@/game/cards'
import { getEvent } from '@/game/events'
import buttons from '@/styles/buttons.module.sass'
import styles from './analytics.module.sass'

/**
 * Página de análise: contagens agregadas de todo mundo, para acompanhar
 * balanceamento. Nenhum nick aparece aqui — nem as runs que o jogador pediu
 * para não guardar, que entram invisíveis só para as contagens.
 */
interface Dados {
  gerais: EstatisticasGerais
  nerds: EstatisticasNerds
  cartas: CartaJogada[]
  fatais: CartaFatal[]
  escolhas: EscolhaDeEvento[]
  estresse: EstressePorDia[]
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; dados: Dados }

const DERROTAS = [
  { chave: 'burnouts' as const, rotulo: 'Burnout', cor: 'var(--estresse)' },
  { chave: 'demissoes' as const, rotulo: 'Demissão', cor: 'var(--destaque)' },
  { chave: 'despejos' as const, rotulo: 'Despejo', cor: 'var(--tinta-fraca)' },
]

export default function AnalyticsPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })

  function carregar() {
    setEstado({ tipo: 'carregando' })
    Promise.all([
      buscarEstatisticasGerais(),
      buscarEstatisticasNerds(),
      buscarCartasJogadas(),
      buscarCartasFatais(),
      buscarEscolhasDeEvento(),
      buscarEstressePorDia(),
    ])
      .then(([gerais, nerds, cartas, fatais, escolhas, estresse]) =>
        setEstado({ tipo: 'pronto', dados: { gerais, nerds, cartas, fatais, escolhas, estresse } }),
      )
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
        Contagens agregadas de todo mundo, para acompanhar balanceamento. Nenhum nick aparece
        aqui.
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

function nomeDaCarta(id: string): string {
  try {
    return getCard(id).name
  } catch {
    return id
  }
}

function Conteudo({ dados }: { dados: Dados }) {
  const { gerais, nerds, cartas, fatais, escolhas, estresse } = dados
  const totalDerrotas = gerais.burnouts + gerais.demissoes + gerais.despejos
  const taxaVitoria = gerais.total_runs > 0 ? Math.round((gerais.vitorias / gerais.total_runs) * 100) : 0
  const maisJogadas = cartas.slice(0, 10)
  const tetoCartas = maisJogadas[0]?.vezes ?? 0
  const picoEstresse = estresse.reduce((a, b) => (b.estresse_medio > a ? b.estresse_medio : a), 0)

  return (
    <>
      <div className={styles.grade}>
        <Ladrilho rotulo="Jogadores" valor={gerais.jogadores} sub={`${gerais.jogadores_que_jogaram} já jogaram`} />
        <Ladrilho rotulo="Runs terminadas" valor={gerais.total_runs} />
        <Ladrilho rotulo="Vitórias" valor={gerais.vitorias} sub={`${taxaVitoria}% de taxa`} />
        <Ladrilho rotulo="Derrotas" valor={totalDerrotas} />
        <Ladrilho rotulo="Abandonos" valor={gerais.abandonos} sub="largadas no meio" />
        <Ladrilho rotulo="Dia médio" valor={gerais.dia_medio ?? '—'} sub="de 20" />
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
              const n = gerais[chave]
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

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Estatísticas para nerds</h2>
        </div>
        <div className={styles.grade}>
          <Ladrilho rotulo="Cartas jogadas" valor={nerds.total_cartas_jogadas} sub="somando todo mundo" />
          <Ladrilho rotulo="Dias vividos" valor={nerds.total_dias_vividos} />
          <Ladrilho rotulo="Maior embalo" valor={nerds.maior_embalo ?? '—'} sub="cartas seguidas" />
          <Ladrilho rotulo="Advertências" valor={nerds.total_advertencias} />
          <Ladrilho rotulo="Dinheiro somado" valor={`R$ ${nerds.dinheiro_total}`} />
          <Ladrilho
            rotulo="Duração média"
            valor={nerds.duracao_media_min != null ? `${nerds.duracao_media_min} min` : '—'}
            sub={nerds.run_mais_rapida_min != null ? `vitória mais rápida: ${nerds.run_mais_rapida_min} min` : undefined}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Cartas mais jogadas</h2>
        </div>
        {maisJogadas.length === 0 ? (
          <p className={styles.empty}>Ninguém jogou carta nenhuma ainda.</p>
        ) : (
          <div className={styles.barras}>
            {maisJogadas.map((carta) => (
              <div className={styles.barraLinha} key={carta.card_id}>
                <span>{nomeDaCarta(carta.card_id)}</span>
                <span className={styles.barraFundo}>
                  <span
                    className={styles.barraPreenchida}
                    style={{
                      width: `${tetoCartas > 0 ? (carta.vezes / tetoCartas) * 100 : 0}%`,
                      background: 'var(--produtividade)',
                    }}
                  />
                </span>
                <span className={styles.numBarra}>{carta.vezes}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>A carta que mais mata</h2>
        </div>
        <p className={styles.hint}>A última carta jogada antes de a run acabar mal.</p>
        {fatais.length === 0 ? (
          <p className={styles.empty}>Ninguém perdeu ainda.</p>
        ) : (
          <ul className={styles.lista}>
            {fatais.slice(0, 8).map((f) => (
              <li key={`${f.outcome}-${f.card_id}`}>
                <span className={styles.chave}>{nomeDaCarta(f.card_id)}</span>
                <span className={styles.sub}>{f.outcome}</span>
                <span className={styles.numBarra}>{f.vezes}×</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Eventos ambíguos</h2>
        </div>
        <p className={styles.hint}>Qual lado o pessoal escolhe quando o evento deixa escolher.</p>
        {escolhas.length === 0 ? (
          <p className={styles.empty}>Nenhuma escolha registrada ainda.</p>
        ) : (
          <ul className={styles.lista}>
            {escolhas.map((e) => (
              <li key={`${e.event_id}-${e.escolha}`}>
                <span className={styles.chave}>{rotuloDoEvento(e.event_id, e.escolha)}</span>
                <span className={styles.numBarra}>{e.vezes}×</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Curva do estresse</h2>
        </div>
        <p className={styles.hint}>Estresse médio no fim de cada dia do mês.</p>
        {estresse.length === 0 ? (
          <p className={styles.empty}>Sem dias registrados ainda.</p>
        ) : (
          <div className={styles.barras}>
            {estresse.map((d) => (
              <div className={styles.barraLinha} key={d.day}>
                <span>Dia {d.day}</span>
                <span className={styles.barraFundo}>
                  <span
                    className={styles.barraPreenchida}
                    style={{
                      width: `${picoEstresse > 0 ? (d.estresse_medio / picoEstresse) * 100 : 0}%`,
                      background: 'var(--estresse)',
                    }}
                  />
                </span>
                <span className={styles.numBarra}>{d.estresse_medio}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

/** "Happy Hour — ir" em vez de "evt-happy-hour / 0". */
function rotuloDoEvento(id: string, escolha: 0 | 1): string {
  try {
    const evento = getEvent(id)
    const opcao = evento.choices?.[escolha]
    return opcao ? `${evento.name} — ${opcao.label}` : `${evento.name} — opção ${escolha + 1}`
  } catch {
    return `${id} — opção ${escolha + 1}`
  }
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
