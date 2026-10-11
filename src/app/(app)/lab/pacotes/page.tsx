'use client'

import { ArrowLeft, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import Card from '@/components/Card'
import { EnvelopeEmPe } from '@/components/Envelope'
import { avatarAleatorio, type Avatar as Receita } from '@/data/avatar'
import { cartasDoJogo } from '@/game/catalogo'
import type { ActionCard } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './pacotes.module.sass'

/**
 * A escada única de recompensa, em rascunho: envelope, pacote, maleta e
 * cofre. (A caixa saiu: em 3D ela e o pacote ficaram parecidos demais.)
 * Junta o que eram duas linhas (envelopes de carta e maletas de
 * cosmético) numa só, em que o TAMANHO do objeto diz o que ele vale — e o
 * cosmético entra a partir do pacote, num lugar próprio, além das cartas, em
 * vez de disputar a sorte com uma lendária.
 *
 * Só para ver e mexer: cada um abre com a sua animação ao toque, e o que sai
 * é de mentira (uma carta qualquer do catálogo, e o óculos de sol num avatar
 * sorteado). Nada vai para a coleção de ninguém.
 *
 * O envelope é o do jogo, chapado (ele é fino de verdade); pacote, maleta e
 * cofre são sólidos de CSS (`Cubo`) e migram para `src/components` se a
 * escada for aprovada.
 */

type Tipo = 'envelope' | 'pacote' | 'maleta' | 'cofre'

const PACOTES: { tipo: Tipo; nome: string; vem: string; dentro: string; cosmetico: boolean; abrir: number }[] = [
  { tipo: 'envelope', nome: 'Envelope', vem: 'de toda partida', dentro: '3 cartas', cosmetico: false, abrir: 900 },
  { tipo: 'pacote', nome: 'Pacote', vem: 'da primeira partida do dia', dentro: '5 cartas e chance de cosmético', cosmetico: false, abrir: 1100 },
  { tipo: 'maleta', nome: 'Maleta', vem: 'da primeira vitória do dia', dentro: '7 cartas e 1 cosmético', cosmetico: true, abrir: 1150 },
  { tipo: 'cofre', nome: 'Cofre', vem: 'do raro de verdade', dentro: '15 cartas e 1 cosmético raro', cosmetico: true, abrir: 1800 },
]

type Fase = 'fechado' | 'abrindo' | 'aberto'

type Face = 'frente' | 'tras' | 'dir' | 'esq' | 'topo' | 'base'
const FACES: Face[] = ['frente', 'tras', 'dir', 'esq', 'topo', 'base']

/**
 * Um sólido de CSS: seis faces num `preserve-3d`, cada uma empurrada para o
 * seu lado. `cor` pinta todas, e o sass escurece os lados e clareia o topo —
 * é a luz vindo de cima que dá o volume. Cada face só aparece pelo lado de
 * FORA (`backface-visibility`): sem isso, olhando por dentro de uma caixa
 * aberta, o teto aparecia claro como o lado de fora.
 *
 * `interno` vira as faces para DENTRO: é o forro de um objeto aberto, que só
 * se vê por dentro, com as cores próprias do interior. `sem` tira faces (a
 * boca da caixa), `faces` e `classes` enfeitam uma face.
 */
function Cubo({ w, h, d, cor, className, style, interno, faces = {}, classes = {}, sem = [], children }: {
  w: number
  h: number
  d: number
  cor: string
  className?: string
  style?: React.CSSProperties
  interno?: boolean
  faces?: Partial<Record<Face, React.ReactNode>>
  classes?: Partial<Record<Face, string>>
  sem?: Face[]
  children?: React.ReactNode
}) {
  return (
    <span
      className={`${styles.cubo} ${interno ? styles.interno : ''} ${className ?? ''}`}
      style={{ '--w': `${w}px`, '--h': `${h}px`, '--d': `${d}px`, '--cor': cor, ...style } as React.CSSProperties}
    >
      {FACES.filter((f) => !sem.includes(f)).map((f) => (
        <span key={f} className={`${styles.face} ${styles[`f_${f}`]} ${classes[f] ?? ''}`}>
          {faces[f]}
        </span>
      ))}
      {children}
    </span>
  )
}

const KRAFT = '#b78c55'
const COURO = '#8a5a3b'
const COURO_ESCURO = '#5f3a24'
const ACO = '#5a6068'

function Desenho({ tipo, aberto }: { tipo: Tipo; aberto: boolean }) {
  const a = aberto ? styles.aberto : ''
  // o envelope é fino por natureza: fica chapado, como no jogo
  if (tipo === 'envelope') return <EnvelopeEmPe tipo="comum" aberto={aberto} largura={84} />
  if (tipo === 'pacote') {
    return (
      <span className={`${styles.cena} ${a}`}>
        <span className={styles.mundo}>
          <Cubo
            w={112}
            h={64}
            d={84}
            cor={KRAFT}
            sem={['topo']}
            classes={{ frente: styles.barbante, tras: styles.barbante, dir: styles.barbante, esq: styles.barbante }}
            faces={{ frente: <span className={styles.etiqueta} /> }}
          >
            {/* o lado de dentro do papel, que só aparece com a tampa aberta */}
            <span className={styles.recheio}>
              <Cubo w={108} h={60} d={80} cor="#6e5030" interno sem={['topo']} />
            </span>
            {/* a tampa em duas abas, cada uma com o lado de fora (papel e
                barbante) e o de dentro; o laço vai preso na da esquerda */}
            <span className={`${styles.tampa} ${styles.tampaE}`}>
              <span className={`${styles.tampaFora} ${styles.barbanteTampaE}`} />
              <span className={styles.tampaDentro} />
              <span className={styles.laco} />
            </span>
            <span className={`${styles.tampa} ${styles.tampaD}`}>
              <span className={`${styles.tampaFora} ${styles.barbanteTampaD}`} />
              <span className={styles.tampaDentro} />
            </span>
          </Cubo>
        </span>
      </span>
    )
  }
  if (tipo === 'maleta') {
    // duas metades de verdade, uma atrás da outra, presas pela borda de
    // baixo. Vista um pouco de cima, a abertura entre elas aparece
    return (
      <span className={`${styles.cena} ${a}`}>
        <span className={styles.mundo}>
          <span className={styles.maleta3d}>
            <span className={styles.metadeTras}>
              <Cubo w={140} h={92} d={17} cor={COURO} classes={{ frente: styles.forro }} />
              {/* a alça, de couro e com volume: dois pés e a barra */}
              <span className={styles.alca3d}>
                <Cubo w={7} h={17} d={8} cor={COURO_ESCURO} style={{ position: 'absolute', left: 0, bottom: 0 }} />
                <Cubo w={7} h={17} d={8} cor={COURO_ESCURO} style={{ position: 'absolute', right: 0, bottom: 0 }} />
                <Cubo w={52} h={7} d={8} cor={COURO_ESCURO} style={{ position: 'absolute', left: 0, top: 0 }} />
              </span>
            </span>
            <span className={styles.metadeFrente}>
              <Cubo
                w={140}
                h={92}
                d={17}
                cor={COURO}
                classes={{ tras: styles.forro, frente: styles.couroFrente }}
                faces={{
                  frente: (
                    <>
                      <span className={`${styles.encaixe3d} ${styles.esq3d}`} />
                      <span className={`${styles.encaixe3d} ${styles.dir3d}`} />
                    </>
                  ),
                }}
              />
            </span>
            {/* a presilha: a parte que corre por CIMA da maleta e a que desce
                pela frente até o encaixe. Solta, a de frente deita em cima */}
            {(['esq3d', 'dir3d'] as const).map((lado) => (
              <span key={lado}>
                <span className={`${styles.presilhaTopo} ${styles[lado]}`} />
                <span className={`${styles.presilhaFrente} ${styles[lado]}`} />
              </span>
            ))}
          </span>
        </span>
      </span>
    )
  }
  return (
    <span className={`${styles.cena} ${a}`}>
      <span className={styles.mundo}>
        <Cubo w={96} h={104} d={84} cor={ACO} sem={['frente']}>
          {/* o miolo: paredes de dentro, uma prateleira, barras de ouro em
              cima dela e maços de dinheiro no chão — o cofre mostra o que
              guarda, em vez de uma luz no vazio */}
          <span className={styles.miolo3d}>
            <Cubo w={88} h={96} d={76} cor="#2d3136" interno sem={['frente']} />
          </span>
          <Cubo w={86} h={4} d={70} cor="#4a4f56" style={{ position: 'absolute', left: 5, top: 50, transform: 'translateZ(-3px)' }} />
          {[
            [24, 43, -12],
            [50, 43, -12],
            [37, 36, -12],
          ].map(([x, y, z], i) => (
            <Cubo key={`o${i}`} w={20} h={7} d={11} cor="#d9ad34" style={{ position: 'absolute', left: x, top: y, transform: `translateZ(${z}px)` }} />
          ))}
          {[
            [16, 91, -8],
            [46, 91, -8],
            [16, 83, -8],
          ].map(([x, y, z], i) => (
            <Cubo
              key={`d${i}`}
              w={24}
              h={8}
              d={14}
              cor="#5c8a4a"
              classes={{ frente: styles.cinta, topo: styles.cintaTopo }}
              style={{ position: 'absolute', left: x, top: y, transform: `translateZ(${z}px)` }}
            />
          ))}
          {/* a porta: uma chapa com espessura, presa pela borda esquerda. A
              frente tem o segredo; o lado de DENTRO, as trancas */}
          <span className={styles.porta3d}>
            <Cubo
              w={96}
              h={104}
              d={7}
              cor="#6a7079"
              classes={{ tras: styles.portaDentro }}
              faces={{
                frente: (
                  <>
                    <span className={styles.disco}>
                      <span className={styles.marcas} />
                    </span>
                    <span className={styles.manivela} />
                  </>
                ),
                tras: (
                  <>
                    <span className={styles.trancas} />
                    <span className={styles.chapaDentro} />
                  </>
                ),
              }}
            />
          </span>
          {/* os pés, com volume, nos quatro cantos de baixo */}
          {[
            [6, 30],
            [74, 30],
            [6, -30],
            [74, -30],
          ].map(([x, z], i) => (
            <Cubo key={`p${i}`} w={16} h={9} d={14} cor="#2f3338" style={{ position: 'absolute', left: x, top: 104, transform: `translateZ(${z}px)` }} />
          ))}
        </Cubo>
      </span>
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
        Envelope, pacote, maleta e cofre: uma linha só, em que o tamanho diz o valor. O envelope dá só
        cartas; do pacote para cima vem também um cosmético, num lugar próprio. <b>Rascunho</b> — toque
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
