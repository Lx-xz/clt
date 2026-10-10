'use client'

import { ArrowLeft, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import AberturaDeEnvelope, { EnvelopeEmPe } from '@/components/Envelope'
import Segmentado from '@/components/Segmentado'
import { getCard } from '@/game/catalogo'
import { NOMES_DE_RARIDADE, colecaoInicial } from '@/game/colecao'
import { ENVELOPES, abrirEnvelope } from '@/game/missoes'
import { loadCollection } from '@/game/storage'
import type { CardId, Collection, Raridade, TipoEnvelope } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './envelopes.module.sass'

const TIPOS: TipoEnvelope[] = ['comum', 'pardo', 'confidencial', 'epico', 'lendario']
const RARIDADES: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']
const AMOSTRA = 1000

type Base = 'inicial' | 'minha'

/**
 * A bancada dos envelopes: abrir envelope de mentira, com a animação de
 * verdade, sem que nada chegue à coleção de ninguém.
 *
 * A coleção desta página é uma CÓPIA em memória — a inicial, ou a sua como
 * está agora —, e é ela que os envelopes vão enchendo, para dar para ver o
 * teto de cópias apertando abertura após abertura. Nada aqui chama
 * `saveCollection` nem `sincronizar`: fechar a página joga tudo fora, e
 * "Recomeçar" faz o mesmo sem sair.
 *
 * Embaixo, a conta que a animação não mostra: mil envelopes de cada tipo,
 * abertos sempre da mesma coleção de partida, e quantas cartas de cada
 * raridade saíram de fato — com o teto de cópias e a queda para a raridade
 * de baixo, que é onde a tabela de chances deixa de ser a verdade inteira.
 */
export default function LabEnvelopesPage() {
  const [base, setBase] = useState<Base>('inicial')
  const [colecao, setColecao] = useState<Collection>(() => colecaoInicial())
  const [abrindo, setAbrindo] = useState<{ tipo: TipoEnvelope; cartas: CardId[]; novas: CardId[] } | null>(null)
  const [abertos, setAbertos] = useState(0)

  function partida(b: Base): Collection {
    // a sua coleção é lida do espelho local e copiada: daqui para a frente
    // ela só existe nesta página
    const c = b === 'minha' ? loadCollection() : colecaoInicial()
    return { ...c, envelopes: [] }
  }

  function trocarBase(b: Base) {
    setBase(b)
    setColecao(partida(b))
    setAbertos(0)
  }

  function abrir(tipo: TipoEnvelope) {
    const r = abrirEnvelope({ ...colecao, envelopes: [{ tipo }] }, 0)
    if (!r) return
    setColecao(r.colecao)
    setAbertos((n) => n + 1)
    setAbrindo({ tipo, cartas: r.cartas, novas: r.cartas.filter((id) => !(colecao.tenho[id] > 0)) })
  }

  // a amostra é refeita só quando a base muda: mil aberturas de cada tipo
  // custam alguns milissegundos, e não a cada clique
  const amostra = useMemo(() => {
    const inicio = partida(base)
    return TIPOS.map((tipo) => {
      const conta: Record<Raridade, number> = { comum: 0, incomum: 0, rara: 0, epica: 0, lendaria: 0 }
      let total = 0
      let novas = 0
      for (let i = 0; i < AMOSTRA; i++) {
        const r = abrirEnvelope({ ...inicio, envelopes: [{ tipo }] }, 0)
        if (!r) continue
        total += r.cartas.length
        novas += new Set(r.cartas.filter((id) => !(inicio.tenho[id] > 0))).size
        for (const id of r.cartas) conta[getCard(id).raridade ?? 'comum']++
      }
      return { tipo, conta, total, novas }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base])

  const tenho = Object.values(colecao.tenho).reduce((a, b) => a + b, 0)

  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={styles.titulo}>Envelopes</h1>
      <p className={styles.intro}>
        Abra envelopes de mentira, com a animação de verdade. <b>Nada vai para a sua coleção</b>: as cartas caem numa
        cópia que só existe nesta página, e somem ao sair dela.
      </p>

      <div className={styles.barra}>
        <Segmentado
          rotulo="Coleção de partida"
          valor={base}
          onChange={trocarBase}
          opcoes={[
            { valor: 'inicial', rotulo: 'Coleção inicial' },
            { valor: 'minha', rotulo: 'Cópia da minha' },
          ]}
        />
        <span className={styles.estado}>
          {abertos} aberto{abertos === 1 ? '' : 's'} · {tenho} cópias na coleção de teste
        </span>
        <button type="button" className={buttons.button} onClick={() => trocarBase(base)}>
          <RotateCcw size={15} aria-hidden /> Recomeçar
        </button>
      </div>

      <div className={styles.envelopes}>
        {TIPOS.map((tipo) => {
          const env = ENVELOPES[tipo]
          return (
            <div key={tipo} className={styles.envelope}>
              <EnvelopeEmPe
                tipo={tipo}
                largura={84}
                rotulo={`Abrir um ${env.nome.toLowerCase()} de teste`}
                onClick={() => abrir(tipo)}
              />
              <b>{env.nome}</b>
              <span>
                {env.cartas[0] === env.cartas[1] ? env.cartas[0] : `${env.cartas[0]}–${env.cartas[1]}`} cartas
              </span>
            </div>
          )
        })}
      </div>

      <h2 className={styles.secao}>O que sai de verdade · {AMOSTRA} de cada</h2>
      <p className={styles.dica}>
        Abertos sempre da coleção de partida acima. A porcentagem é das cartas que SAÍRAM, e não a da tabela: raridade
        esgotada cai para a de baixo, e é aqui que isso aparece.
      </p>
      <div className={styles.tabelaRolavel}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Envelope</th>
              {RARIDADES.map((r) => (
                <th key={r} className={styles[`r_${r}`]}>
                  {NOMES_DE_RARIDADE[r]}
                </th>
              ))}
              <th>Cartas novas</th>
            </tr>
          </thead>
          <tbody>
            {amostra.map(({ tipo, conta, total, novas }) => (
              <tr key={tipo}>
                <th>{ENVELOPES[tipo].nome}</th>
                {RARIDADES.map((r) => (
                  <td key={r}>
                    <span className={styles.real}>{total ? ((conta[r] / total) * 100).toFixed(1) : '0'}%</span>
                    <span className={styles.tabelada}>{(ENVELOPES[tipo].chances[r] * 100).toFixed(0)}%</span>
                  </td>
                ))}
                <td>{(novas / AMOSTRA).toFixed(1)} por envelope</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abrindo ? <AberturaDeEnvelope {...abrindo} onFechar={() => setAbrindo(null)} /> : null}
    </main>
  )
}
