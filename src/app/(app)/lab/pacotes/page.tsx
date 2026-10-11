'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ENVELOPES } from '@/game/missoes'
import type { TipoEnvelope } from '@/game/types'
import { Chapado } from './Chapados'
import styles from './pacotes.module.sass'

/**
 * A bancada da escada de recompensa: os objetos do jogo (envelope, pacote,
 * maleta e cofre), desenhados pelo MESMO componente da abertura de verdade,
 * abrindo e fechando no toque — é aqui que se mexe no desenho. As versões
 * de antes moram no /lab/museu.
 */
const DEGRAUS: TipoEnvelope[] = ['comum', 'pardo', 'confidencial', 'lendario']

function Degrau({ tipo }: { tipo: TipoEnvelope }) {
  const [aberto, setAberto] = useState(false)
  const env = ENVELOPES[tipo]
  return (
    <figure className={styles.item}>
      <button type="button" className={styles.palco} onClick={() => setAberto((a) => !a)} aria-label={`${aberto ? 'Fechar' : 'Abrir'}: ${env.nome}`}>
        <Chapado tipo={env.forma} aberto={aberto} />
      </button>
      <figcaption>
        <b>{env.nome}</b>
        <span>
          {env.cartas[0]}–{env.cartas[1]} cartas{env.itens?.length ? ' e item' : ''} · {env.origem}
        </span>
      </figcaption>
    </figure>
  )
}

export default function PacotesPage() {
  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={styles.titulo}>Escada de recompensa</h1>
      <p className={styles.intro}>
        Os objetos que as partidas e as missões dão, do jeito que estão no jogo: o tamanho diz o valor. Toque para abrir e
        fechar. Para abrir com cartas, como no jogo, use a bancada de <Link href="/lab/envelopes">recompensas</Link>; as
        versões de antes estão no <Link href="/lab/museu">museu</Link>.
      </p>
      <div className={styles.escada}>
        {DEGRAUS.map((tipo) => (
          <Degrau key={tipo} tipo={tipo} />
        ))}
      </div>
    </main>
  )
}
