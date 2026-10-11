'use client'

import { ArrowLeft, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import Card from '@/components/Card'
import { EnvelopeEmPe } from '@/components/Envelope'
import { MaletaDesenhada } from '@/components/Maleta'
import { avatarAleatorio, type Avatar as Receita } from '@/data/avatar'
import { cartasDoJogo } from '@/game/catalogo'
import type { ActionCard } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './pacotes.module.sass'

/**
 * A escada única de recompensa, em rascunho: envelope, pacote, caixa, maleta
 * e cofre. Junta o que eram duas linhas (envelopes de carta e maletas de
 * cosmético) numa só, em que o TAMANHO do objeto diz o que ele vale — e o
 * cosmético entra a partir da caixa, num lugar próprio, além das cartas, em
 * vez de disputar a sorte com uma lendária.
 *
 * Só para ver e mexer: cada um abre com a sua animação ao toque, e o que sai
 * é de mentira (uma carta qualquer do catálogo, e o óculos de sol num avatar
 * sorteado). Nada vai para a coleção de ninguém.
 *
 * Todos chapados, como o resto. Envelope e maleta são os do jogo; pacote,
 * caixa e cofre nascem aqui e migram para `src/components` se a escada for
 * aprovada.
 */

type Tipo = 'envelope' | 'pacote' | 'caixa' | 'maleta' | 'cofre'

const PACOTES: { tipo: Tipo; nome: string; vem: string; dentro: string; cosmetico: boolean; abrir: number }[] = [
  { tipo: 'envelope', nome: 'Envelope', vem: 'de toda partida', dentro: '3 cartas', cosmetico: false, abrir: 900 },
  { tipo: 'pacote', nome: 'Pacote', vem: 'da primeira partida do dia', dentro: '5 cartas', cosmetico: false, abrir: 1100 },
  { tipo: 'caixa', nome: 'Caixa', vem: 'da primeira vitória do dia', dentro: '7 cartas e chance de cosmético', cosmetico: true, abrir: 1200 },
  { tipo: 'maleta', nome: 'Maleta', vem: 'de conquista ou sequência de dias', dentro: '10 cartas e 1 cosmético', cosmetico: true, abrir: 1100 },
  { tipo: 'cofre', nome: 'Cofre', vem: 'do raro de verdade', dentro: '15 cartas e 1 cosmético raro', cosmetico: true, abrir: 1700 },
]

type Fase = 'fechado' | 'abrindo' | 'aberto'

function Desenho({ tipo, aberto }: { tipo: Tipo; aberto: boolean }) {
  if (tipo === 'envelope') return <EnvelopeEmPe tipo="comum" aberto={aberto} largura={80} />
  if (tipo === 'maleta') return <MaletaDesenhada tipo="ouro" aberta={aberto} largura={140} />
  const classe = `${styles[tipo]} ${aberto ? styles.aberto : ''}`
  if (tipo === 'pacote') {
    return (
      <span className={classe} role="img" aria-label="Pacote">
        <span className={styles.miolo} />
        <span className={`${styles.papel} ${styles.papelE}`} />
        <span className={`${styles.papel} ${styles.papelD}`} />
        <span className={styles.barbanteV} />
        <span className={styles.barbanteH} />
        <span className={styles.laco} />
        <span className={styles.etiqueta} />
      </span>
    )
  }
  if (tipo === 'caixa') {
    return (
      <span className={classe} role="img" aria-label="Caixa">
        <span className={styles.dentroCaixa} />
        <span className={`${styles.aba} ${styles.abaE}`} />
        <span className={`${styles.aba} ${styles.abaD}`} />
        <span className={`${styles.fita} ${styles.fitaE}`} />
        <span className={`${styles.fita} ${styles.fitaD}`} />
        <span className={styles.frente}>
          <span className={styles.seta}>↑↑</span>
        </span>
      </span>
    )
  }
  return (
    <span className={classe} role="img" aria-label="Cofre">
      <span className={styles.corpoCofre}>
        <span className={styles.interior} />
        <span className={styles.porta}>
          <span className={styles.disco}>
            <span className={styles.marcas} />
          </span>
          <span className={styles.manivela} />
        </span>
      </span>
      <span className={`${styles.pe} ${styles.peE}`} />
      <span className={`${styles.pe} ${styles.peD}`} />
    </span>
  )
}

function Bancada({ p, modelo }: { p: (typeof PACOTES)[number]; modelo: Receita }) {
  const [fase, setFase] = useState<Fase>('fechado')
  const [carta, setCarta] = useState<ActionCard | null>(null)
  const [virada, setVirada] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function abrir() {
    if (fase !== 'fechado') return
    const todas = cartasDoJogo()
    setCarta(todas[Math.floor(Math.random() * todas.length)])
    setVirada(false)
    setFase('abrindo')
    timers.current.push(
      window.setTimeout(() => setFase('aberto'), p.abrir),
      window.setTimeout(() => setVirada(true), p.abrir + 800),
    )
  }

  function fechar() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setFase('fechado')
    setVirada(false)
  }

  return (
    <figure className={styles.item}>
      <button
        type="button"
        className={styles.palco}
        onClick={fase === 'fechado' ? abrir : fechar}
        aria-label={fase === 'fechado' ? `Abrir: ${p.nome}` : 'Fechar de novo'}
      >
        {fase === 'aberto' && carta ? (
          <span className={styles.saindo}>
            <span className={`${styles.cartaSaindo} ${p.cosmetico ? styles.comCosmetico : ''}`}>
              <Card card={carta} faceDown={!virada} className={styles.carta} />
            </span>
            {p.cosmetico ? (
              <span className={`${styles.cosmetico} ${virada ? styles.cosmeticoVisivel : ''}`}>
                <Avatar avatar={{ ...modelo, oculos: 'sol' }} tamanho={64} />
              </span>
            ) : null}
          </span>
        ) : null}
        <span className={`${styles.objeto} ${fase === 'abrindo' ? styles.sacode : ''}`}>
          <Desenho tipo={p.tipo} aberto={fase !== 'fechado'} />
        </span>
      </button>
      <figcaption>
        <b>{p.nome}</b>
        <span>
          {p.dentro} · vem {p.vem}
        </span>
        <small>{fase === 'fechado' ? 'Toque para abrir' : 'Toque de novo para fechar'}</small>
      </figcaption>
    </figure>
  )
}

