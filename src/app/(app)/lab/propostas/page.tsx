'use client'

import { ArrowLeft, PlayingCard } from 'lucide-react'
import Link from 'next/link'
import { MaletaDesenhada } from '@/components/Maleta'
import styles from './propostas.module.sass'

/**
 * Proposta de nomes e desenhos para as recompensas — SÓ para ver, nada aqui
 * muda o jogo. A régua é a do autor: o nome tem que caber em "ganhei um ___
 * nessa partida" e em "já abriu seu ___ do dia?", e o valor tem que se ler no
 * próprio nome. Por isso o envelope CRESCE (envelopinho, envelope, envelopão)
 * e a bagagem vira dinheiro (pasta, maleta, malote).
 *
 * Os desenhos daqui são rascunho em CSS, do mesmo jeito chapado do resto do
 * jogo. Aprovados, eles migram para `Envelope` e `Maleta` e esta página sai.
 */

type Envelope = 'envelopinho' | 'envelope' | 'envelopao'

const ENVELOPES: { id: Envelope; nome: string; origem: string; cartas: number; frase: string }[] = [
  { id: 'envelopinho', nome: 'Envelopinho', origem: 'de toda partida', cartas: 3, frase: 'Peguei mais um envelopinho.' },
  { id: 'envelope', nome: 'Envelope', origem: 'da primeira partida do dia', cartas: 5, frase: 'Já abriu seu envelope do dia?' },
  { id: 'envelopao', nome: 'Envelopão', origem: 'da primeira vitória do dia', cartas: 7, frase: 'Ganhei um envelopão nessa partida!' },
]

type Bagagem = 'pasta' | 'maleta' | 'malote'

const BAGAGENS: { id: Bagagem; nome: string; metal: string; frase: string }[] = [
  { id: 'pasta', nome: 'Pasta', metal: 'fechos de bronze', frase: 'Saiu só uma pasta.' },
  { id: 'maleta', nome: 'Maleta', metal: 'fechos de prata', frase: 'Abri uma maleta agora.' },
  { id: 'malote', nome: 'Malote', metal: 'cadeado de ouro', frase: 'Ganhei um malote!' },
]

function EnvelopeDesenhado({ tipo, largura }: { tipo: Envelope; largura: number }) {
  return (
    <span className={`${styles.env} ${styles[tipo]}`} style={{ '--w': `${largura}px` } as React.CSSProperties} role="img" aria-label={tipo}>
      <span className={styles.costas} />
      <span className={styles.bolso} />
      <span className={styles.aba} />
      {tipo === 'envelopinho' ? <span className={styles.fita} /> : null}
      {tipo === 'envelope' ? (
        <span className={styles.lacre}>
          <PlayingCard />
        </span>
      ) : null}
      {tipo === 'envelopao' ? (
        <>
          {/* o cordão do envelope vai-e-vem: dois botões e a linha dando
              voltas entre eles — é o fechamento que diz "tem coisa aqui" */}
          <svg className={styles.cordao} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d="M50 50 L41 60 L50 70 L59 60 Z M50 70 Q43 79 46 88" />
          </svg>
          <span className={`${styles.botao} ${styles.botaoCima}`} />
          <span className={`${styles.botao} ${styles.botaoBaixo}`} />
          <span className={styles.carimbo}>URGENTE</span>
        </>
      ) : null}
    </span>
  )
}

function BagagemDesenhada({ tipo, largura }: { tipo: Bagagem; largura: number }) {
  if (tipo === 'maleta') return <MaletaDesenhada tipo="prata" largura={largura} />
  const estilo = { '--w': `${largura}px` } as React.CSSProperties
  if (tipo === 'pasta') {
    return (
      <span className={styles.pasta} style={estilo} role="img" aria-label="Pasta">
        <span className={styles.pastaFuro} />
        <span className={styles.elastico} />
        <span className={`${styles.rebite} ${styles.rebiteCima}`} />
        <span className={`${styles.rebite} ${styles.rebiteBaixo}`} />
      </span>
    )
  }
  return (
    <span className={styles.malote} style={estilo} role="img" aria-label="Malote">
      <span className={`${styles.alca} ${styles.alcaE}`} />
      <span className={`${styles.alca} ${styles.alcaD}`} />
      <span className={styles.maloteCorpo}>
        <span className={styles.ziper} />
        <span className={styles.estencil}>VALORES</span>
      </span>
      <span className={styles.cadeado}>
        <span className={styles.arco} />
        <span className={styles.segredo}>
          <i>0</i>
          <i>0</i>
          <i>7</i>
        </span>
      </span>
    </span>
  )
}

export default function PropostasPage() {
  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={styles.titulo}>Proposta: nomes das recompensas</h1>
      <p className={styles.intro}>
        Só para ver, <b>nada aqui muda o jogo</b>. O valor está no próprio nome — o envelope cresce, a
        bagagem vira dinheiro — e cada um passa no teste de caber numa frase falada. Embaixo de cada
        desenho, o mesmo no tamanho da lista de missões.
      </p>

      <h2 className={styles.secao}>Envelopes · dão cartas</h2>
      <div className={styles.grade}>
        {ENVELOPES.map((e) => (
          <figure key={e.id} className={styles.item}>
            <div className={styles.palco}>
              <EnvelopeDesenhado tipo={e.id} largura={e.id === 'envelopinho' ? 74 : e.id === 'envelope' ? 92 : 116} />
            </div>
            <figcaption>
              <b>{e.nome}</b>
              <span>
                {e.cartas} cartas · vem {e.origem}
              </span>
              <q>{e.frase}</q>
            </figcaption>
            <div className={styles.pequeno}>
              <EnvelopeDesenhado tipo={e.id} largura={48} />
              <span>na missão</span>
            </div>
          </figure>
        ))}
      </div>

      <h2 className={styles.secao}>Maletas · dão cosméticos</h2>
      <div className={styles.grade}>
        {BAGAGENS.map((b) => (
          <figure key={b.id} className={styles.item}>
            <div className={styles.palco}>
              <BagagemDesenhada tipo={b.id} largura={b.id === 'pasta' ? 120 : b.id === 'maleta' ? 128 : 136} />
            </div>
            <figcaption>
              <b>{b.nome}</b>
              <span>{b.metal}</span>
              <q>{b.frase}</q>
            </figcaption>
            <div className={styles.pequeno}>
              <BagagemDesenhada tipo={b.id} largura={56} />
              <span>na missão</span>
            </div>
          </figure>
        ))}
      </div>
    </main>
  )
}
