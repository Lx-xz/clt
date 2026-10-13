'use client'

import { History, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import Check from '@/components/Check'
import { MOTIVOS_DO_CODIGO } from '@/game/cards'
import { MOTIVOS_DOS_EVENTOS } from '@/game/events'
import { mudancasDoCatalogo } from '@/game/catalogo'
import type { VersaoAntiga } from '@/data/cartas'
import buttons from '@/styles/buttons.module.sass'
import styles from '../cartas/cartas.module.sass'

/**
 * O balanceamento feito à mão no /lab, e o que o protege do código.
 *
 * Já aconteceu: o autor ajustou cartas aqui (Proatividade de graça, Hora
 * Extra sem estresse), e um "Trazer do código" depois levou o `cards.ts` por
 * cima, porque a caixa vinha com tudo marcado. Nada se perdeu — a versão
 * substituída fica inteira em `cartas_antigas` —, mas não havia como vê-la
 * nem como voltar. Daqui saem as três coisas que faltavam: saber se a versão
 * no ar é do lab ou do código, achar o balanceamento que o código desfez, e
 * devolver uma carta a qualquer versão antiga.
 */

/**
 * Os motivos que o "Trazer do código" grava. É por eles que se sabe que uma
 * mudança veio do código e não da mão de alguém: o motivo digitado no lab
 * nunca é igual a uma destas frases. Quando uma frase de `MOTIVOS_DO_CODIGO`
 * for reescrita, a de antes vem para cá — senão as linhas antigas passariam
 * a parecer edição do lab.
 */
const MOTIVOS_ANTIGOS = [
  'O último recurso perto do burnout, uma vez por run.',
  'O tudo ou nada: muita produtividade hoje, paga em estresse agora e em energia amanhã.',
  'Ajuste do baralho de referência do código.',
  'Carta nova do baralho de referência do código.',
  'Evento novo do baralho de referência do código.',
]

const DO_CODIGO = new Set([
  ...Object.values(MOTIVOS_DO_CODIGO),
  ...Object.values(MOTIVOS_DOS_EVENTOS),
  ...MOTIVOS_ANTIGOS,
])

export function veioDoCodigo(porque: string): boolean {
  return DO_CODIGO.has(porque.trim())
}

/**
 * A versão no ar desta carta foi escrita à mão no lab? A mudança mais nova
 * do histórico é a que produziu a versão de hoje; se o motivo dela não é um
 * dos do código, foi alguém aqui. Carta sem histórico é a da semente.
 */
export function editadaNoLab(id: string, familia: 'acao' | 'evento'): boolean {
  const ultima = mudancasDoCatalogo().find((m) => m.carta === id && m.familia === familia)
  return Boolean(ultima && !veioDoCodigo(ultima.porque))
}

/**
 * As versões de UMA carta, dentro da edição. "Usar esta" só carrega a versão
 * no editor: para valer, ainda é o Salvar de sempre, com motivo.
 */
export function VersoesDaCarta<T>({ id, carregar, aoUsar, descrever }: {
  id: string
  carregar: () => Promise<VersaoAntiga<T>[] | string>
  aoUsar: (dados: T) => void
  descrever: (dados: T) => string
}) {
  const [versoes, setVersoes] = useState<VersaoAntiga<T>[] | string | null>(null)
  const [aberta, setAberta] = useState(false)

  useEffect(() => {
    if (!aberta || versoes) return
    let vivo = true
    carregar().then((r) => { if (vivo) setVersoes(r) })
    return () => { vivo = false }
  }, [aberta, versoes, carregar])

  const daCarta = Array.isArray(versoes) ? versoes.filter((v) => v.carta === id) : []

  return (
    <details className={styles.versoes} onToggle={(e) => setAberta((e.target as HTMLDetailsElement).open)}>
      <summary>
        <History size={14} aria-hidden /> Versões anteriores
      </summary>
      {typeof versoes === 'string' ? <p className={styles.erroTopo}>{versoes}</p> : null}
      {Array.isArray(versoes) && daCarta.length === 0 ? (
        <p className={styles.dicaSecao}>Nenhuma: esta é a versão da semente.</p>
      ) : null}
      <ol className={styles.listaVersoes}>
        {daCarta.map((v, i) => {
          // o motivo da linha é o da mudança que TIROU esta versão; quem a
          // fez é a linha seguinte (mais velha)
          const autora = daCarta[i + 1]
          return (
            <li key={v.id}>
              <div>
                <b>v{v.versao}</b>
                {autora ? (veioDoCodigo(autora.porque) ? ' · do código' : ' · feita no lab') : ' · semente'}
                {autora ? ` · ${autora.data}` : ''}
                <span className={styles.motivoAntigo}>{descrever(v.dados)}</span>
                {autora && !veioDoCodigo(autora.porque) ? (
                  <span className={styles.motivoAntigo}>“{autora.porque}”</span>
                ) : null}
              </div>
              <button type="button" className={buttons.button} onClick={() => aoUsar(v.dados)}>
                Usar esta
              </button>
            </li>
          )
        })}
      </ol>
    </details>
  )
}

/**
 * O caminho de volta para o código: copia, como texto, as cartas cuja versão
 * no ar foi feita aqui, com o motivo. É para colar numa conversa e levar o
 * `cards.ts` até o banco. Desde que a caixa "Trazer do código" só oferece
 * carta NOVA, o código atrás não ameaça mais nada, mas é ele a semente e a
 * rede: quanto mais perto do banco, melhor.
 */
export function CopiarParaOCodigo<T extends { id: string; name: string }>({ atuais, familia, paraTexto }: {
  atuais: T[]
  familia: 'acao' | 'evento'
  paraTexto: (c: T) => unknown
}) {
  const [copiado, setCopiado] = useState(false)
  const doLab = atuais.filter((c) => editadaNoLab(c.id, familia))
  if (doLab.length === 0) return null

  async function copiar() {
    const texto = JSON.stringify(
      doLab.map((c) => ({
        ...(paraTexto(c) as object),
        porque: mudancasDoCatalogo().find((m) => m.carta === c.id && m.familia === familia)?.porque,
      })),
      null,
      2,
    )
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <p className={styles.dicaSecao}>
      {doLab.length} {familia === 'acao' ? (doLab.length === 1 ? 'carta está' : 'cartas estão') : (doLab.length === 1 ? 'evento está' : 'eventos estão')}{' '}
      no ar com a versão feita aqui: {doLab.map((c) => c.name).join(', ')}.{' '}
      <button type="button" className={buttons.button} onClick={copiar}>
        {copiado ? 'Copiado' : 'Copiar para levar ao código'}
      </button>
    </p>
  )
}
