'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { ReciboResumido, dadosDaLinha } from '@/components/Recibo'
import Segmentado from '@/components/Segmentado'
import { useSessao } from '@/components/SessaoGuard'
import { buscarMeusJogos } from '@/data/analytics'
import { jogosDoJogador, type JogoResumo } from '@/data/jogadores'
import styles from './jogos.module.sass'

/**
 * Todas as partidas de alguém, como RECIBOS — a sua (sem `?nick=`) ou a de
 * outra pessoa (`?nick=fulano`). Era um popup com uma lista de linhas; virou
 * página porque é para percorrer, filtrar e comparar, e um popup é para
 * olhar e fechar.
 *
 * O nick vem por query string, e não por rota, pelo mesmo motivo de
 * `/jogador`: o site é export estático. Por isso o `<Suspense>` em volta.
 */
export default function JogosPage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <Jogos />
    </Suspense>
  )
}

type Filtro = 'todas' | 'vitorias' | 'derrotas' | 'abandono'
type Ordem = 'recentes' | 'antigas' | 'dinheiro' | 'dias'

const ORDENS: { valor: Ordem; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigas', rotulo: 'Mais antigas' },
  { valor: 'dinheiro', rotulo: 'Mais dinheiro' },
  { valor: 'dias', rotulo: 'Mais dias' },
]

function passa(j: JogoResumo, filtro: Filtro): boolean {
  if (filtro === 'vitorias') return j.outcome === 'vitoria'
  if (filtro === 'derrotas') return j.outcome !== 'vitoria' && j.outcome !== 'abandono'
  if (filtro === 'abandono') return j.outcome === 'abandono'
  return true
}

function Jogos() {
  const sessao = useSessao()
  const nickPedido = useSearchParams().get('nick')
  // o seu próprio nick pela query cai na sua lista: é a única que tem as
  // partidas de que você pediu demissão
  const alheio = nickPedido && nickPedido.toLowerCase() !== sessao.nick?.toLowerCase() ? nickPedido : null
  const [jogos, setJogos] = useState<JogoResumo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [ordem, setOrdem] = useState<Ordem>('recentes')

  useEffect(() => {
    setJogos(null)
    const pedido = alheio ? jogosDoJogador(alheio) : (buscarMeusJogos(sessao.id) as Promise<JogoResumo[]>)
    pedido.then(setJogos).catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Não deu para carregar.'))
  }, [alheio, sessao.id])

  const lista = useMemo(() => {
    const filtrada = (jogos ?? []).filter((j) => passa(j, filtro))
    const por: Record<Ordem, (a: JogoResumo, b: JogoResumo) => number> = {
      recentes: (a, b) => b.ended_at.localeCompare(a.ended_at),
      antigas: (a, b) => a.ended_at.localeCompare(b.ended_at),
      dinheiro: (a, b) => b.money - a.money,
      dias: (a, b) => b.day - a.day || b.money - a.money,
    }
    return filtrada.sort(por[ordem])
  }, [jogos, filtro, ordem])

  const filtros: { valor: Filtro; rotulo: string }[] = [
    { valor: 'todas', rotulo: 'Todas' },
    { valor: 'vitorias', rotulo: 'Vitórias' },
    { valor: 'derrotas', rotulo: 'Derrotas' },
    // a partida largada no meio só aparece na sua lista
    ...(alheio ? [] : [{ valor: 'abandono' as const, rotulo: 'Pediu demissão' }]),
  ]

  return (
    <main className="page">
      <Link className={styles.voltar} href={alheio ? `/jogador?nick=${encodeURIComponent(alheio)}` : '/perfil'}>
        ← {alheio ? `Perfil de ${alheio}` : 'Meu perfil'}
      </Link>
      <h1 className={styles.titulo}>{alheio ? `As partidas de ${alheio}` : 'Minhas partidas'}</h1>

      <div className={styles.controles}>
        <Segmentado rotulo="Mostrar" valor={filtro} onChange={setFiltro} opcoes={filtros} />
        <label className={styles.ordem}>
          <span>Ordem</span>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
            {ORDENS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro ? <p className={styles.vazio}>{erro}</p> : null}
      {!erro && jogos === null ? <p className={styles.vazio}>Carregando…</p> : null}
      {jogos !== null && lista.length === 0 ? (
        <p className={styles.vazio}>
          {jogos.length === 0 ? 'Nenhuma partida terminada ainda.' : 'Nenhuma partida com esse filtro.'}
        </p>
      ) : null}

      <div className={styles.grade}>
        {lista.map((j) => (
          <ReciboResumido key={j.id} id={j.id} dados={dadosDaLinha(j)} />
        ))}
      </div>
    </main>
  )
}
