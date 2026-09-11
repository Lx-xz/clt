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
import {
  excluirDoCatalogo,
  salvarCarta,
  semearCatalogo,
} from '@/data/cartas'
import { CARTAS_BASE } from '@/game/cards'
import { EVENTOS_BASE } from '@/game/events'
import { MODO_NORMAL } from '@/game/regras'
import { catalogoVeioDoBanco, todasAsCartas, todosOsEventos } from '@/game/catalogo'
import type { Acao, Efeito, Recurso } from '@/game/acoes'
import type { ActionCard, ClasseDaCarta } from '@/game/types'
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
 * mexem no bloco de efeito SEM condição (é o que se usa para rebalancear), e
 * o painel de JSON mostra a lista inteira — a única forma de editar carta
 * condicional sem inventar um formulário por tipo de ação.
 */

const CLASSES: { valor: string; rotulo: string }[] = [
  { valor: 'tarefa', rotulo: 'Tarefa' },
  { valor: 'descanso', rotulo: 'Descanso' },
  { valor: 'grana', rotulo: 'Grana' },
  { valor: 'social', rotulo: 'Social' },
  { valor: 'neutra', rotulo: 'Sem tipo' },
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
  if ((antes.copies ?? 1) !== (depois.copies ?? 1)) {
    partes.push(`Cópias ${antes.copies ?? 1} → ${depois.copies ?? 1}`)
  }
  if (JSON.stringify(antes.efeitos) !== JSON.stringify(depois.efeitos)) partes.push('Efeito mudou')
  if (antes.text !== depois.text) partes.push('Texto reescrito')
  return partes.join(' · ') || 'Salva sem mudança de número'
}

export default function LabCartasPage() {
  const [cartas, setCartas] = useState<ActionCard[]>(() => todasAsCartas())
  const [doBanco, setDoBanco] = useState(() => catalogoVeioDoBanco())
  const [emEdicao, setEmEdicao] = useState<ActionCard | null>(null)
  const [criando, setCriando] = useState(false)
  const [jsonEfeitos, setJsonEfeitos] = useState('[]')
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
    setJsonEfeitos(JSON.stringify(c.efeitos, null, 2))
    setErro(null)
  }

  function abrirNova() {
    const c = nova()
    setEmEdicao(c)
    setCriando(true)
    setJsonEfeitos(JSON.stringify(c.efeitos, null, 2))
    setErro(null)
  }

  /** O JSON só entra na carta na hora de salvar: assim o rascunho aceita um
   *  estado intermediário inválido sem apagar o que já estava lá. */
  function cartaParaGravar(): ActionCard | null {
    if (!emEdicao) return null
    try {
      const efeitos = JSON.parse(jsonEfeitos) as Efeito[]
      if (!Array.isArray(efeitos)) return null
      return { ...emEdicao, efeitos }
    } catch {
      return null
    }
  }

  async function gravar(oQue: string, porque: string) {
    const carta = cartaParaGravar()
    if (!carta) return setErro('As ações não são um JSON válido.')
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
  const jsonValido = cartaParaGravar() !== null

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

            <label className={comuns.rotulo}>
              Custo em energia
              <input
                className={comuns.campo}
                type="number"
                min={0}
                max={20}
                value={emEdicao.cost}
                onChange={(e) => setEmEdicao({ ...emEdicao, cost: Number(e.target.value) || 0 })}
              />
            </label>
          </div>

          <label className={comuns.rotulo}>
            Classe
            <Segmentado
              rotulo="Classe da carta"
              opcoes={CLASSES}
              valor={emEdicao.kind ?? 'neutra'}
              onChange={(v) =>
                setEmEdicao({ ...emEdicao, kind: (v === 'neutra' ? null : v) as ClasseDaCarta })
              }
            />
            <span className={comuns.dica}>
              Sem tipo é a carta neutra: nenhum evento de bloqueio a alcança, e ela não entra em
              embalo — jogar uma quebra o que estiver em pé.
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
                    const mudada = mudarRecurso(base, r, Number(e.target.value) || 0)
                    setEmEdicao({ ...emEdicao, efeitos: mudada.efeitos })
                    setJsonEfeitos(JSON.stringify(mudada.efeitos, null, 2))
                  }}
                  placeholder="0"
                />
              </label>
            ))}
          </div>

          <CampoJson
            rotulo="Ações (a carta inteira)"
            valor={jsonEfeitos}
            aoMudar={setJsonEfeitos}
            dica="Lista de blocos { quando?, se?, acoes[] }. É aqui que moram condição, sorteio e escolha de descarte."
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
              disabled={!jsonValido || !emEdicao.id}
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
            {c.starter ? `inicial ×${c.copies ?? 1}` : 'recompensa'}
            {c.kind === null ? ' · sem tipo' : ''}
          </span>
        </button>
      ))}
    </div>
  )
}
