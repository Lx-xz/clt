'use client'

import { ArrowLeft, Dices } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Card from '@/components/Card'
import Dado3D, { DadoPercentual, LADOS, RolagemNaMesa, dadosDoValor, valoresDosNumeros, type DadoNaMesa, type TipoDeDado } from '@/components/Dado3D'
import { TextoComIcones } from '@/components/Dinheiro'
import Segmentado from '@/components/Segmentado'
import type { ActionCard } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './sorte.module.sass'

/**
 * Protótipos da carta de SORTE (pedido do autor). Escolhida a barra
 * dividida; aqui ela aparece nas situações que o jogo pode ter:
 *
 * - certo OU errado (o verde e o vermelho, quando a carta quer dizer isso);
 * - AMBÍGUA, sem saída boa nem ruim (cores neutras, que não julgam);
 * - mais de DUAS saídas, cada uma numa faixa do dado;
 * - e a mesma barra para a carta que pergunta ao ESTADO ("primeira vez na
 *   partida / depois"), que não tem sorte nenhuma mas tem dois caminhos.
 *
 * Na mesa a sorte é tirada com um dado 3D de verdade (`Dado3D`), e a faixa
 * que saiu acende na carta. Nada aqui está no jogo.
 */

type Tom = 'bom' | 'ruim' | 'neutro'

interface Saida {
  /** As faces do dado que dão esta saída; nula na carta que pergunta ao estado. */
  faixa: [number, number] | null
  /** O que aparece no lugar da faixa, na carta que pergunta ao estado. */
  quando?: string
  efeito: string
  tom: Tom
}

interface Exemplo {
  carta: ActionCard
  dado: TipoDeDado | 'd100' | null
  saidas: Saida[]
  nota: string
}

const carta = (id: string, name: string, cost: number, kind: ActionCard['kind'], raridade: ActionCard['raridade']): ActionCard => ({
  id, name, cost, kind, raridade, text: '', starter: false, efeitos: [],
})

const EXEMPLOS: Exemplo[] = [
  {
    carta: carta('p1', 'Pedir Aumento', 3, 'social', 'lendaria'),
    dado: 'd2',
    saidas: [
      { faixa: [1, 1], efeito: 'Salário +R$ 100 pelo resto da run', tom: 'bom' },
      { faixa: [2, 2], efeito: '+3 estresse', tom: 'ruim' },
    ],
    nota: 'Certo ou errado: aqui o verde e o vermelho querem dizer isso. O d2 é a moeda.',
  },
  {
    carta: carta('p2', 'Pix Errado', 0, 'grana', 'rara'),
    dado: 'd10',
    saidas: [
      { faixa: [1, 7], efeito: '−R$ 30 e +1 estresse', tom: 'ruim' },
      { faixa: [8, 10], efeito: '+R$ 90', tom: 'bom' },
    ],
    nota: 'Chance que não é meio a meio: 30% vira "8 a 10 num d10". A altura de cada faixa é a chance.',
  },
  {
    carta: carta('p3', 'Amigo Secreto', 1, 'social', 'incomum'),
    dado: 'd2',
    saidas: [
      { faixa: [1, 1], efeito: 'Caneca: amanhã +2 energia', tom: 'neutro' },
      { faixa: [2, 2], efeito: 'Planta: −1 estresse', tom: 'neutro' },
    ],
    nota: 'Ambígua: nenhuma saída é a ruim. Cores neutras, que não julgam.',
  },
  {
    carta: carta('p4', 'Roleta da Copa', 1, 'descanso', 'rara'),
    dado: 'd6',
    saidas: [
      { faixa: [1, 2], efeito: 'Café: +2 energia', tom: 'neutro' },
      { faixa: [3, 4], efeito: 'Bolo: −1 estresse', tom: 'neutro' },
      { faixa: [5, 6], efeito: 'Acabou tudo: +1 estresse', tom: 'ruim' },
    ],
    nota: 'Três saídas, cada uma numa faixa do d6. Dá para misturar neutra e ruim.',
  },
  {
    carta: carta('p5', 'Pedir Desculpas', 1, 'social', 'incomum'),
    dado: null,
    saidas: [
      { faixa: null, quando: '1ª vez na partida', efeito: 'Cancela 1 advertência', tom: 'neutro' },
      { faixa: null, quando: 'Depois', efeito: '−1 estresse', tom: 'neutro' },
    ],
    nota: 'Sem sorte: a carta pergunta ao estado. A mesma barra mostra os dois caminhos, e a carta nunca fica morta.',
  },
]

