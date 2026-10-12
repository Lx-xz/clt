'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AberturaDeEnvelope, { ObjetoDaRecompensa } from '@/components/Envelope'
import Segmentado from '@/components/Segmentado'
import { useSessao } from '@/components/SessaoGuard'
import { carregarDoBanco, sincronizar } from '@/data/sync'
import { getCard } from '@/game/catalogo'
import { NOMES_DE_RARIDADE, colecaoInicial } from '@/game/colecao'
import { ENVELOPES, abrirEnvelope } from '@/game/missoes'
import { loadCollection, loadRun } from '@/game/storage'
import type { CardId, Collection, GameState, Raridade, TipoEnvelope } from '@/game/types'
import styles from './envelopes.module.sass'

const TIPOS: TipoEnvelope[] = ['comum', 'pardo', 'confidencial', 'epico']
const RARIDADES: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']
const AMOSTRA = 1000

type Base = 'inicial' | 'minha'

/**
 * A bancada das recompensas (que o código chama de envelopes, de quando
 * eram todas envelope): abrir com a animação de verdade, e o que sai
 * **vai para a conta do admin** (v0.28, pedido do autor). Até ali a
 * coleção daqui era uma cópia em memória, que sumia ao sair; agora é a
 * coleção de verdade, lida do banco, e cada abertura sobe por
 * `sincronizar` como a do início. As recompensas fechadas que o admin já
 * tem ficam onde estão: a de teste entra na frente da fila e sai na hora.
 *
 * Embaixo, a conta que a animação não mostra: mil envelopes de cada tipo,
 * abertos sempre da mesma coleção de partida, e quantas cartas de cada
 * raridade saíram de fato — com o teto de cópias e a queda para a raridade
 * de baixo, que é onde a tabela de chances deixa de ser a verdade inteira.
 */
export default function LabEnvelopesPage() {
  const sessao = useSessao()
  const [base, setBase] = useState<Base>('inicial')
  const [colecao, setColecao] = useState<Collection | null>(null)
  const [abrindo, setAbrindo] = useState<{ tipo: TipoEnvelope; cartas: CardId[]; cosmeticos: string[]; novas: CardId[] } | null>(null)
  const [abertos, setAbertos] = useState(0)

  // a coleção de verdade: o espelho local abre a página, e a do banco a
  // substitui quando chegar — senão a primeira abertura subiria uma coleção
  // velha por cima da de outro aparelho
  useEffect(() => {
    setColecao(loadCollection())
    let vivo = true
    void carregarDoBanco(sessao.id)
      .then(({ collection }) => {
        if (vivo) setColecao(collection)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [sessao.id])

  function partida(b: Base): Collection {
    const c = b === 'minha' ? loadCollection() : colecaoInicial()
    return { ...c, envelopes: [] }
  }

  function abrir(tipo: TipoEnvelope) {
    if (!colecao) return
    // abre ANTES da animação, como no jogo: fechar no meio não perde nada
    const r = abrirEnvelope({ ...colecao, envelopes: [{ tipo }, ...colecao.envelopes] }, 0)
    if (!r) return
    setColecao(r.colecao)
    sincronizar(sessao.id, loadRun<GameState>(), r.colecao, () => {})
    setAbertos((n) => n + 1)
    setAbrindo({ tipo, cartas: r.cartas, cosmeticos: r.cosmeticos, novas: r.cartas.filter((id) => !(colecao.tenho[id] > 0)) })
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

  const tenho = colecao ? Object.values(colecao.tenho).reduce((a, b) => a + b, 0) : 0

  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>
      <h1 className={styles.titulo}>Recompensas</h1>
      <p className={styles.intro}>
        Abra envelope, pacote, maleta e cofre com a animação de verdade. <b>O que sair vai para a sua conta</b>: as cartas e os itens
        entram na sua coleção e ficam. Para começar do zero, o "Resetar run e coleção" da porta do lab.
      </p>

      <div className={styles.barra}>
        <span className={styles.estado}>
          {abertos} aberto{abertos === 1 ? '' : 's'} nesta visita · {tenho} cópias na sua coleção
          {colecao ? ` · ${colecao.cosmeticos.length} ite${colecao.cosmeticos.length === 1 ? 'm' : 'ns'}` : ''}
        </span>
      </div>

      <div className={styles.envelopes}>
        {TIPOS.map((tipo) => {
          const env = ENVELOPES[tipo]
          return (
            <div key={tipo} className={styles.envelope}>
              <ObjetoDaRecompensa
                tipo={tipo}
                largura={84}
                rotulo={`Abrir ${env.artigo === 'a' ? 'uma' : 'um'} ${env.nome.toLowerCase()} de teste`}
                onClick={colecao ? () => abrir(tipo) : undefined}
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
      <Segmentado
        rotulo="Coleção de partida"
        valor={base}
        onChange={setBase}
        opcoes={[
          { valor: 'inicial', rotulo: 'Coleção inicial' },
          { valor: 'minha', rotulo: 'A minha' },
        ]}
      />
      <p className={styles.dica}>
        Abertos sempre da coleção escolhida, numa cópia: esta conta não grava nada. A porcentagem é das cartas que SAÍRAM, e não a da tabela: raridade
        esgotada cai para a de baixo, e é aqui que isso aparece.
      </p>
      <div className={styles.tabelaRolavel}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Recompensa</th>
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
                <td>{(novas / AMOSTRA).toFixed(1)} por abertura</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abrindo ? <AberturaDeEnvelope {...abrindo} onFechar={() => setAbrindo(null)} /> : null}
    </main>
  )
}
