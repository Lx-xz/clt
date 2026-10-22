'use client'

import { ArrowLeft, Crown, Dices, Smile } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Card from '@/components/Card'
import { TextoComIcones } from '@/components/Dinheiro'
import Segmentado from '@/components/Segmentado'
import type { ActionCard } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './sorte.module.sass'

/**
 * Protótipos da carta de SORTE (pedido do autor): relataram que "50%: isto.
 * 50%: aquilo." é difícil de ler. Nada aqui está no jogo — é para comparar
 * as ideias lado a lado e escolher. As cartas são o componente de verdade,
 * com o corpo trocado (`corpo`, `seloExtra` no `Card`).
 */

interface Sorte {
  carta: ActionCard
  chance: number
  bom: string
  ruim: string
}

const SORTES: Sorte[] = [
  {
    carta: {
      id: 'proto-pedir-aumento', name: 'Pedir Aumento', cost: 3, kind: 'social', raridade: 'lendaria', starter: false, efeitos: [],
      text: '50%: salário +R$ 100 pelo resto da run. 50%: +3 estresse.',
    },
    chance: 50,
    bom: 'Salário +R$ 100 pelo resto da run',
    ruim: '+3 estresse',
  },
  {
    carta: {
      id: 'proto-pix-errado', name: 'Pix Errado', cost: 0, kind: 'grana', raridade: 'rara', starter: false, efeitos: [],
      text: '30%: +R$ 90. 70%: −R$ 30 e +1 estresse.',
    },
    chance: 30,
    bom: '+R$ 90',
    ruim: '−R$ 30 e +1 estresse',
  },
]

// ------------------------------------------------------------ na carta

/** 1 · Barra dividida: duas metades, e a altura de cada uma é a chance. */
function CorpoBarra({ s }: { s: Sorte }) {
  return (
    <div className={styles.barra}>
      <div className={`${styles.lado} ${styles.bom}`} style={{ flexGrow: Math.max(s.chance, 30) }}>
        <span className={styles.pct}>{s.chance}%</span>
        <span className={styles.efeito}><TextoComIcones texto={s.bom} /></span>
      </div>
      <div className={`${styles.lado} ${styles.ruim}`} style={{ flexGrow: Math.max(100 - s.chance, 30) }}>
        <span className={styles.pct}>{100 - s.chance}%</span>
        <span className={styles.efeito}><TextoComIcones texto={s.ruim} /></span>
      </div>
    </div>
  )
}

/** 2 · Cara ou coroa: só serve para 50/50. */
function CorpoMoeda({ s }: { s: Sorte }) {
  return (
    <div className={styles.moedas}>
      <div className={styles.linhaMoeda}>
        <span className={`${styles.moedinha} ${styles.cara}`}><Smile size={11} aria-label="cara" /></span>
        <span className={styles.efeito}><TextoComIcones texto={s.bom} /></span>
      </div>
      <div className={styles.divisa}>ou</div>
      <div className={styles.linhaMoeda}>
        <span className={`${styles.moedinha} ${styles.coroa}`}><Crown size={11} aria-label="coroa" /></span>
        <span className={styles.efeito}><TextoComIcones texto={s.ruim} /></span>
      </div>
    </div>
  )
}

const dado = <Dices size={12} aria-label="carta de sorte" />

// ------------------------------------------------------------ na mesa

type Modo = 'moeda' | 'dado' | 'ponteiro'

/** O dado que a chance pede: 50% é d6 (4 ou mais), 30% é d10 (8 ou mais). */
function dadoDa(chance: number): { lados: number; minimo: number } {
  if (chance === 50) return { lados: 6, minimo: 4 }
  const lados = 10
  return { lados, minimo: lados - Math.round((chance / 100) * lados) + 1 }
}

