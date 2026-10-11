'use client'

import { ArrowLeft, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { Fragment, useEffect, useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import Card from '@/components/Card'
import { EnvelopeAntigo } from '@/components/Envelope'
import { MaletaDesenhada } from '@/components/Maleta'
import { avatarAleatorio, type Avatar as Receita } from '@/data/avatar'
import { cartasDoJogo } from '@/game/catalogo'
import type { TipoMaleta } from '@/game/cosmeticos'
import type { ActionCard, TipoEnvelope } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './museu.module.sass'

/**
 * O MUSEU: as versões de antes do que o jogo mostra hoje, guardadas para
 * comparar e para não se perder. Nada aqui está no jogo, e nada aqui grava
 * nada. Quando uma peça do jogo for trocada, a de antes vem para cá.
 *
 * O que mora aqui hoje:
 *   - o envelope de CSS (v0.16–v0.22), com o selo na cor da raridade;
 *   - a maleta de couro chapada das maletas de cosmético (v0.22, só lab);
 *   - a escada de recompensa em 3D de CSS, a tentativa antes da chapada;
 *   - e o link para a primeira proposta da escada (/lab/propostas).
 *
 * --- A escada em 3D (o que esta página era antes de virar museu) ---
 *
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
 * O envelope era o do jogo de então, de CSS (ele é fino de verdade); pacote,
 * maleta e cofre são sólidos de CSS (`Cubo`). A escada que foi para o jogo
 * é a chapada, em `components/Recompensa`.
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
const OURO = '#d9ad34'
// os ferrolhos da maleta são de ferro: o ouro fica para o que vem dentro
const FERRO = '#8a9097'
const FERRO_ESCURO = '#5d636a'

function Desenho({ tipo, aberto }: { tipo: Tipo; aberto: boolean }) {
  const a = aberto ? styles.aberto : ''
  // o envelope é fino por natureza: ficava chapado, como no jogo
  if (tipo === 'envelope') return <EnvelopeAntigo tipo="comum" aberto={aberto} largura={84} />
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
            {/* o lado de dentro do papel, que só aparece com a tampa aberta.
                É do MESMO tamanho da caixa: as faces de dentro e as de fora
                ficam no mesmo plano, cada uma visível de um lado só. Menor,
                sobrava uma fresta na boca entre a parede e a dobra da aba */}
            <Cubo w={112} h={64} d={84} cor="#6e5030" interno sem={['topo']} className={styles.recheio} />
            {/* a tampa em duas abas, cada uma com o lado de fora (papel e
                barbante) e o de dentro. O laço é DOIS: cada volta, com a
                metade do nó, vai presa numa aba, e ao abrir ele se divide
                no meio, uma para cada lado */}
            <span className={`${styles.tampa} ${styles.tampaE}`}>
              <span className={`${styles.tampaFora} ${styles.barbanteTampaE}`} />
              <span className={styles.tampaDentro} />
              <span className={`${styles.laco} ${styles.lacoE}`} />
            </span>
            <span className={`${styles.tampa} ${styles.tampaD}`}>
              <span className={`${styles.tampaFora} ${styles.barbanteTampaD}`} />
              <span className={styles.tampaDentro} />
              <span className={`${styles.laco} ${styles.lacoD}`} />
            </span>
          </Cubo>
        </span>
      </span>
    )
  }
  if (tipo === 'maleta') {
    // duas metades de verdade, uma atrás da outra, presas pela borda de
    // baixo. Vista um pouco de cima, a abertura entre elas aparece. Em cima,
    // a alça e os dois ferrolhos de ferro: o bloco mora na metade da frente,
    // a lingueta na de trás, deitada por cima do bloco — ao abrir, ela se
    // levanta, e só então as metades se afastam
    const ferrolho = (x: number) => ({ position: 'absolute', left: x, top: -5, transform: 'translateZ(-4.5px)' }) as React.CSSProperties
    const lingueta = (x: number) => ({ position: 'absolute', left: x, top: -7 }) as React.CSSProperties
    return (
      <span className={`${styles.cena} ${a}`}>
        <span className={styles.mundo}>
          <span className={styles.maleta3d}>
            <span className={styles.metadeTras}>
              <Cubo w={140} h={92} d={17} cor={COURO} classes={{ frente: styles.forro }} faces={{ tras: <span className={styles.costura} /> }} />
              <span className={styles.alca3d}>
                <Cubo w={7} h={17} d={8} cor={COURO_ESCURO} style={{ position: 'absolute', left: 0, bottom: 0 }} />
                <Cubo w={7} h={17} d={8} cor={COURO_ESCURO} style={{ position: 'absolute', right: 0, bottom: 0 }} />
                <Cubo w={52} h={7} d={8} cor={COURO_ESCURO} style={{ position: 'absolute', left: 0, top: 0 }} />
              </span>
              {[22, 102].map((x) => (
                <Fragment key={x}>
                  <Cubo w={16} h={5} d={4} cor={FERRO_ESCURO} style={{ position: 'absolute', left: x, top: -5, transform: 'translateZ(4.5px)' }} />
                  <Cubo w={14} h={2} d={12} cor={FERRO} className={styles.lingueta} style={lingueta(x + 1)} />
                </Fragment>
              ))}
            </span>
            <span className={styles.metadeFrente}>
              <Cubo w={140} h={92} d={17} cor={COURO} classes={{ tras: styles.forro }} faces={{ frente: <span className={styles.costura} /> }} />
              {[21, 101].map((x) => (
                <Cubo key={x} w={18} h={5} d={8} cor={FERRO} style={ferrolho(x)} faces={{ frente: <span className={styles.fechadura} /> }} />
              ))}
            </span>
          </span>
        </span>
      </span>
    )
  }
  // o cofre é montado em PAREDES grossas, como a porta: aberto, a borda do
  // aço aparece na boca dele. A face de cada parede que olha para dentro
  // ganha a cor do interior, com a luz de quem olha pela porta
  const W = 96
  const H = 104
  const D = 84
  const T = 8
  const parede = (x: number, y: number, z: number): React.CSSProperties => ({ position: 'absolute', left: x, top: y, transform: `translateZ(${z}px)` })
  return (
    <span className={`${styles.cena} ${a}`}>
      <span className={styles.mundo}>
        <span className={styles.cofre3d} style={{ width: W, height: H }}>
          <Cubo w={W} h={H} d={T} cor={ACO} classes={{ frente: styles.dentroFundo }} style={parede(0, 0, -D / 2 + T / 2)} />
          <Cubo w={T} h={H} d={D - T} cor={ACO} classes={{ dir: styles.dentroLado }} style={parede(0, 0, T / 2)} />
          <Cubo w={T} h={H} d={D - T} cor={ACO} classes={{ esq: styles.dentroLado }} style={parede(W - T, 0, T / 2)} />
          <Cubo w={W - 2 * T} h={T} d={D - T} cor={ACO} classes={{ base: styles.dentroTeto }} style={parede(T, 0, T / 2)} />
          <Cubo w={W - 2 * T} h={T} d={D - T} cor={ACO} classes={{ topo: styles.dentroChao }} style={parede(T, H - T, T / 2)} />
          {/* a prateleira, as barras de ouro em cima dela e os maços de
              dinheiro no chão: o cofre mostra o que guarda */}
          <Cubo w={W - 2 * T} h={4} d={D - T - 8} cor="#4a4f56" style={parede(T, 50, T / 2 - 4)} />
          {[
            [24, 43],
            [48, 43],
            [36, 36],
          ].map(([x, y], i) => (
            <Cubo key={`o${i}`} w={20} h={7} d={11} cor={OURO} style={parede(x, y, -12)} />
          ))}
          {[
            [18, H - T - 8],
            [46, H - T - 8],
            [18, H - T - 16],
          ].map(([x, y], i) => (
            <Cubo key={`d${i}`} w={24} h={8} d={14} cor="#5c8a4a" classes={{ frente: styles.cinta, topo: styles.cintaTopo }} style={parede(x, y, -8)} />
          ))}
          {/* a porta: uma chapa grossa presa pela borda esquerda. A frente tem
              o segredo; o lado de DENTRO, as trancas */}
          <span className={styles.porta3d} style={{ '--d': `${D}px` } as React.CSSProperties}>
            <Cubo
              w={W}
              h={H}
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
          {[
            [6, 30],
            [W - 22, 30],
            [6, -30],
            [W - 22, -30],
          ].map(([x, z], i) => (
            <Cubo key={`p${i}`} w={16} h={9} d={14} cor="#2f3338" style={parede(x, H, z)} />
          ))}
        </span>
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

const ENVELOPES_ANTIGOS: TipoEnvelope[] = ['comum', 'pardo', 'confidencial', 'epico', 'lendario']
const MALETAS_ANTIGAS: TipoMaleta[] = ['bronze', 'prata', 'ouro']

/** Uma peça do museu que abre e fecha no toque. */
function Vitrine({ nome, children }: { nome: string; children: (aberto: boolean) => React.ReactNode }) {
  const [aberto, setAberto] = useState(false)
  return (
    <figure className={styles.item}>
      <button type="button" className={styles.palco} onClick={() => setAberto((a) => !a)} aria-label={`${aberto ? 'Fechar' : 'Abrir'}: ${nome}`}>
        <span className={styles.objeto}>{children(aberto)}</span>
      </button>
      <figcaption>
        <b>{nome}</b>
        <small>{aberto ? 'Toque de novo para fechar' : 'Toque para abrir'}</small>
      </figcaption>
    </figure>
  )
}

export default function MuseuPage() {
  // o manequim não veste nada: o cosmético de mentira vai num avatar sorteado
  const [modelo] = useState<Receita>(() => ({ ...avatarAleatorio(), acessorio: 'nenhum' }))
  const [chave, setChave] = useState(0)
  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={styles.titulo}>Museu</h1>
      <p className={styles.intro}>
        As versões de antes do que está no jogo, guardadas para comparar. Nada aqui está no jogo, e nada aqui grava
        nada — toque nas peças para ver como elas abriam.
      </p>

      <h2 className={styles.subtitulo}>Envelopes de CSS · v0.16 a v0.22</h2>
      <p className={styles.intro}>
        Os cinco eram o mesmo envelope em pé, e só o selo de cera mudava: a cor da raridade que dava nome a cada um. Na
        v0.23 viraram envelope, pacote, maleta e cofre.
      </p>
      <div className={styles.escada}>
        {ENVELOPES_ANTIGOS.map((tipo) => (
          <Vitrine key={tipo} nome={`Envelope ${tipo === 'comum' ? 'comum' : tipo === 'pardo' ? 'incomum' : tipo === 'confidencial' ? 'raro' : tipo === 'epico' ? 'épico' : 'lendário'}`}>
            {(aberto) => <EnvelopeAntigo tipo={tipo} aberto={aberto} largura={96} />}
          </Vitrine>
        ))}
      </div>

      <h2 className={styles.subtitulo}>Maletas de couro · v0.22 (só no lab)</h2>
      <p className={styles.intro}>
        A primeira maleta, a das peças de avatar: couro liso, só os fechos de metal, abrindo pelo meio. Ela continua
        sendo a do <Link href="/lab/maletas">/lab/maletas</Link>.
      </p>
      <div className={styles.escada}>
        {MALETAS_ANTIGAS.map((tipo) => (
          <Vitrine key={tipo} nome={`Maleta de ${tipo}`}>
            {(aberto) => <MaletaDesenhada tipo={tipo} aberta={aberto} largura={120} />}
          </Vitrine>
        ))}
      </div>

      <h2 className={styles.subtitulo}>A escada em 3D de CSS</h2>
      <p className={styles.intro}>
        A tentativa antes da chapada: pacote, maleta e cofre como sólidos de verdade, girando devagar. Ficou bonita e
        pesada; a chapada lia melhor pequena. O que sai é de mentira.
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
        E a primeira proposta da escada (envelopinho, envelopão, pasta e malote) está em{' '}
        <Link href="/lab/propostas">/lab/propostas</Link>. As trancas que a maleta chapada experimentou (com volume,
        placa larga e tira fina) ficaram no histórico do repositório, nos commits de 11/10/2026.
      </p>
    </main>
  )
}
