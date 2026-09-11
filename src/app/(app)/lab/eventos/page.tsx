'use client'

import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Card from '@/components/Card'
import Dialogo from '@/components/Dialogo'
import Segmentado from '@/components/Segmentado'
import {
  BotaoExcluir,
  CampoJson,
  Origem,
  PedirMotivo,
  estilosDaBancada as comuns,
} from '../_catalogo/Bancada'
import { excluirDoCatalogo, salvarEvento, semearCatalogo } from '@/data/cartas'
import { CARTAS_BASE } from '@/game/cards'
import { EVENTOS_BASE } from '@/game/events'
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

export default function LabEventosPage() {
  const [eventos, setEventos] = useState<EventCard[]>(() => todosOsEventos())
  const [doBanco, setDoBanco] = useState(() => catalogoVeioDoBanco())
  const [emEdicao, setEmEdicao] = useState<EventCard | null>(null)
  const [criando, setCriando] = useState(false)
  const [jsonEfeitos, setJsonEfeitos] = useState('[]')
  const [jsonEscolhas, setJsonEscolhas] = useState('null')
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
    const r = await semearCatalogo(CARTAS_BASE, EVENTOS_BASE)
    setOcupado(false)
    if (!r.ok) return setErro(r.erro ?? 'Não deu para semear.')
    recarregar()
    setRecado('Catálogo semeado. Daqui em diante o banco é quem manda.')
  }

  function abrir(e: EventCard, ehNovo = false) {
    setEmEdicao({ ...e })
    setCriando(ehNovo)
    setJsonEfeitos(JSON.stringify(e.efeitos ?? [], null, 2))
    setJsonEscolhas(e.choices ? JSON.stringify(e.choices, null, 2) : 'null')
    setErro(null)
  }

  function eventoParaGravar(): EventCard | null {
    if (!emEdicao) return null
    try {
      const efeitos = JSON.parse(jsonEfeitos) as Efeito[]
      const escolhas = JSON.parse(jsonEscolhas) as [EventChoice, EventChoice] | null
      if (!Array.isArray(efeitos)) return null
      if (escolhas !== null && (!Array.isArray(escolhas) || escolhas.length !== 2)) return null
      return { ...emEdicao, efeitos, choices: escolhas ?? undefined }
    } catch {
      return null
    }
  }

  async function gravar(oQue: string, porque: string) {
    const evento = eventoParaGravar()
    if (!evento) return setErro('As ações ou as escolhas não são um JSON válido.')
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
  const valido = eventoParaGravar() !== null

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
                if (tone === 'ambiguo' && jsonEscolhas === 'null') {
                  setJsonEscolhas(JSON.stringify(ESCOLHAS_EM_BRANCO, null, 2))
                }
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

          <CampoJson
            rotulo="Ações ao revelar"
            valor={jsonEfeitos}
            aoMudar={setJsonEfeitos}
            dica="Use quando: 'aposComprar' para mexer na mão (ela só chega depois), e 'fimDoDia' para cobrar no fechamento."
          />

          <CampoJson
            rotulo="Escolhas (null, ou exatamente duas)"
            valor={jsonEscolhas}
            aoMudar={setJsonEscolhas}
            dica="Cada escolha é { label, text, acoes[] }. Com escolhas, as ações acima não rodam sozinhas."
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
              disabled={!valido || !emEdicao.id}
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