const ROTULO_DO_DADO: Record<TipoDeDado | 'd100', string> = {
  d2: 'moeda', d3: 'd3', d4: 'd4', d6: 'd6', d8: 'd8', d10: 'd10', d12: 'd12', d20: 'd20', d100: 'd100',
}

const ladosDe = (d: TipoDeDado | 'd100') => (d === 'd100' ? 100 : LADOS[d])

function faixaTexto(f: [number, number], dado: TipoDeDado | 'd100'): string {
  if (dado === 'd2') return f[0] === 1 ? 'cara' : 'coroa'
  return f[0] === f[1] ? String(f[0]) : `${f[0]}–${f[1]}`
}

/** A barra dividida: uma faixa por saída, com a altura do tanto de faces
 *  dela. A faixa que saiu na mesa acende (`destaque`). */
function CorpoBarra({ ex, destaque }: { ex: Exemplo; destaque?: number | null }) {
  let neutra = 0
  return (
    <div className={styles.barra}>
      {ex.saidas.map((s, i) => {
        const peso = s.faixa ? s.faixa[1] - s.faixa[0] + 1 : 1
        const total = ex.dado ? ladosDe(ex.dado) : ex.saidas.length
        const classeTom = s.tom === 'neutro' ? styles[`neutro${neutra++ % 3}`] : styles[s.tom]
        return (
          <div
            key={i}
            className={`${styles.lado} ${classeTom} ${destaque === i ? styles.aceso : ''} ${destaque != null && destaque !== i ? styles.apagado : ''}`}
            style={{ flexGrow: Math.max(peso / total, 0.28) }}
          >
            <span className={styles.faixa}>
              {s.faixa && ex.dado ? faixaTexto(s.faixa, ex.dado) : s.quando}
              {s.faixa && ex.dado && ex.dado !== 'd2' ? (
                <small> · {Math.round((peso / total) * 100)}%</small>
              ) : null}
            </span>
            <span className={styles.efeito}><TextoComIcones texto={s.efeito} /></span>
          </div>
        )
      })}
    </div>
  )
}

/** O selo do canto: o dado que a carta rola. */
function SeloDoDado({ dado }: { dado: TipoDeDado | 'd100' }) {
  return <span className={styles.seloTexto}>{dado.slice(1)}</span>
}

function sortear(dado: TipoDeDado | 'd100') {
  return 1 + Math.floor(Math.random() * ladosDe(dado))
}

function DadoQualquer({ dado, valor, jogada, tamanho, onParar }: {
  dado: TipoDeDado | 'd100'
  valor: number
  jogada: number
  tamanho?: number
  onParar?: () => void
}) {
  if (dado === 'd100') return <DadoPercentual valor={valor} jogada={jogada} tamanho={tamanho} onParar={onParar} />
  // a moeda é dourada e diz cara ou coroa, como a carta
  if (dado === 'd2') {
    return (
      <Dado3D
        tipo="d2"
        valor={valor}
        jogada={jogada}
        tamanho={tamanho}
        cor="#d9b24a"
        corNumero="#5a3f0c"
        rotulo={(n) => (n === 1 ? 'cara' : 'coroa')}
        onParar={onParar}
      />
    )
  }
  return <Dado3D tipo={dado} valor={valor} jogada={jogada} tamanho={tamanho} onParar={onParar} />
}

/** A mesa: joga a carta, o dado rola, e a faixa que saiu acende nela. */
/** Os dados que a mesa joga para um resultado (moeda diz cara ou coroa). */
function dadosDoResultado(dado: TipoDeDado | 'd100', valor: number): DadoNaMesa[] {
  return dadosDoValor(dado === 'd100' ? 100 : LADOS[dado], valor, 'cara-coroa') ?? []
}