export default function PacotesPage() {
  // o manequim não veste nada: o cosmético de mentira vai num avatar sorteado
  const [modelo] = useState<Receita>(() => ({ ...avatarAleatorio(), acessorio: 'nenhum' }))
  const [chave, setChave] = useState(0)
  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={styles.titulo}>Escada de recompensa</h1>
      <p className={styles.intro}>
        Envelope, pacote, caixa, maleta e cofre: uma linha só, em que o tamanho diz o valor. Os dois primeiros
        dão só cartas; da caixa para cima vem também um cosmético, num lugar próprio. <b>Rascunho</b> — toque
        em cada um para ver ele abrir; o que sai é de mentira e nada vai para a sua coleção.
      </p>
      <button type="button" className={`${buttons.button} ${styles.recomecar}`} onClick={() => setChave((c) => c + 1)}>
        <RotateCcw size={15} aria-hidden /> Fechar todos
      </button>
      <div className={styles.escada} key={chave}>
        {PACOTES.map((p) => (
          <Bancada key={p.tipo} p={p} modelo={modelo} />
        ))}
      </div>
      <p className={styles.nota}>
        A proposta anterior (envelopinho, envelopão, pasta e malote) continua guardada em{' '}
        <Link href="/lab/propostas">/lab/propostas</Link>.
      </p>
    </main>
  )
}