function Mesa({ s, modo }: { s: Sorte; modo: Modo }) {
  const [jogada, setJogada] = useState(0)
  const [resultado, setResultado] = useState<{ deu: boolean; valor: number } | null>(null)
  const [pronto, setPronto] = useState(false)

  function jogar() {
    const d = dadoDa(s.chance)
    const r = Math.random()
    const deu = r < s.chance / 100
    // o dado tem que bater com o sorteio: o número sai DO resultado
    const valor =
      modo === 'dado'
        ? deu
          ? d.minimo + Math.floor(Math.random() * (d.lados - d.minimo + 1))
          : 1 + Math.floor(Math.random() * (d.minimo - 1))
        : modo === 'ponteiro'
          ? deu ? Math.random() * s.chance : s.chance + Math.random() * (100 - s.chance)
          : 0
    setResultado({ deu, valor })
    setPronto(false)
    setJogada((j) => j + 1)
  }

  const moedaNao = modo === 'moeda' && s.chance !== 50

  return (
    <div className={styles.mesa}>
      <div className={styles.tapete}>
        {resultado && !moedaNao ? (
          <div key={jogada} className={styles.palco}>
            {modo === 'moeda' ? <Moeda deu={resultado.deu} aoParar={() => setPronto(true)} /> : null}
            {modo === 'dado' ? <Dado s={s} valor={resultado.valor} aoParar={() => setPronto(true)} /> : null}
            {modo === 'ponteiro' ? <Ponteiro s={s} pos={resultado.valor} aoParar={() => setPronto(true)} /> : null}
          </div>
        ) : (
          <p className={styles.vazio}>{moedaNao ? 'Moeda só serve para 50/50.' : 'Jogue a carta.'}</p>
        )}
        {resultado && pronto ? (
          <p className={`${styles.balao} ${resultado.deu ? styles.balaoBom : styles.balaoRuim}`}>
            <b>{resultado.deu ? 'Deu certo:' : 'Não rolou:'}</b>{' '}
            <TextoComIcones texto={resultado.deu ? s.bom : s.ruim} />
          </p>
        ) : null}
      </div>
      <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={jogar} disabled={moedaNao}>
        Jogar {s.carta.name}
      </button>
    </div>
  )
}

function Moeda({ deu, aoParar }: { deu: boolean; aoParar: () => void }) {
  const [giro, setGiro] = useState(0)
  const parar = useRef(aoParar)
  parar.current = aoParar
  useEffect(() => {
    // dois quadros: o primeiro desenha parada, o segundo dispara a transição
    const a = requestAnimationFrame(() =>
      requestAnimationFrame(() => setGiro(360 * 5 + (deu ? 0 : 180))),
    )
    const t = setTimeout(() => parar.current(), 1500)
    return () => {
      cancelAnimationFrame(a)
      clearTimeout(t)
    }
  }, [deu])
  return (
    <div className={styles.pulo}>
      <div className={styles.moeda} style={{ transform: `rotateY(${giro}deg)` }}>
        <span className={`${styles.faceMoeda} ${styles.cara}`}><Smile size={30} /><small>cara</small></span>
        <span className={`${styles.faceMoeda} ${styles.coroa} ${styles.verso}`}><Crown size={30} /><small>coroa</small></span>
      </div>
    </div>
  )
}

function Dado({ s, valor, aoParar }: { s: Sorte; valor: number; aoParar: () => void }) {
  const d = dadoDa(s.chance)
  const [mostrado, setMostrado] = useState(1)
  const [parou, setParou] = useState(false)
  const parar = useRef(aoParar)
  parar.current = aoParar
  useEffect(() => {
    // as faces passam cada vez mais devagar, e a última é a sorteada
    let espera = 45
    let t: ReturnType<typeof setTimeout>
    const passo = () => {
      espera *= 1.18
      if (espera > 260) {
        setMostrado(valor)
        setParou(true)
        parar.current()
        return
      }
      setMostrado(1 + Math.floor(Math.random() * d.lados))
      t = setTimeout(passo, espera)
    }
    t = setTimeout(passo, espera)
    return () => clearTimeout(t)
  }, [valor, d.lados])
  const ok = parou && valor >= d.minimo
  return (
    <div className={styles.dadoArea}>
      <div className={`${styles.dado} ${parou ? styles.dadoParado : ''} ${parou ? (ok ? styles.dadoBom : styles.dadoRuim) : ''}`}>
        {mostrado}
      </div>
      <span className={styles.alvo}>
        dado de {d.lados} · {d.minimo} ou mais dá certo
      </span>
    </div>
  )
}

