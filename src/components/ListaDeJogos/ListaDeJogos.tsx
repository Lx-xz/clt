'use client'

import Link from 'next/link'
import styles from './ListaDeJogos.module.sass'
import type { JogoResumo } from '@/data/jogadores'
import Dinheiro from '../Dinheiro'

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
  abandono: 'Pediu demissão',
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

// Todo jogo abre o replay, o seu e o de qualquer pessoa: desde a v0.14 a
// partida guardada de outra pessoa abre por `jogo_publico()`, que devolve o
// dia-a-dia e nada do dono além de nick e avatar.
export default function ListaDeJogos({
  jogos,
  vazio,
}: {
  jogos: JogoResumo[]
  vazio: string
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
            <Dinheiro className={styles.dinheiro} valor={jogo.money} />
          </>
        )
        return (
          <Link key={jogo.id} className={styles.jogo} href={`/meus-jogos/detalhe?id=${jogo.id}`}>
            {miolo}
          </Link>
        )
      })}
    </div>
  )
}
