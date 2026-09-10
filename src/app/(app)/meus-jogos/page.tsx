'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { buscarMeusJogos, type LinhaMeuJogo } from '@/data/analytics'
import { useSessao } from '@/components/SessaoGuard'
import buttons from '@/styles/buttons.module.sass'
import styles from './meus-jogos.module.sass'

type Estado = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; jogos: LinhaMeuJogo[] }

const ROTULO: Record<LinhaMeuJogo['outcome'], string> = {
  vitoria: 'Vitória',
  burnout: 'Burnout',
  demissao: 'Demissão',
  despejo: 'Despejo',
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

export default function MeusJogosPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const sessao = useSessao()

  function carregar() {
    setEstado({ tipo: 'carregando' })
    buscarMeusJogos(sessao.id)
      .then((jogos) => setEstado({ tipo: 'pronto', jogos }))
      .catch((e: unknown) =>
        setEstado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não deu para falar com o banco.' }),
      )
  }

  useEffect(carregar, [sessao.id])

  return (
    <main className="page">
      <div className={styles.top}>
        <h1 className={styles.title}>Meus jogos</h1>
      </div>
      <p className={styles.hint}>Toda run que {sessao.nick} já terminou. Clique numa para reabrir dia a dia.</p>

      {estado.tipo === 'carregando' ? <p className={styles.empty}>Carregando…</p> : null}

      {estado.tipo === 'erro' ? (
        <div className={styles.erro}>
          <span>{estado.mensagem}</span>
          <button type="button" className={buttons.button} onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      ) : null}

      {estado.tipo === 'pronto' && estado.jogos.length === 0 ? (
        <p className={styles.empty}>Nenhuma run terminada ainda — jogue até o fim para aparecer aqui.</p>
      ) : null}

      {estado.tipo === 'pronto' && estado.jogos.length > 0 ? (
        <div className={styles.lista}>
          {estado.jogos.map((jogo) => (
            <Link key={jogo.id} className={styles.jogo} href={`/meus-jogos/detalhe?id=${jogo.id}`}>
              <span className={`${styles.selo} ${styles[jogo.outcome]}`}>{ROTULO[jogo.outcome]}</span>
              <span className={styles.info}>
                <span className={styles.dia}>
                  Semana {jogo.week_reached} · dia {jogo.day}
                </span>
                <span className={styles.data}>{formatarData(jogo.ended_at)}</span>
              </span>
              <span className={styles.espaco} />
              <span className={styles.dinheiro}>R$ {jogo.money}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </main>
  )
}
