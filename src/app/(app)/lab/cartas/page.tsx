'use client'

import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Card from '@/components/Card'
import Check from '@/components/Check'
import Dinheiro, { TextoComIcones } from '@/components/Dinheiro'
import Dialogo from '@/components/Dialogo'
import Segmentado from '@/components/Segmentado'
import {
  BotaoExcluir,
  Origem,
  PedirMotivo,
  estilosDaBancada as comuns,
} from '../_catalogo/Bancada'
import { EditorDeEfeitos, EscapeJson } from '../_catalogo/EditorDeAcoes'
import {
  cartaParaBanco,
  excluirDoCatalogo,
  salvarCarta,
  semearCatalogo,
} from '@/data/cartas'
import { CARTAS_BASE, MOTIVOS_DO_CODIGO } from '@/game/cards'
import { EVENTOS_BASE } from '@/game/events'
import { MODO_NORMAL } from '@/game/regras'
import { catalogoVeioDoBanco, todasAsCartas, todosOsEventos } from '@/game/catalogo'
import type { Acao, Efeito, Recurso } from '@/game/acoes'
import { COPIAS_POR_RARIDADE } from '@/game/colecao'
import { RECURSOS_DE_CUSTO, lerCustos } from '@/game/custos'
import type { ActionCard, ClasseDaCarta, Custo, Raridade, RecursoDeCusto } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './cartas.module.sass'

/**
 * A bancada das cartas de ação — agora com CRUD de verdade.
 *
 * **Ela grava no banco.** Até a v0.10 não gravava, e o motivo era bom: com as
 * cartas no código, um `delete` apagaria uma carta que está dentro do save e
 * do baralho de quem está no meio de uma run. O que mudou não foi a opinião,
 * foi a estrutura — três peças, que valem juntas:
 *
 * 1. **Nada é apagado.** Remover é `ativa = false`; a carta continua no
 *    catálogo e quem está com ela na mão termina a partida.
 * 2. **A run guarda o próprio retrato.** Mudar o custo hoje não reescreve a
 *    partida de ontem: o replay lê o que a run gravou de si mesma.
 * 3. **Não dá para mudar em silêncio.** Salvar exige um motivo escrito, que
 *    vira o histórico que o jogador lê no baralho.
 *
 * A edição continua em dois níveis, de propósito: os quatro campos de recurso
 * mexem no bloco de efeito SEM condição (é o atalho de quem só quer
 * rebalancear um número), e o editor visual abaixo mostra a carta inteira,
 * condição e sorteio inclusive. O JSON continua ali, recolhido, para o caso
 * raro — o que ele deixou de ser é o único caminho.
 */

const CLASSES: { valor: string; rotulo: string }[] = [
  { valor: 'tarefa', rotulo: 'Tarefa' },
  { valor: 'descanso', rotulo: 'Descanso' },
  { valor: 'grana', rotulo: 'Grana' },
  { valor: 'social', rotulo: 'Social' },
  { valor: 'neutra', rotulo: 'Sem tipo' },
]

const RARIDADES: { valor: Raridade; rotulo: string }[] = [
  { valor: 'comum', rotulo: 'Comum' },
  { valor: 'incomum', rotulo: 'Incomum' },
  { valor: 'rara', rotulo: 'Rara' },
]

const RECURSOS: Recurso[] = ['produtividade', 'energia', 'estresse', 'dinheiro']

function nova(): ActionCard {
  return {
    id: '', name: 'Carta Nova', cost: 2, kind: 'tarefa', text: '',
    efeitos: [{ acoes: [] }], starter: false,
  }
}

/** O índice do bloco sem condição — o "efeito simples" da carta. */
function blocoSimples(c: ActionCard): number {
  return c.efeitos.findIndex((e) => !e.se && !e.quando)
}

/** Quanto a carta soma num recurso, somando as ações do bloco simples. */
function somaDe(c: ActionCard, qual: Recurso): number | '' {
  const bloco = c.efeitos[blocoSimples(c)]
  if (!bloco) return ''
  const total = bloco.acoes
    .filter((a): a is Extract<Acao, { faz: 'recurso' }> => a.faz === 'recurso' && a.qual === qual)
    .reduce((soma, a) => soma + a.quanto, 0)
  return total === 0 ? '' : total
}

