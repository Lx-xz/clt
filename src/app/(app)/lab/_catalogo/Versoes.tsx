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

/** Uma carta (ou evento) cujo balanceamento do lab o código desfez. */
export interface Desfeita<T> {
  id: string
  nome: string
  /** A versão do lab, inteira, como estava antes de o código passar por cima. */
  dados: T
  versao: number
  /** O motivo que o autor escreveu quando fez aquela versão. */
  porque: string
  data: string
}

/**
 * Para cada carta: se a(s) mudança(s) mais nova(s) vieram do código, e a
 * versão que elas substituíram tinha sido feita no lab, essa versão volta
 * como candidata. Lendo de trás para frente, a sequência final de linhas do
 * código é pulada; a primeira delas guarda no `dados` a versão de antes, e a
 * linha seguinte (mais velha) diz quem a fez — com motivo digitado, foi o lab.
 * Se depois do código alguém editou de novo aqui, a carta não aparece: a
 * decisão mais nova já é do lab.
 */
export function desfeitasPeloCodigo<T extends { id: string; name: string }>(
  versoes: VersaoAntiga<T>[],
  atuais: T[],
  igual: (a: T, b: T) => boolean,
): Desfeita<T>[] {
  const porCarta = new Map<string, VersaoAntiga<T>[]>()
  for (const v of versoes) porCarta.set(v.carta, [...(porCarta.get(v.carta) ?? []), v])
  const lista: Desfeita<T>[] = []
  for (const atual of atuais) {
    const linhas = (porCarta.get(atual.id) ?? []).sort((a, b) => b.id - a.id)
    let i = 0
    while (i < linhas.length && veioDoCodigo(linhas[i].porque)) i += 1
    if (i === 0) continue
    const substituida = linhas[i - 1]
    const autora = linhas[i]
    if (!autora || veioDoCodigo(autora.porque)) continue
    if (igual(substituida.dados, atual)) continue
    lista.push({
      id: atual.id,
      nome: substituida.dados.name,
      dados: substituida.dados,
      versao: substituida.versao,
      porque: autora.porque,
      data: autora.data,
    })
  }
  return lista
}

/**
 * A caixa que devolve o balanceamento do lab. Ela pede as versões ao banco
 * (só admin lê o `dados`), acha as cartas desfeitas pelo código e salva as
 * marcadas pelo caminho de sempre — com histórico, e com o motivo que o
 * autor tinha escrito para aquela versão, que é o que o jogador deve ler.
 */
export function DesfeitasPeloCodigo<T extends { id: string; name: string }>({
  carregar, atuais, igual, resumo, salvar, aoTerminar, familia,
}: {
  carregar: () => Promise<VersaoAntiga<T>[] | string>
  atuais: T[]
  igual: (a: T, b: T) => boolean
  resumo: (antes: T, depois: T) => string
  salvar: (dados: T, oQue: string, porque: string) => Promise<{ ok: boolean; erro?: string }>
  aoTerminar: (recado: string) => void
  familia: 'cartas' | 'eventos'
}) {
  const [versoes, setVersoes] = useState<VersaoAntiga<T>[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [fora, setFora] = useState<string[]>([])
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    carregar().then((r) => {
      if (!vivo) return
      if (typeof r === 'string') setErro(r)
      else setVersoes(r)
    })
    return () => { vivo = false }
  }, [carregar])

  if (erro && !versoes) return <p className={styles.erroTopo}>{erro}</p>
  if (!versoes) return null
  const achadas = desfeitasPeloCodigo(versoes, atuais, igual)
  if (achadas.length === 0) return null

  async function voltar() {
    setOcupado(true)
    setErro(null)
    let feitas = 0
    for (const d of achadas) {
      if (fora.includes(d.id)) continue
      const atual = atuais.find((a) => a.id === d.id)
      const r = await salvar(d.dados, atual ? resumo(atual, d.dados) : 'Volta à versão do lab', d.porque)
      if (!r.ok) {
        setErro(`${d.nome}: ${r.erro ?? 'não deu para salvar.'}`)
        break
      }
      feitas += 1
    }
    setOcupado(false)
    if (feitas > 0) aoTerminar(`${feitas} ${feitas === 1 ? 'voltou' : 'voltaram'} ao balanceamento do lab.`)
  }

  const marcadas = achadas.length - fora.length
  return (
    <section className={`${styles.trazer} ${styles.desfeitas}`}>
      <h2 className={styles.subtitulo}>
        <RotateCcw size={16} aria-hidden /> O código desfez o seu balanceamento ({achadas.length})
      </h2>
      <p className={styles.dicaSecao}>
        Estas {familia} tinham uma versão feita aqui no lab, e um “Trazer do código” passou por
        cima. Voltar grava a sua versão de novo, com o motivo que você escreveu naquela vez.
      </p>
      <ul className={styles.listaTrazer}>
        {achadas.map((d) => {
          const atual = atuais.find((a) => a.id === d.id)
          return (
            <li key={d.id}>
              <Check
                marcado={!fora.includes(d.id)}
                onChange={(v) => setFora((f) => (v ? f.filter((id) => id !== d.id) : [...f, d.id]))}
              >
                <b>{d.nome}</b> · v{d.versao} de {d.data} · {atual ? resumo(atual, d.dados) : ''}
                <span className={styles.motivoAntigo}>“{d.porque}”</span>
              </Check>
            </li>
          )
        })}
      </ul>
      {erro ? <p className={styles.erroTopo}>{erro}</p> : null}
      <button
        type="button"
        className={`${buttons.button} ${buttons.primary}`}
        onClick={voltar}
        disabled={ocupado || marcadas === 0}
      >
        {ocupado ? 'Voltando…' : `Voltar ${marcadas} ao balanceamento do lab`}
      </button>
    </section>
  )
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
 * `cards.ts` até o banco — enquanto o código estiver atrás, a caixa "Trazer
 * do código" vai continuar oferecendo a versão velha (desmarcada, mas lá).
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
