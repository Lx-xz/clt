'use client'

import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Card from '@/components/Card'
import Check from '@/components/Check'
import Dialogo from '@/components/Dialogo'
import Segmentado from '@/components/Segmentado'
import {
  BotaoExcluir,
  Origem,
  PedirMotivo,
  estilosDaBancada as comuns,
  estavel,
} from '../_catalogo/Bancada'
import { EditorDeEfeitos, EditorDeEscolhas, EscapeJson } from '../_catalogo/EditorDeAcoes'
import { eventoParaBanco, excluirDoCatalogo, salvarEvento, semearCatalogo } from '@/data/cartas'
import { CARTAS_BASE } from '@/game/cards'
import { EVENTOS_BASE, MOTIVOS_DOS_EVENTOS } from '@/game/events'
import { MODO_NORMAL } from '@/game/regras'
import { catalogoVeioDoBanco, todosOsEventos } from '@/game/catalogo'
import type { Efeito } from '@/game/acoes'
import type { EventCard, EventChoice, EventTone } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from '../cartas/cartas.module.sass'

/**
 * A bancada dos eventos, irmã da das cartas e com as mesmas três garantias:
 * nada é apagado, a run guarda o próprio retrato, e não dá para mudar em
 * silêncio.
 *
 * O que muda é a forma. O evento não tem custo nem classe, tem TOM (é a cor
 * com que ele chega na mesa) e pode ter duas ESCOLHAS — e a escolha carrega
 * as próprias ações, então um evento ambíguo é dois efeitos que o jogador
 * desempata, não um `if` no motor.
 */

const TONS: { valor: string; rotulo: string }[] = [
  { valor: 'negativo', rotulo: 'Negativo' },
  { valor: 'positivo', rotulo: 'Positivo' },
  { valor: 'ambiguo', rotulo: 'Ambíguo' },
]

function novo(): EventCard {
  return { id: '', name: 'Evento Novo', tone: 'negativo', text: '', efeitos: [{ acoes: [] }] }
}

const ESCOLHAS_EM_BRANCO: [EventChoice, EventChoice] = [
  { label: 'Aceitar', text: '', acoes: [] },
  { label: 'Recusar', text: '', acoes: [] },
]

/** O mesmo resumo automático da bancada das cartas: o número é da máquina, o
 *  motivo é de quem está mudando. */
function resumoDaMudanca(antes: EventCard | undefined, depois: EventCard): string {
  if (!antes) return 'Evento novo'
  const partes: string[] = []
  if (antes.name !== depois.name) partes.push(`Nome: ${antes.name} → ${depois.name}`)
  if (antes.tone !== depois.tone) partes.push(`Tom: ${antes.tone} → ${depois.tone}`)
  if (Boolean(antes.choices) !== Boolean(depois.choices)) {
    partes.push(depois.choices ? 'Passou a perguntar' : 'Deixou de perguntar')
  }
  if (JSON.stringify(antes.efeitos) !== JSON.stringify(depois.efeitos)) partes.push('Efeito mudou')
  if (JSON.stringify(antes.choices) !== JSON.stringify(depois.choices)) partes.push('Escolhas mudaram')
  if (antes.text !== depois.text) partes.push('Texto reescrito')
  return partes.join(' · ') || 'Salvo sem mudança de número'
}

/**
 * O mesmo "trazer do código" das cartas, para os eventos: semear só escreve
 * o que não existe, então evento novo ou mudado em `events.ts` nunca chega
 * sozinho a um banco já semeado. Lista a diferença e leva o que estiver
 * marcado, pelo mesmo `admin_salvar_evento` da edição, com histórico e
 * motivo. Evento tirado do sorteio (`ativa = false`) fica de fora.
 */