/**
 * Troca quanto a carta soma num recurso. Tira as ações daquele recurso e põe
 * uma só no lugar — digitar "12" seriam duas teclas e, sem isso, duas ações
 * empilhadas somando 1 e 12.
 */
function mudarRecurso(c: ActionCard, qual: Recurso, quanto: number): ActionCard {
  const efeitos = c.efeitos.map((e) => ({ ...e, acoes: [...e.acoes] }))
  let i = blocoSimples(c)
  if (i < 0) {
    efeitos.push({ acoes: [] })
    i = efeitos.length - 1
  }
  efeitos[i].acoes = efeitos[i].acoes.filter((a) => !(a.faz === 'recurso' && a.qual === qual))
  if (quanto !== 0) efeitos[i].acoes.push({ faz: 'recurso', qual, quanto })
  return { ...c, efeitos }
}

/**
 * O resumo da mudança, em número. É a metade que um diff SABE escrever — e é
 * justamente por isso que ela é sugerida e o `porque` não: pedir à pessoa as
 * duas partes faria ela digitar o que a máquina já sabe, e o campo caro
 * acabaria preenchido com pressa.
 */
function resumoDaMudanca(antes: ActionCard | undefined, depois: ActionCard): string {
  if (!antes) return 'Carta nova'
  const partes: string[] = []
  if (antes.name !== depois.name) partes.push(`Nome: ${antes.name} → ${depois.name}`)
  if (antes.cost !== depois.cost) partes.push(`Custo ${antes.cost} → ${depois.cost}`)
  if (antes.kind !== depois.kind) {
    partes.push(`Classe: ${antes.kind ?? 'sem tipo'} → ${depois.kind ?? 'sem tipo'}`)
  }
  if (antes.starter !== depois.starter) {
    partes.push(depois.starter ? 'Passou a vir no baralho inicial' : 'Saiu do baralho inicial')
  }
  if ((antes.raridade ?? 'comum') !== (depois.raridade ?? 'comum')) {
    partes.push(`Raridade: ${antes.raridade ?? 'comum'} → ${depois.raridade ?? 'comum'}`)
  }
  for (const qual of RECURSOS_DE_CUSTO) {
    const de = antes.custos?.find((c) => c.qual === qual)?.quanto ?? 0
    const para = depois.custos?.find((c) => c.qual === qual)?.quanto ?? 0
    if (de !== para) partes.push(`Custo em ${qual} ${de} → ${para}`)
  }
  if ((antes.copies ?? 1) !== (depois.copies ?? 1)) {
    partes.push(`Cópias ${antes.copies ?? 1} → ${depois.copies ?? 1}`)
  }
  if (JSON.stringify(antes.efeitos) !== JSON.stringify(depois.efeitos)) partes.push('Efeito mudou')
  if (antes.text !== depois.text) partes.push('Texto reescrito')
  return partes.join(' · ') || 'Salva sem mudança de número'
}

type RecursoDaLinha = 'energia' | RecursoDeCusto

const NOMES_DE_CUSTO: Record<RecursoDaLinha, string> = {
  energia: 'Energia',
  dinheiro: 'Dinheiro',
  estresse: 'Estresse',
  produtividade: 'Produtividade',
}

/**
 * Os custos da carta, como uma lista: "+ custo", escolhe o recurso, diz
 * quanto. Era um campo por recurso, e a carta que custasse estresse pediria
 * um terceiro campo. A energia aparece na MESMA lista para quem edita, mas
 * mora em `cost` (é o custo que toda carta tem, e o que os eventos mexem);
 * o resto vai para `custos`. Sem linha de energia, a carta custa 0 dela.
 *
 * As linhas moram no estado deste componente, e não são deduzidas da carta a
 * cada render: senão a linha recém-acrescentada com 0 sumiria na hora.
 */