function Ponteiro({ s, pos, aoParar }: { s: Sorte; pos: number; aoParar: () => void }) {
  const [onde, setOnde] = useState(0)
  const parar = useRef(aoParar)
  parar.current = aoParar
  useEffect(() => {
    const a = requestAnimationFrame(() => requestAnimationFrame(() => setOnde(pos)))
    const t = setTimeout(() => parar.current(), 1700)
    return () => {
      cancelAnimationFrame(a)
      clearTimeout(t)
    }
  }, [pos])
  return (
    <div className={styles.regua}>
      <div className={styles.faixaBoa} style={{ width: `${s.chance}%` }}>{s.chance}%</div>
      <div className={styles.faixaRuim}>{100 - s.chance}%</div>
      <div className={styles.agulha} style={{ left: `${onde}%` }} />
    </div>
  )
}

// ------------------------------------------------------------ a página

export default function LabSortePage() {
  const [qual, setQual] = useState(0)
  const s = SORTES[qual]

  return (
    <main className={`page ${styles.pagina}`}>
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={styles.titulo}>Cartas de sorte</h1>
      <p className={styles.intro}>
        Protótipos para a carta com chance ficar fácil de ler. Nada aqui está no jogo: dá para escolher mais de um
        (por exemplo, a barra na carta e o dado na mesa).
      </p>

      <Segmentado
        rotulo="Carta de exemplo"
        valor={String(qual)}
        onChange={(v) => setQual(Number(v))}
        opcoes={SORTES.map((x, i) => ({ valor: String(i), rotulo: `${x.carta.name} (${x.chance}/${100 - x.chance})` }))}
      />

      <h2 className={styles.secao}>Na carta</h2>
      <div className={styles.cartas}>
        <figure className={styles.opcao}>
          <Card card={s.carta} />
          <figcaption><b>Hoje</b> O texto corrido.</figcaption>
        </figure>
        <figure className={styles.opcao}>
          <Card card={s.carta} corpo={<CorpoBarra s={s} />} />
          <figcaption><b>1 · Barra dividida</b> Uma metade para cada saída; o tamanho é a chance.</figcaption>
        </figure>
        <figure className={styles.opcao}>
          <Card card={s.carta} corpo={<CorpoMoeda s={s} />} />
          <figcaption><b>2 · Cara ou coroa</b> Simpática, mas só para 50/50.</figcaption>
        </figure>
        <figure className={styles.opcao}>
          <Card card={s.carta} corpo={<CorpoBarra s={s} />} seloExtra={dado} />
          <figcaption><b>3 · Selo do dado</b> A barra, e o dado no canto: na mão, de longe, já se sabe que é sorte.</figcaption>
        </figure>
      </div>

      <h2 className={styles.secao}>No detalhe da carta</h2>
      <figure className={styles.opcao}>
        <div className={styles.detalhe}>
          <div className={`${styles.saida} ${styles.bom}`}>
            <span className={styles.saidaTopo}>Se der certo · {s.chance}%</span>
            <span><TextoComIcones texto={s.bom} /></span>
          </div>
          <div className={`${styles.saida} ${styles.ruim}`}>
            <span className={styles.saidaTopo}>Se não der · {100 - s.chance}%</span>
            <span><TextoComIcones texto={s.ruim} /></span>
          </div>
        </div>
        <figcaption><b>5 · Dois cartõezinhos</b> Ao abrir a carta, as duas saídas lado a lado.</figcaption>
      </figure>

      <h2 className={styles.secao}>Na mesa: a sorte tirada na hora</h2>
      <p className={styles.intro}>
        Ao jogar, a sorte é tirada na frente de quem joga, e o resultado fica escrito num balão. É o que ensina a carta.
      </p>
      <div className={styles.mesas}>
        <figure className={styles.opcao}>
          <Mesa key={qual} s={s} modo="moeda" />
          <figcaption><b>4a · Moeda</b> Gira e cai. Só para 50/50.</figcaption>
        </figure>
        <figure className={styles.opcao}>
          <Mesa key={qual} s={s} modo="dado" />
          <figcaption><b>4b · Dado</b> Com o número que precisa tirar à mostra. Serve para qualquer chance (d6, d10).</figcaption>
        </figure>
        <figure className={styles.opcao}>
          <Mesa key={qual} s={s} modo="ponteiro" />
          <figcaption><b>4c · Ponteiro na barra</b> A mesma barra da carta, e uma agulha que corre e para. Qualquer chance.</figcaption>
        </figure>
      </div>
    </main>
  )
}