function Mesa({ ex, modo }: { ex: Exemplo; modo: 'auto' | 'mao' }) {
  const [jogada, setJogada] = useState(0)
  const [valor, setValor] = useState<number | null>(null)
  const [parou, setParou] = useState(false)
  const dado = ex.dado
  const saiu = valor === null ? null : ex.saidas.findIndex((s) => s.faixa && valor >= s.faixa[0] && valor <= s.faixa[1])

  function jogar() {
    if (!dado) return
    // na mesa automática o número sai antes (como num evento); na mão, quem
    // decide é a face que ficar para cima
    setValor(modo === 'auto' ? sortear(dado) : 0)
    setParou(false)
    setJogada((j) => j + 1)
  }

  const lados = dado === 'd100' ? 100 : dado ? LADOS[dado] : 0
  const naMesa: DadoNaMesa[] =
    dado && valor !== null
      ? modo === 'auto'
        ? dadosDoResultado(dado, valor)
        : dadosDoResultado(dado, 1).map(({ valor: _v, ...resto }) => resto)
      : []

  return (
    <div className={styles.mesa}>
      <Card card={ex.carta} corpo={<CorpoBarra ex={ex} destaque={parou ? saiu : null} />} seloExtra={dado ? <SeloDoDado dado={dado} /> : null} />
      <div className={styles.tapete}>
        {dado && valor !== null ? (
          <RolagemNaMesa
            dados={naMesa}
            modo={modo}
            jogada={jogada}
            tamanho={72}
            onParar={(numeros) => {
              if (modo === 'mao') setValor(valoresDosNumeros(lados, numeros)[0])
              setParou(true)
            }}
          />
        ) : (
          <p className={styles.vazio}>{dado ? 'Jogue a carta.' : 'Esta não rola dado: o caminho sai do estado da partida.'}</p>
        )}
        {parou && saiu !== null && saiu >= 0 ? (
          <p className={`${styles.balao} ${styles[`balao_${ex.saidas[saiu].tom}`]}`}>
            <b>Saiu {dado === 'd2' ? (valor === 1 ? 'cara' : 'coroa') : valor}:</b> <TextoComIcones texto={ex.saidas[saiu].efeito} />
          </p>
        ) : null}
      </div>
      <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={jogar} disabled={!dado}>
        <Dices size={16} aria-hidden /> Jogar {ex.carta.name}
      </button>
    </div>
  )
}

const TODOS: (TipoDeDado | 'd100')[] = ['d2', 'd3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

/** A bancada: todos os dados, rolando juntos. */
function TodosOsDados() {
  const [jogada, setJogada] = useState(0)
  const [valores, setValores] = useState<number[]>(() => TODOS.map((d) => ladosDe(d)))
  return (
    <div className={styles.bancada}>
      <div className={styles.fileira}>
        {TODOS.map((d, i) => (
          <div key={d} className={styles.umDado}>
            <DadoQualquer dado={d} valor={valores[i]} jogada={jogada} tamanho={d === 'd100' ? 48 : 58} />
            <span className={styles.nomeDado}>
              {ROTULO_DO_DADO[d]}
              {jogada > 0 ? <b> · {valores[i]}</b> : null}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`${buttons.button} ${buttons.primary}`}
        onClick={() => {
          setValores(TODOS.map(sortear))
          setJogada((j) => j + 1)
        }}
      >
        <Dices size={16} aria-hidden /> Rolar todos
      </button>
    </div>
  )
}

export default function LabSortePage() {
  const [qual, setQual] = useState(0)
  const [modo, setModo] = useState<'auto' | 'mao'>('auto')
  const ex = EXEMPLOS[qual]

  return (
    <main className={`page ${styles.pagina}`}>
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={styles.titulo}>Cartas de sorte</h1>
      <p className={styles.intro}>
        A barra dividida em cada situação que o jogo pode ter, e a sorte tirada na mesa com um dado de verdade. Nada
        aqui está no jogo.
      </p>

      <h2 className={styles.secao}>A carta</h2>
      <div className={styles.cartas}>
        {EXEMPLOS.map((e, i) => (
          <figure key={e.carta.id} className={styles.opcao}>
            <Card card={e.carta} corpo={<CorpoBarra ex={e} />} seloExtra={e.dado ? <SeloDoDado dado={e.dado} /> : null} />
            <figcaption>{e.nota}</figcaption>
            <button type="button" className={styles.linkBotao} onClick={() => setQual(i)}>
              {qual === i ? 'na mesa abaixo' : 'levar para a mesa'}
            </button>
          </figure>
        ))}
      </div>

      <h2 className={styles.secao}>Na mesa</h2>
      <Segmentado
        rotulo="Carta na mesa"
        valor={String(qual)}
        onChange={(v) => setQual(Number(v))}
        opcoes={EXEMPLOS.map((e, i) => ({ valor: String(i), rotulo: e.carta.name }))}
        className={styles.escolha}
      />
      <Segmentado
        rotulo="Como o dado é jogado"
        valor={modo}
        onChange={setModo}
        opcoes={[
          { valor: 'auto', rotulo: 'A mesa joga' },
          { valor: 'mao', rotulo: 'Você joga (arraste e solte)' },
        ]}
        className={styles.escolha}
      />
      <Mesa key={`${qual}-${modo}`} ex={ex} modo={modo} />

      <h2 className={styles.secao}>Todos os dados</h2>
      <p className={styles.intro}>
        d2 (a moeda), d3, d4, d6, d8, d10, d12, d20 e d100 (dois d10: dezena e unidade). Em CSS 3D, sem biblioteca: o
        jogo decide o número antes, e o dado gira até pousar nele.
      </p>
      <TodosOsDados />
    </main>
  )
}