function EditorDeCustos({ carta, onChange }: {
  carta: ActionCard
  onChange: (cost: number, custos: Custo[] | undefined) => void
}) {
  const [linhas, setLinhas] = useState<{ qual: RecursoDaLinha; quanto: number }[]>(() => [
    ...(carta.cost > 0 || !carta.custos?.length ? [{ qual: 'energia' as const, quanto: carta.cost }] : []),
    ...(carta.custos ?? []),
  ])

  function mudar(novas: { qual: RecursoDaLinha; quanto: number }[]) {
    setLinhas(novas)
    const energia = novas.find((l) => l.qual === 'energia')?.quanto ?? 0
    const custos = lerCustos(novas.filter((l) => l.qual !== 'energia'))
    onChange(Math.max(0, energia), custos.length ? custos : undefined)
  }

  const livres = (['energia', ...RECURSOS_DE_CUSTO] as RecursoDaLinha[]).filter(
    (r) => !linhas.some((l) => l.qual === r),
  )

  return (
    <div className={comuns.rotulo}>
      Custos
      <ul className={styles.custosLista}>
        {linhas.map((l, i) => (
          <li key={l.qual} className={styles.custoLinha}>
            <select
              className={comuns.campo}
              value={l.qual}
              aria-label="Recurso do custo"
              onChange={(e) => mudar(linhas.map((x, j) => (j === i ? { ...x, qual: e.target.value as RecursoDaLinha } : x)))}
            >
              {[l.qual, ...livres].map((r) => (
                <option key={r} value={r}>{NOMES_DE_CUSTO[r]}</option>
              ))}
            </select>
            <input
              className={comuns.campo}
              type="number"
              min={0}
              max={l.qual === 'dinheiro' ? 1000 : 20}
              step={l.qual === 'dinheiro' ? 5 : 1}
              value={l.quanto}
              aria-label={`Quanto de ${l.qual}`}
              onChange={(e) =>
                mudar(linhas.map((x, j) => (j === i ? { ...x, quanto: Math.max(0, Number(e.target.value) || 0) } : x)))
              }
            />
            <button
              type="button"
              className={buttons.button}
              onClick={() => mudar(linhas.filter((_, j) => j !== i))}
              aria-label={`Tirar o custo de ${l.qual}`}
            >
              <X size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {livres.length > 0 ? (
        <button
          type="button"
          className={`${buttons.button} ${styles.maisCusto}`}
          onClick={() => mudar([...linhas, { qual: livres[0], quanto: livres[0] === 'dinheiro' ? 10 : 1 }])}
        >
          <Plus size={14} aria-hidden /> Custo
        </button>
      ) : null}
      <span className={comuns.dica}>
        Tudo é pago ANTES dos efeitos. Sem saldo de dinheiro ou de produtividade a carta não sai
        da mão; estresse não tem saldo — pagar é subir, mesmo que leve ao burnout.
      </span>
    </div>
  )
}

/**
 * Carta que cobra dinheiro pelo EFEITO (um `recurso dinheiro` negativo no
 * bloco sem condição) em vez de pelo custo. Era o único jeito antes da v0.15,
 * e o efeito deixa jogar sem saldo: a conta só chega na sexta, como despejo.
 * Isto acha essas cartas no catálogo VIVO (o do banco, que é onde moram as
 * cartas editadas no /lab) e propõe a troca, com o "−R$" tirado do texto —
 * o carimbo verde já diz o preço.
 */
function custoEscondido(c: ActionCard): ActionCard | null {
  const i = blocoSimples(c)
  if (i < 0) return null
  const bloco = c.efeitos[i]
  const pagos = bloco.acoes.filter(
    (a): a is Extract<Acao, { faz: 'recurso' }> => a.faz === 'recurso' && a.qual === 'dinheiro' && a.quanto < 0,
  )
  if (pagos.length === 0) return null
  const preco = pagos.reduce((t, a) => t - a.quanto, 0)
  const efeitos = c.efeitos.map((e, j) =>
    j === i ? { ...e, acoes: e.acoes.filter((a) => !pagos.includes(a as (typeof pagos)[number])) } : e,
  )
  const custos = lerCustos([...(c.custos ?? []), { qual: 'dinheiro', quanto: preco }])
  const text = c.text
    .replace(/[−-]\s*R\$\s*\d+\s*[,.;·]?\s*/g, '')
    .replace(/^[\s,.;·]+|[\s,.;·]+$/g, '')
  return { ...c, efeitos, custos, text: text || c.text }
}

function ConverterCustos({ cartas, aoTerminar }: { cartas: ActionCard[]; aoTerminar: (recado: string) => void }) {
  const achadas = cartas
    .filter((c) => c.ativa !== false)
    .map((c) => ({ antes: c, depois: custoEscondido(c) }))
    .filter((x): x is { antes: ActionCard; depois: ActionCard } => x.depois !== null)
  const [fora, setFora] = useState<string[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  if (achadas.length === 0) return null

  async function converter() {
    setOcupado(true)
    setErro(null)
    let feitas = 0
    for (const { antes, depois } of achadas) {
      if (fora.includes(antes.id)) continue
      const preco = depois.custos?.find((c) => c.qual === 'dinheiro')?.quanto ?? 0
      const r = await salvarCarta(
        depois,
        `Os ${preco} de dinheiro saíram do efeito e viraram custo`,
        'Como efeito, o dinheiro negativo deixava jogar sem saldo e só cobrava na sexta. Como custo, sem dinheiro a carta não sai da mão, e o preço aparece no carimbo.',
      )
      if (!r.ok) {
        setErro(`${antes.name}: ${r.erro ?? 'não deu para salvar.'}`)
        break
      }
      feitas += 1
    }
    setOcupado(false)
    if (feitas > 0) aoTerminar(`${feitas} ${feitas === 1 ? 'carta passou' : 'cartas passaram'} a cobrar o dinheiro como custo.`)
  }

  const marcadas = achadas.length - fora.length
  return (
    <section className={styles.trazer}>
      <h2 className={styles.subtitulo}>Cartas que cobram dinheiro pelo efeito ({achadas.length})</h2>
      <p className={styles.dicaSecao}>
        Dinheiro negativo no efeito deixa jogar sem saldo. Convertidas, elas cobram o dinheiro
        como custo (o carimbo verde), e o “−R$ N” sai do texto.
      </p>
      <ul className={styles.listaTrazer}>
        {achadas.map(({ antes, depois }) => (
          <li key={antes.id}>
            <Check
              marcado={!fora.includes(antes.id)}
              onChange={(v) => setFora((f) => (v ? f.filter((id) => id !== antes.id) : [...f, antes.id]))}
            >
              <b>{antes.name}</b> · custo <Dinheiro valor={depois.custos?.find((c) => c.qual === 'dinheiro')?.quanto ?? 0} /> · “
              <TextoComIcones texto={antes.text} />” → “<TextoComIcones texto={depois.text} />”
            </Check>
          </li>
        ))}
      </ul>
      {erro ? <p className={styles.erroTopo}>{erro}</p> : null}
      <button
        type="button"
        className={`${buttons.button} ${buttons.primary}`}
        onClick={converter}
        disabled={ocupado || marcadas === 0}
      >
        {ocupado ? 'Convertendo…' : `Converter ${marcadas}`}
      </button>
    </section>
  )
}

/** JSON com as chaves em ordem: o `jsonb` do banco reordena as chaves dos
 *  objetos, e comparar o texto cru acusaria diferença em toda carta. */
function estavel(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estavel).join(',')}]`
  if (v && typeof v === 'object') {
    const pares = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
    return `{${pares.map(([k, x]) => `${JSON.stringify(k)}:${estavel(x)}`).join(',')}}`
  }
  return JSON.stringify(v)
}

interface Pendencia {
  carta: ActionCard
  oQue: string
  porque: string
}

/**
 * O que o baralho do código tem e o banco não: carta nova, ou carta que o
 * código mudou. Carta que o admin TIROU do jogo (`ativa = false`) fica de
 * fora — tirar foi uma decisão, e trazer de volta tem que ser outra.
 */
function pendenciasDoCodigo(doBanco: ActionCard[]): Pendencia[] {
  const banco = new Map(doBanco.map((c) => [c.id, c]))
  const lista: Pendencia[] = []
  for (const carta of CARTAS_BASE) {
    const antes = banco.get(carta.id)
    if (antes?.ativa === false) continue
    if (antes && estavel(cartaParaBanco(antes)) === estavel(cartaParaBanco(carta))) continue
    lista.push({
      carta,
      oQue: resumoDaMudanca(antes, carta),
      porque: MOTIVOS_DO_CODIGO[carta.id] ?? (antes ? 'Ajuste do baralho de referência do código.' : 'Carta nova do baralho de referência do código.'),
    })
  }
  return lista
}

/**
 * A ponte de volta entre o código e o banco, para DEPOIS da estreia.
 *
 * Semear só escreve o que não existe — é o que protege o que foi editado
 * aqui —, então uma carta ajustada em `cards.ts` nunca chegava ao banco, e
 * "rodei o schema e as cartas não mudaram" era exatamente isso: o schema
 * cria tabela e função, não reescreve carta. Esta caixa lista a diferença e
 * leva o que estiver marcado, uma carta por vez, pelo mesmo
 * `admin_salvar_carta` da edição — com histórico e motivo, como qualquer
 * outra mudança. Desmarque a carta que você mudou aqui de propósito: trazer
 * a do código desfaria a sua edição.
 */
function TrazerDoCodigo({ cartas, aoTerminar }: { cartas: ActionCard[]; aoTerminar: (recado: string) => void }) {
  const pendencias = pendenciasDoCodigo(cartas)
  const [fora, setFora] = useState<string[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  if (pendencias.length === 0) return null

  async function trazer() {
    setOcupado(true)
    setErro(null)
    let feitas = 0
    for (const p of pendencias) {
      if (fora.includes(p.carta.id)) continue
      const r = await salvarCarta(p.carta, p.oQue, p.porque)
      if (!r.ok) {
        setErro(`${p.carta.name}: ${r.erro ?? 'não deu para salvar.'}`)
        break
      }
      feitas += 1
    }
    setOcupado(false)
    if (feitas > 0) aoTerminar(`${feitas} ${feitas === 1 ? 'carta veio' : 'cartas vieram'} do código para o banco.`)
  }

  const marcadas = pendencias.length - fora.length
  return (
    <section className={styles.trazer}>
      <h2 className={styles.subtitulo}>O código tem cartas que o banco não tem ({pendencias.length})</h2>
      <p className={styles.dicaSecao}>
        Semear não sobrescreve nada, e rodar o <code>schema.sql</code> não mexe em carta: por isso
        o que mudou em <code>cards.ts</code> não chega sozinho. Desmarque o que você editou aqui de
        propósito — trazer a versão do código desfaria a sua.
      </p>
      <ul className={styles.listaTrazer}>
        {pendencias.map((p) => (
          <li key={p.carta.id}>
            <Check
              marcado={!fora.includes(p.carta.id)}
              onChange={(v) => setFora((f) => (v ? f.filter((id) => id !== p.carta.id) : [...f, p.carta.id]))}
            >
              <b>{p.carta.name}</b> · {p.oQue}
            </Check>
          </li>
        ))}
      </ul>
      {erro ? <p className={styles.erroTopo}>{erro}</p> : null}
      <button
        type="button"
        className={`${buttons.button} ${buttons.primary}`}
        onClick={trazer}
        disabled={ocupado || marcadas === 0}
      >
        {ocupado ? 'Trazendo…' : `Trazer ${marcadas} para o banco`}
      </button>
    </section>
  )
}

export default function LabCartasPage() {
  const [cartas, setCartas] = useState<ActionCard[]>(() => todasAsCartas())
  const [doBanco, setDoBanco] = useState(() => catalogoVeioDoBanco())
  const [emEdicao, setEmEdicao] = useState<ActionCard | null>(null)
  const [criando, setCriando] = useState(false)
  const [efeitos, setEfeitos] = useState<Efeito[]>([])
  const [pedindo, setPedindo] = useState<'salvar' | 'excluir' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [recado, setRecado] = useState<string | null>(null)

  function recarregar() {
    setCartas(todasAsCartas())
    setDoBanco(catalogoVeioDoBanco())
  }

  async function semear() {
    setOcupado(true)
    const r = await semearCatalogo(CARTAS_BASE, EVENTOS_BASE, [MODO_NORMAL])
    setOcupado(false)
    if (!r.ok) return setErro(r.erro ?? 'Não deu para semear.')
    recarregar()
    setRecado('Catálogo semeado. Daqui em diante o banco é quem manda.')
  }

  function abrir(c: ActionCard) {
    setEmEdicao({ ...c })
    setCriando(false)
    setEfeitos(c.efeitos)
    setErro(null)
  }

  function abrirNova() {
    const c = nova()
    setEmEdicao(c)
    setCriando(true)
    setEfeitos(c.efeitos)
    setErro(null)
  }

  /** Os efeitos moram fora de `emEdicao` porque quem os edita é o editor
   *  visual, que trabalha em cima da lista e não do objeto inteiro. */
  function cartaParaGravar(): ActionCard | null {
    return emEdicao ? { ...emEdicao, efeitos } : null
  }

  async function gravar(oQue: string, porque: string) {
    const carta = cartaParaGravar()
    if (!carta) return
    setOcupado(true)
    const r = await salvarCarta(carta, oQue, porque)
    setOcupado(false)
    if (!r.ok) return setErro(r.erro ?? 'Não deu para salvar.')
    recarregar()
    setPedindo(null)
    setEmEdicao(null)
    setRecado(`${carta.name} salva. O baralho subiu de versão.`)
  }

  async function remover(_oQue: string, porque: string) {
    if (!emEdicao) return
    setOcupado(true)
    const r = await excluirDoCatalogo(emEdicao.id, 'acao', porque)
    setOcupado(false)
    if (!r.ok) return setErro(r.erro ?? 'Não deu para remover.')
    recarregar()
    setPedindo(null)
    setEmEdicao(null)
    setRecado('Carta fora do jogo. Quem está com ela na mão termina a partida normalmente.')
  }

  const noJogo = cartas.filter((c) => c.ativa !== false)
  const removidas = cartas.filter((c) => c.ativa === false)

  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>

      <h1 className={styles.titulo}>Cartas de ação</h1>
      <p className={styles.intro}>
        O que a carta faz é uma lista de ações (<code>acoes.ts</code>), inclusive nas marcadas
        como especiais — não existe mais &quot;a regra está no motor&quot;. Editar aqui muda o
        jogo de todo mundo; por isso salvar pede um motivo.{' '}
        <Link href="/lab/eventos">Cartas de evento ficam aqui.</Link>
      </p>

      <Origem doBanco={doBanco} aoSemear={semear} semeando={ocupado} />

      {doBanco ? (
        <ConverterCustos
          cartas={cartas}
          aoTerminar={(r) => {
            recarregar()
            setRecado(r)
          }}
        />
      ) : null}

      {doBanco ? (
        <TrazerDoCodigo
          cartas={cartas}
          aoTerminar={(r) => {
            recarregar()
            setRecado(r)
          }}
        />
      ) : null}

      {recado ? <p className={styles.recado}>{recado}</p> : null}
      {erro && !pedindo ? <p className={styles.erroTopo}>{erro}</p> : null}

      <div className={styles.acoes}>
        <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={abrirNova} disabled={!doBanco}>
          <Plus size={15} aria-hidden /> Carta nova
        </button>
      </div>

      <Grade cartas={noJogo} aoAbrir={abrir} />

      {removidas.length > 0 ? (
        <>
          <h2 className={styles.subtitulo}>Fora do jogo ({removidas.length})</h2>
          <p className={styles.dicaSecao}>
            Não entram em baralho novo nem saem como recompensa. Continuam aqui porque uma run
            antiga pode citá-las, e porque salvar de novo as traz de volta.
          </p>
          <Grade cartas={removidas} aoAbrir={abrir} esmaecida />
        </>
      ) : null}

      {emEdicao ? (
        <Dialogo titulo={criando ? 'Carta nova' : emEdicao.name} onFechar={() => setEmEdicao(null)} largo>
          <div className={styles.previa}>
            <Card card={cartaParaGravar() ?? emEdicao} />
          </div>

          <div className={styles.campos}>
            <label className={comuns.rotulo}>
              Id
              <input
                className={comuns.campo}
                value={emEdicao.id}
                disabled={!criando}
                onChange={(e) => setEmEdicao({ ...emEdicao, id: e.target.value })}
                placeholder="minusculas-com-hifen"
              />
              <span className={comuns.dica}>
                {criando ? 'É a identidade da carta e não muda depois.' : 'O id não muda: é ele que liga a carta às runs já jogadas.'}
              </span>
            </label>

            <label className={comuns.rotulo}>
              Nome
              <input
                className={comuns.campo}
                value={emEdicao.name}
                onChange={(e) => setEmEdicao({ ...emEdicao, name: e.target.value })}
              />
            </label>

          </div>

          <EditorDeCustos
            key={criando ? 'nova' : emEdicao.id}
            carta={emEdicao}
            onChange={(cost, custos) => setEmEdicao((c) => (c ? { ...c, cost, custos } : c))}
          />

          <label className={comuns.rotulo}>
            Classe
            <div className={styles.rolaLado}>
              <Segmentado
                rotulo="Classe da carta"
                opcoes={CLASSES}
                valor={emEdicao.kind ?? 'neutra'}
                onChange={(v) =>
                  setEmEdicao({ ...emEdicao, kind: (v === 'neutra' ? null : v) as ClasseDaCarta })
                }
              />
            </div>
            <span className={comuns.dica}>
              Sem tipo é a carta neutra: nenhum evento de bloqueio a alcança, e ela não entra em
              embalo — jogar uma quebra o que estiver em pé.
            </span>
          </label>

          <label className={comuns.rotulo}>
            Raridade
            <div className={styles.rolaLado}>
              <Segmentado
                rotulo="Raridade da carta"
                opcoes={RARIDADES}
                valor={emEdicao.raridade ?? 'comum'}
                onChange={(v) => setEmEdicao({ ...emEdicao, raridade: v === 'comum' ? undefined : (v as Raridade) })}
              />
            </div>
            <span className={comuns.dica}>
              Quantas cópias cabem na coleção (comum {COPIAS_POR_RARIDADE.comum}, incomum{' '}
              {COPIAS_POR_RARIDADE.incomum}, rara {COPIAS_POR_RARIDADE.rara}) e quão longe a run
              precisa ir para a carta aparecer na recompensa: rara só da semana 4 em diante.
            </span>
          </label>

          <label className={comuns.rotulo}>
            Texto da carta
            <textarea
              className={comuns.campoTexto}
              rows={2}
              value={emEdicao.text}
              onChange={(e) => setEmEdicao({ ...emEdicao, text: e.target.value })}
            />
            <span className={comuns.dica}>
              É o que o jogador lê. Escreva o efeito de verdade — o texto não é lido pelo motor,
              então ele é a única coisa que pode mentir.
            </span>
          </label>

          <div className={styles.campos}>
            {RECURSOS.map((r) => (
              <label key={r} className={comuns.rotulo}>
                {r}
                <input
                  className={comuns.campo}
                  type="number"
                  value={somaDe(cartaParaGravar() ?? emEdicao, r)}
                  onChange={(e) => {
                    const base = cartaParaGravar() ?? emEdicao
                    setEfeitos(mudarRecurso(base, r, Number(e.target.value) || 0).efeitos)
                  }}
                  placeholder="0"
                />
              </label>
            ))}
          </div>

          {/* o efeito que tira dinheiro deixa jogar sem saldo, e a conta só
              chega na sexta, como despejo. Quase sempre o que se quer é o
              custo em dinheiro, que trava a carta na mão */}
          {Number(somaDe(cartaParaGravar() ?? emEdicao, 'dinheiro')) < 0 ? (
            <p className={comuns.aviso}>
              Efeito que tira dinheiro não é custo: a carta sai mesmo sem saldo, e a conta só
              aparece na sexta. Para cobrar, acrescente um custo de dinheiro (“+ Custo”, acima).
            </p>
          ) : null}

          <div className={comuns.rotulo}>
            O que a carta faz
            <span className={comuns.dica}>
              Cada bloco tem um gatilho e uma condição; dentro dele, as ações rodam na ordem.
              Duas fileiras com &quot;só se&quot; opostos é como a Reunião faz coisas diferentes na
              primeira e na segunda vez.
            </span>
          </div>
          <EditorDeEfeitos efeitos={efeitos} aoMudar={setEfeitos} padrao="aoJogar" />
          <EscapeJson
            rotulo="ver como JSON"
            valor={efeitos}
            aoMudar={(v) => { if (Array.isArray(v)) setEfeitos(v as Efeito[]) }}
          />

          <div className={styles.campos}>
            <label className={styles.marca}>
              <input
                type="checkbox"
                checked={emEdicao.starter}
                onChange={(e) => setEmEdicao({ ...emEdicao, starter: e.target.checked })}
              />
              Entra no baralho inicial
            </label>
            <label className={styles.marca}>
              <input
                type="checkbox"
                checked={Boolean(emEdicao.especial)}
                onChange={(e) => setEmEdicao({ ...emEdicao, especial: e.target.checked || undefined })}
              />
              Faz mais do que somar recurso
            </label>
            {emEdicao.starter ? (
              <label className={comuns.rotulo}>
                Cópias no baralho
                <input
                  className={comuns.campo}
                  type="number"
                  min={1}
                  max={10}
                  value={emEdicao.copies ?? 1}
                  onChange={(e) => setEmEdicao({ ...emEdicao, copies: Number(e.target.value) || 1 })}
                />
              </label>
            ) : null}
          </div>

          <div className={comuns.acoesDialogo}>
            {!criando && emEdicao.ativa !== false ? (
              <BotaoExcluir onClick={() => { setErro(null); setPedindo('excluir') }} />
            ) : null}
            <button type="button" className={buttons.button} onClick={() => setEmEdicao(null)}>
              Fechar
            </button>
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              disabled={!emEdicao.id}
              onClick={() => { setErro(null); setPedindo('salvar') }}
            >
              Salvar no banco
            </button>
          </div>
        </Dialogo>
      ) : null}

      {pedindo === 'salvar' && emEdicao ? (
        <PedirMotivo
          titulo={`Salvar ${emEdicao.name}`}
          oQueSugerido={resumoDaMudanca(
            criando ? undefined : cartas.find((c) => c.id === emEdicao.id),
            cartaParaGravar() ?? emEdicao,
          )}
          exemplo="Com o Embalo de grana, Freela → Hora Extra fechava a semana 1 sozinha."
          aoConfirmar={gravar}
          aoFechar={() => setPedindo(null)}
          erro={erro}
          salvando={ocupado}
        />
      ) : null}

      {pedindo === 'excluir' && emEdicao ? (
        <PedirMotivo
          titulo={`Remover ${emEdicao.name}`}
          oQueSugerido="Carta removida do jogo"
          exemplo="Nunca foi jogada em 400 runs: ocupava espaço de recompensa sem dar escolha."
          aoConfirmar={remover}
          aoFechar={() => setPedindo(null)}
          erro={erro}
          salvando={ocupado}
        />
      ) : null}
    </main>
  )
}

function Grade({ cartas, aoAbrir, esmaecida }: {
  cartas: ActionCard[]
  aoAbrir: (c: ActionCard) => void
  esmaecida?: boolean
}) {
  return (
    <div className={`${styles.grade} ${esmaecida ? styles.fantasma : ''}`}>
      {cartas.map((c) => (
        <button key={c.id} type="button" className={styles.celula} onClick={() => aoAbrir(c)}>
          <Card card={c} />
          <span className={styles.rotulo}>
            {c.starter ? `inicial ×${c.copies ?? 1}` : (c.raridade ?? 'comum')}
            {c.kind === null ? ' · sem tipo' : ''}
          </span>
        </button>
      ))}
    </div>
  )
}
