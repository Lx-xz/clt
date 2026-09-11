'use client'

import Link from 'next/link'
import styles from './ListaDeJogos.module.sass'
import type { JogoResumo } from '@/data/jogadores'

/**
 * O histórico de partidas de alguém. Ele saiu do menu e virou parte do
 * perfil — o seu e o de qualquer pessoa — porque "as partidas de fulano" é
 * informação de perfil, não uma seção do site. O que aparece aqui já era
 * público: o banco filtra a run largada sem permissão antes de entregar.
 */
const ROTULO: Record<string, string> = {
  vitoria: 'Vitória',
  burnout: 'Burnout',
  demissao: 'Demissão',
  despejo: 'Despejo',
  abandono: 'Largada no meio',
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

export default function ListaDeJogos({
  jogos,
  vazio,
  /** O replay só abre para o dono: `jogo_detalhe()` confere o player_id. */
  comReplay,
}: {
  jogos: JogoResumo[]
  vazio: string
  comReplay: boolean
}) {
  if (jogos.length === 0) return <p className={styles.empty}>{vazio}</p>

  return (
    <div className={styles.lista}>
      {jogos.map((jogo) => {
        const miolo = (
          <>
            <span className={`${styles.selo} ${styles[jogo.outcome]}`}>
              {ROTULO[jogo.outcome] ?? jogo.outcome}
            </span>
            <span className={styles.info}>
              <span className={styles.dia}>
                Semana {jogo.week_reached} · dia {jogo.day}
              </span>
              <span className={styles.data}>{formatarData(jogo.ended_at)}</span>
            </span>
            <span className={styles.espaco} />
            <span className={styles.dinheiro}>R$ {jogo.money}</span>
          </>
        )
        return comReplay ? (
          <Link key={jogo.id} className={styles.jogo} href={`/meus-jogos/detalhe?id=${jogo.id}`}>
            {miolo}
          </Link>
        ) : (
          <div key={jogo.id} className={styles.jogo}>
            {miolo}
          </div>
        )
      })}
    </div>
  )
}
