'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { buscarDetalheDoJogo, type DetalheDoJogo } from '@/data/analytics'
import Card from '@/components/Card'
import { cartaParaMostrar } from '@/data/balanceamento'
import { getEvent } from '@/game/catalogo'
import { useSessao } from '@/components/SessaoGuard'
import buttons from '@/styles/buttons.module.sass'
import styles from './detalhe.module.sass'

/**
 * Rota estática (sem [id] dinâmico): o site é export estático, e um segmento
 * dinâmico exigiria listar todo run_id possível em build time. O id vem por
 * query string (?id=), lido no cliente — por isso o useSearchParams precisa
 * do Suspense por fora.
 */
export default function DetalheDoJogoPage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <Detalhe />
    </Suspense>
  )
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'pronto'; jogo: DetalheDoJogo }

const ROTULO: Record<DetalheDoJogo['outcome'], string> = {
  vitoria: 'Vitória',
  burnout: 'Burnout',
  demissao: 'Demissão',
  despejo: 'Despejo',
  abandono: 'Largada no meio',
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}

function Detalhe() {
  const params = useSearchParams()
  const idBruto = params.get('id')
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const sessao = useSessao()

  function carregar() {
    const id = Number(idBruto)
    if (!idBruto || !Number.isFinite(id)) {
      setEstado({ tipo: 'nao-encontrado' })
      return
    }
    setEstado({ tipo: 'carregando' })
    buscarDetalheDoJogo(id, sessao.id)
      .then((jogo) => setEstado(jogo ? { tipo: 'pronto', jogo } : { tipo: 'nao-encontrado' }))
      .catch((e: unknown) =>
        setEstado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não deu para falar com o banco.' }),
      )
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [idBruto, sessao.id])

  return (
    <main className="page">
      <div className={styles.top}>
        <Link className={styles.voltar} href="/perfil">
          ← Meu perfil
        </Link>
      </div>
      <h1 className={styles.title}>Replay da partida</h1>

      {estado.tipo === 'carregando' ? <p className={styles.empty}>Carregando…</p> : null}

      {estado.tipo === 'nao-encontrado' ? (
        <p className={styles.empty}>Essa run não existe, ou não é sua.</p>
      ) : null}

      {estado.tipo === 'erro' ? (
        <div className={styles.erro}>
          <span>{estado.mensagem}</span>
          <button type="button" className={buttons.button} onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      ) : null}

      {estado.tipo === 'pronto' ? <Conteudo jogo={estado.jogo} /> : null}
    </main>
  )
}

function Conteudo({ jogo }: { jogo: DetalheDoJogo }) {
  const historico = jogo.details?.history ?? []
  // as cartas como elas eram NAQUELE dia. Sem isto, mudar o custo de uma
  // carta reescreveria todas as partidas já jogadas
  const retrato = jogo.details?.baralho?.cartas

  return (
    <>
      <div className={styles.resumo}>
        <span className={`${styles.selo} ${styles[jogo.outcome]}`}>{ROTULO[jogo.outcome]}</span>
        <span className={styles.resumoTexto}>
          Semana {jogo.week_reached} · dia {jogo.day} · R$ {jogo.money} · {formatarData(jogo.ended_at)}
          {jogo.details?.baralho ? ` · baralho v${jogo.details.baralho.versao}` : ''}
        </span>
      </div>

      {historico.length === 0 ? (
        <p className={styles.empty}>
          Essa run é de antes de o replay existir — só o resumo acima foi guardado.
        </p>
      ) : (
        <ol className={styles.linha}>
          {historico.map((dia) => {
            const evento = dia.eventId ? getEvent(dia.eventId) : null
            const escolha = evento?.choices && dia.eventChoice !== null ? evento.choices[dia.eventChoice] : null
            return (
              <li key={dia.day} className={styles.diaBloco}>
                <div className={styles.diaHead}>
                  <span className={styles.diaNum}>Dia {dia.day}</span>
                  {evento ? <span className={styles.eventoNome}>· {evento.name}</span> : null}
                </div>
                {evento ? <p className={styles.eventoTexto}>{evento.text}</p> : null}
                {escolha ? <span className={styles.escolha}>Escolheu: {escolha.label}</span> : null}

                {dia.cardsPlayed.length === 0 ? (
                  <p className={styles.semCartas}>Nenhuma carta jogada.</p>
                ) : (
                  <div className={styles.cartas}>
                    {dia.cardsPlayed.map((id, i) => (
                      <Card key={`${id}-${i}`} card={cartaParaMostrar(id, retrato)} />
                    ))}
                  </div>
                )}

                <div className={styles.numeros}>
                  <span className={dia.metQuota ? styles.cotaOk : styles.cotaFalhou}>
                    produtividade {dia.productivity}/{dia.quota}
                  </span>
                  <span>estresse {dia.stress}</span>
                  <span>R$ {dia.money}</span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