function TrazerEventosDoCodigo({ eventos, aoTerminar }: { eventos: EventCard[]; aoTerminar: (recado: string) => void }) {
  const banco = new Map(eventos.map((e) => [e.id, e]))
  const pendencias = EVENTOS_BASE.flatMap((e) => {
    const antes = banco.get(e.id)
    if (antes?.ativa === false) return []
    if (antes && estavel(eventoParaBanco(antes)) === estavel(eventoParaBanco(e))) return []
    return [{
      evento: e,
      oQue: antes ? 'Ajuste vindo do código' : 'Evento novo',
      porque: MOTIVOS_DOS_EVENTOS[e.id] ?? (antes ? 'Ajuste do baralho de referência do código.' : 'Evento novo do baralho de referência do código.'),
    }]
  })
  const [fora, setFora] = useState<string[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  if (pendencias.length === 0) return null

  async function trazer() {
    setOcupado(true)
    setErro(null)
    let feitos = 0
    for (const p of pendencias) {
      if (fora.includes(p.evento.id)) continue
      const r = await salvarEvento(p.evento, p.oQue, p.porque)
      if (!r.ok) {
        setErro(`${p.evento.name}: ${r.erro ?? 'não deu para salvar.'}`)
        break
      }
      feitos += 1
    }
    setOcupado(false)
    if (feitos > 0) aoTerminar(`${feitos} ${feitos === 1 ? 'evento veio' : 'eventos vieram'} do código para o banco.`)
  }

  const marcados = pendencias.length - fora.length
  return (
    <section className={styles.trazer}>
      <h2 className={styles.subtitulo}>O código tem eventos que o banco não tem ({pendencias.length})</h2>
      <p className={styles.dicaSecao}>
        Desmarque o que você editou aqui de propósito — trazer a versão do código desfaria a sua.
      </p>
      <ul className={styles.listaTrazer}>
        {pendencias.map((p) => (
          <li key={p.evento.id}>
            <Check
              marcado={!fora.includes(p.evento.id)}
              onChange={(v) => setFora((f) => (v ? f.filter((id) => id !== p.evento.id) : [...f, p.evento.id]))}
            >
              <b>{p.evento.name}</b> · {p.oQue}
            </Check>
          </li>
        ))}
      </ul>
      {erro ? <p className={styles.erroTopo}>{erro}</p> : null}
      <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={trazer} disabled={ocupado || marcados === 0}>
        {ocupado ? 'Trazendo…' : `Trazer ${marcados} para o banco`}
      </button>
    </section>
  )
}

export default function LabEventosPage() {
  const [eventos, setEventos] = useState<EventCard[]>(() => todosOsEventos())
  const [doBanco, setDoBanco] = useState(() => catalogoVeioDoBanco())
  const [emEdicao, setEmEdicao] = useState<EventCard | null>(null)
  const [criando, setCriando] = useState(false)
  const [efeitos, setEfeitos] = useState<Efeito[]>([])
  const [escolhas, setEscolhas] = useState<[EventChoice, EventChoice] | null>(null)
  const [pedindo, setPedindo] = useState<'salvar' | 'excluir' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [recado, setRecado] = useState<string | null>(null)

  function recarregar() {
    setEventos(todosOsEventos())
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

  function abrir(e: EventCard, ehNovo = false) {
    setEmEdicao({ ...e })
    setCriando(ehNovo)
    setEfeitos(e.efeitos ?? [])
    setEscolhas(e.choices ?? null)
    setErro(null)
  }

  function eventoParaGravar(): EventCard | null {
    return emEdicao ? { ...emEdicao, efeitos, choices: escolhas ?? undefined } : null
  }

  async function gravar(oQue: string, porque: string) {
    const evento = eventoParaGravar()
    if (!evento) return
    setOcupado(true)
    const r = await salvarEvento(evento, oQue, porque)
    setOcupado(false)
    if (!r.ok) return setErro(r.erro ?? 'Não deu para salvar.')
    recarregar()
    setPedindo(null)
    setEmEdicao(null)
    setRecado(`${evento.name} salvo. O baralho subiu de versão.`)
  }

  async function remover(_oQue: string, porque: string) {
    if (!emEdicao) return
    setOcupado(true)
    const r = await excluirDoCatalogo(emEdicao.id, 'evento', porque)
    setOcupado(false)
    if (!r.ok) return setErro(r.erro ?? 'Não deu para remover.')
    recarregar()
    setPedindo(null)
    setEmEdicao(null)
    setRecado('Evento fora do sorteio. As runs que o citam continuam legíveis.')
  }

  const noJogo = eventos.filter((e) => e.ativa !== false)
  const removidos = eventos.filter((e) => e.ativa === false)

  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>

      <h1 className={styles.titulo}>Cartas de evento</h1>
      <p className={styles.intro}>
        Um por dia, sorteado, virado para baixo até o jogador revelar. O ambíguo não faz nada
        sozinho: quem carrega o efeito é cada escolha.{' '}
        <Link href="/lab/cartas">Cartas de ação ficam aqui.</Link>
      </p>

      <Origem doBanco={doBanco} aoSemear={semear} semeando={ocupado} />

      {doBanco ? (
        <TrazerEventosDoCodigo
          eventos={eventos}
          aoTerminar={(r) => {
            recarregar()
            setRecado(r)
          }}
        />
      ) : null}

      {recado ? <p className={styles.recado}>{recado}</p> : null}
      {erro && !pedindo ? <p className={styles.erroTopo}>{erro}</p> : null}

      <div className={styles.acoes}>
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          onClick={() => abrir(novo(), true)}
          disabled={!doBanco}
        >
          <Plus size={15} aria-hidden /> Evento novo
        </button>
      </div>

      <Grade eventos={noJogo} aoAbrir={(e) => abrir(e)} />

      {removidos.length > 0 ? (
        <>
          <h2 className={styles.subtitulo}>Fora do sorteio ({removidos.length})</h2>
          <p className={styles.dicaSecao}>
            Não caem mais em dia nenhum. Continuam aqui porque uma run antiga pode citá-los no
            replay, e porque salvar de novo os traz de volta.
          </p>
          <Grade eventos={removidos} aoAbrir={(e) => abrir(e)} esmaecida />
        </>
      ) : null}

      {emEdicao ? (
        <Dialogo titulo={criando ? 'Evento novo' : emEdicao.name} onFechar={() => setEmEdicao(null)} largo>
          <div className={styles.previa}>
            <Card card={eventoParaGravar() ?? emEdicao} />
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

          <label className={comuns.rotulo}>
            Tom
            <Segmentado
              rotulo="Tom do evento"
              opcoes={TONS}
              valor={emEdicao.tone}
              onChange={(v) => {
                const tone = v as EventTone
                setEmEdicao({ ...emEdicao, tone })
                // ambíguo sem escolha não pergunta nada e trava o dia: o par
                // em branco entra junto com o tom, não depois
                if (tone === 'ambiguo' && !escolhas) setEscolhas(ESCOLHAS_EM_BRANCO)
              }}
            />
            <span className={comuns.dica}>
              Só muda a cor e o ícone com que o evento chega. Quem decide se ele pergunta é ter
              escolhas ou não.
            </span>
          </label>

          <label className={comuns.rotulo}>
            Texto do evento
            <textarea
              className={comuns.campoTexto}
              rows={2}
              value={emEdicao.text}
              onChange={(e) => setEmEdicao({ ...emEdicao, text: e.target.value })}
            />
          </label>

          <div className={comuns.rotulo}>
            O que o evento faz
            <span className={comuns.dica}>
              &quot;Depois da mão chegar&quot; é o gatilho de quem mexe na mão: ela só existe
              depois. &quot;No fim do dia&quot; é o de quem cobra no fechamento, com a cota já
              conhecida.
            </span>
          </div>
          <EditorDeEfeitos efeitos={efeitos} aoMudar={setEfeitos} padrao="aoRevelar" />

          <div className={comuns.rotulo}>
            Escolhas
            <span className={comuns.dica}>
              Com escolhas, as ações acima não rodam sozinhas — quem decide é o jogador.
            </span>
          </div>
          <EditorDeEscolhas escolhas={escolhas} aoMudar={setEscolhas} />

          <EscapeJson
            rotulo="ver como JSON"
            valor={{ efeitos, escolhas }}
            aoMudar={(v) => {
              const o = v as { efeitos?: Efeito[]; escolhas?: [EventChoice, EventChoice] | null }
              if (Array.isArray(o?.efeitos)) setEfeitos(o.efeitos)
              if (o?.escolhas === null || (Array.isArray(o?.escolhas) && o.escolhas.length === 2)) {
                setEscolhas(o.escolhas ?? null)
              }
            }}
          />

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
            criando ? undefined : eventos.find((e) => e.id === emEdicao.id),
            eventoParaGravar() ?? emEdicao,
          )}
          exemplo="Caía cedo demais: o jogador ainda não tinha baralho para reagir."
          aoConfirmar={gravar}
          aoFechar={() => setPedindo(null)}
          erro={erro}
          salvando={ocupado}
        />
      ) : null}

      {pedindo === 'excluir' && emEdicao ? (
        <PedirMotivo
          titulo={`Remover ${emEdicao.name}`}
          oQueSugerido="Evento removido do jogo"
          exemplo="Repetia o efeito do Trânsito sem trazer nada novo para a decisão do dia."
          aoConfirmar={remover}
          aoFechar={() => setPedindo(null)}
          erro={erro}
          salvando={ocupado}
        />
      ) : null}
    </main>
  )
}

function Grade({ eventos, aoAbrir, esmaecida }: {
  eventos: EventCard[]
  aoAbrir: (e: EventCard) => void
  esmaecida?: boolean
}) {
  return (
    <div className={`${styles.grade} ${esmaecida ? styles.fantasma : ''}`}>
      {eventos.map((e) => (
        <button key={e.id} type="button" className={styles.celula} onClick={() => aoAbrir(e)}>
          <Card card={e} />
          <span className={styles.rotulo}>{e.choices ? 'pergunta' : e.tone}</span>
        </button>
      ))}
    </div>
  )
}
