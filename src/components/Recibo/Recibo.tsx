'use client'

import { Check, Medal, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { Avatar as Receita } from '@/data/avatar'
import { MISSOES, abrirEnvelope } from '@/game/missoes'
import type { CardId, Collection, EnvelopeGanho, TipoEnvelope } from '@/game/types'
import Avatar, { humorDoEstresse } from '../Avatar'
import Dinheiro from '../Dinheiro'
import AberturaDeEnvelope, { EnvelopeComCartas, EnvelopeEmPe } from '../Envelope'
import styles from './Recibo.module.sass'

export type Desfecho = 'vitoria' | 'burnout' | 'demissao' | 'despejo' | 'abandono'

export const FIM: Record<Desfecho, { title: string; text: string }> = {
  vitoria: {
    title: 'Mês fechado',
    text: 'Quatro semanas, ainda empregado e com as contas pagas.',
  },
  burnout: {
    title: 'Burnout',
    text: 'O estresse chegou a 10. O corpo cobrou antes do banco.',
  },
  demissao: {
    title: 'Demissão',
    text: 'Três advertências. O RH marcou uma conversa rápida.',
  },
  despejo: { title: 'Despejo', text: 'As contas de sexta não fecharam.' },
  abandono: { title: 'Pediu demissão', text: 'Largou o mês no meio.' },
}

/** O que o recibo precisa saber da partida. Tudo que não é o desfecho e o
 *  dinheiro é opcional: a partida gravada antes de um campo existir mostra
 *  o recibo sem a linha dele, em vez de uma linha mentindo zero. */
export interface DadosDoRecibo {
  outcome: Desfecho
  dias: number
  semana?: number
  cartasJogadas?: number | null
  dinheiro: number
  estresse?: number | null
  estresseMaximo?: number
  /** Quando acabou (ISO). */
  data?: string
  envelopes?: EnvelopeGanho[]
  conquistas?: { id: string; nome: string; descricao: string }[]
}

const TIPOS: TipoEnvelope[] = ['comum', 'pardo', 'confidencial', 'epico', 'lendario']

/** Os envelopes como vêm do banco (`details.envelopes`, jsonb cru): o que
 *  não tiver formato de envelope fica de fora, como `lerColecao` faz. */
export function lerEnvelopesGanhos(bruto: unknown): EnvelopeGanho[] {
  if (!Array.isArray(bruto)) return []
  return bruto.flatMap((e): EnvelopeGanho[] => {
    if (!e || typeof e !== 'object') return []
    const o = e as Record<string, unknown>
    if (!TIPOS.includes(o.tipo as TipoEnvelope)) return []
    return [
      {
        tipo: o.tipo as TipoEnvelope,
        id: typeof o.id === 'string' ? o.id : '',
        cartas: Array.isArray(o.cartas) ? o.cartas.filter((c): c is string => typeof c === 'string') : [],
        ...(typeof o.missao === 'string' ? { missao: o.missao } : {}),
      },
    ]
  })
}

/** A linha de uma lista de partidas (`meus_jogos`, `jogos_do_jogador`)
 *  como dados de recibo. */
export function dadosDaLinha(j: {
  outcome: string
  day: number
  money: number
  week_reached: number
  ended_at: string
  cards_played?: number | null
  estresse?: number | null
  envelopes?: unknown
}): DadosDoRecibo {
  return {
    outcome: (j.outcome in FIM ? j.outcome : 'burnout') as Desfecho,
    dias: j.day,
    semana: j.week_reached,
    dinheiro: j.money,
    data: j.ended_at,
    cartasJogadas: j.cards_played ?? null,
    estresse: j.estresse ?? null,
    envelopes: lerEnvelopesGanhos(j.envelopes),
  }
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

/**
 * O recibo de uma partida: o mesmo na mesa (dentro da nota do `Dialogo`),
 * no replay e, resumido, no perfil e na lista de jogos. Eram três telas
 * contando o fim da mesma partida de três jeitos — e o replay nem contava o
 * que a partida deu.
 *
 * `papel` desenha a nota fiscal em volta (o replay, que não está num
 * popup). Com `colecao` e `onMudarColecao`, o envelope que ainda está
 * fechado na coleção de quem vê é um botão de abrir; sem eles, aparece
 * lacrado e sem as cartas — o recibo não estraga a surpresa de ninguém.
 */
export default function Recibo({
  dados,
  avatar,
  papel = false,
  colecao,
  onMudarColecao,
  children,
}: {
  dados: DadosDoRecibo
  avatar?: Receita
  papel?: boolean
  colecao?: Collection | null
  onMudarColecao?: (c: Collection) => void
  children?: React.ReactNode
}) {
  const [abrindo, setAbrindo] = useState<{
    tipo: TipoEnvelope
    cartas: CardId[]
    novas: CardId[]
  } | null>(null)
  const fim = FIM[dados.outcome]
  const envelopes = dados.envelopes ?? []
  const missoes = envelopes.flatMap((e) => MISSOES.filter((m) => m.id === e.missao).map((m) => m.nome))
  const fechados = new Set((colecao?.envelopes ?? []).map((e) => e.id).filter(Boolean))

  function abrir(id: string) {
    if (!colecao || !onMudarColecao) return
    const r = abrirEnvelope(
      colecao,
      colecao.envelopes.findIndex((e) => e.id === id),
    )
    if (!r) return
    // a coleção muda ANTES da animação: pular ou fechar no meio não perde carta
    onMudarColecao(r.colecao)
    setAbrindo({
      tipo: r.tipo,
      cartas: r.cartas,
      novas: r.cartas.filter((c) => !(colecao.tenho[c] > 0)),
    })
  }

  const humor =
    dados.outcome === 'vitoria'
      ? ('vitoria' as const)
      : dados.estresse != null
        ? humorDoEstresse(dados.estresse, dados.estresseMaximo ?? 10)
        : undefined

  const miolo = (
    <>
      {papel ? <h2 className={styles.titulo}>{fim.title}</h2> : null}
      {avatar ? (
        // a marca é por onde o compartilhar acha o desenho para pôr na imagem
        <div className={styles.avatar} data-recibo-avatar>
          <Avatar avatar={avatar} tamanho={88} humor={humor} />
        </div>
      ) : null}
      <p className={styles.texto}>{fim.text}</p>
      <ol className={styles.passos}>
        {dados.data ? (
          <li className={styles.passo}>
            <span className={styles.rot}>Data</span>
            <span className={styles.val}>{formatarData(dados.data)}</span>
          </li>
        ) : null}
        <li className={styles.passo}>
          <span className={styles.rot}>Dias trabalhados</span>
          <span className={styles.val}>{dados.dias}</span>
        </li>
        {dados.cartasJogadas != null ? (
          <li className={styles.passo}>
            <span className={styles.rot}>Cartas jogadas</span>
            <span className={styles.val}>{dados.cartasJogadas}</span>
          </li>
        ) : null}
        {dados.estresse != null ? (
          <li className={styles.passo}>
            <span className={styles.rot}>Estresse no fim</span>
            <span className={styles.val}>
              {dados.estresse}/{dados.estresseMaximo ?? 10}
            </span>
          </li>
        ) : null}
        <li className={`${styles.passo} ${styles.total}`}>
          <span className={styles.rot}>Pontuação final</span>
          <Dinheiro className={styles.val} valor={dados.dinheiro} />
        </li>
      </ol>

      {envelopes.length > 0 ? (
        <section className={styles.secao}>
          <p className={styles.secaoTitulo}>Envelopes</p>
          {missoes.length > 0 ? <p className={styles.missoes}>Missão cumprida: {missoes.join(' e ')}</p> : null}
          {envelopes.map((e) => {
            const fechado = fechados.has(e.id)
            return (
              <EnvelopeComCartas
                key={e.id}
                tipo={e.tipo}
                cartas={e.cartas}
                fechado={fechado}
                onAbrir={fechado && onMudarColecao ? () => abrir(e.id) : undefined}
              />
            )
          })}
        </section>
      ) : null}

      {dados.conquistas && dados.conquistas.length > 0 ? (
        <ul className={styles.conquistas}>
          {dados.conquistas.map((c) => (
            <li key={c.id}>
              <Medal size={16} aria-hidden />
              <span>
                <b>Conquista: {c.nome}</b>
                {c.descricao}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {children}
      {abrindo ? <AberturaDeEnvelope {...abrindo} onFechar={() => setAbrindo(null)} /> : null}
    </>
  )

  if (!papel) return <div className={styles.recibo}>{miolo}</div>
  return (
    <div className={styles.moldura}>
      <div className={`${styles.recibo} ${styles.nota}`}>{miolo}</div>
    </div>
  )
}

/**
 * O recibo resumido: a última partida no perfil e cada partida na lista de
 * jogos. Leva ao replay, onde está o recibo inteiro. É o "bilhete" que o
 * início mostrava antes de ficar limpo.
 */
export function ReciboResumido({ id, dados, className }: { id: number; dados: DadosDoRecibo; className?: string }) {
  const fim = FIM[dados.outcome]
  return (
    // a sombra mora no invólucro: a máscara da serrilha cortaria o
    // `drop-shadow` do próprio recibo
    <div className={`${styles.resumidoMoldura} ${className ?? ''}`}>
      <Link className={styles.resumido} href={`/meus-jogos/detalhe?id=${id}`}>
        <span className={`${styles.selo} ${styles[dados.outcome]}`}>{fim.title}</span>
        {dados.data ? <span className={styles.resumidoData}>{formatarData(dados.data)}</span> : null}
        <span className={styles.resumidoLinha}>
          <span>
            Semana {dados.semana ?? Math.ceil(dados.dias / 5)} · dia {dados.dias}
          </span>
          {dados.estresse != null ? <span>estresse {dados.estresse}</span> : null}
          {dados.cartasJogadas != null ? <span>{dados.cartasJogadas} jogadas</span> : null}
        </span>
        {dados.envelopes && dados.envelopes.length > 0 ? (
          <span className={styles.resumidoEnvelopes}>
            {dados.envelopes.map((e) => (
              <EnvelopeEmPe key={e.id} tipo={e.tipo} largura={22} />
            ))}
            <span>+{plural(dados.envelopes.reduce((n, e) => n + e.cartas.length, 0), 'carta', 'cartas')}</span>
          </span>
        ) : null}
        <span className={styles.resumidoTotal}>
          <span>Total</span>
          <Dinheiro valor={dados.dinheiro} />
        </span>
      </Link>
    </div>
  )
}

/**
 * O botão de compartilhar o recibo: gera a imagem e abre a janela de
 * compartilhar do aparelho (no computador, baixa a imagem e copia a frase).
 * `className` e `soIcone` são para caber na fila de botões da mesa.
 */
export function BotaoCompartilhar({ dados, className, soIcone = false }: {
  dados: DadosDoRecibo
  className?: string
  soIcone?: boolean
}) {
  const [estado, setEstado] = useState<'parado' | 'gerando' | 'baixado' | 'erro'>('parado')

  async function compartilhar() {
    setEstado('gerando')
    try {
      // só aqui, no clique: o desenho em canvas não precisa ir no pacote de
      // quem nunca compartilha
      const { compartilharRecibo } = await import('./compartilhar')
      const r = await compartilharRecibo(dados, document.querySelector<SVGSVGElement>('[data-recibo-avatar] svg'))
      setEstado(r === 'baixado' ? 'baixado' : 'parado')
    } catch {
      setEstado('erro')
    }
  }

  const rotulo =
    estado === 'gerando'
      ? 'Gerando a imagem…'
      : estado === 'baixado'
        ? 'Imagem baixada, texto copiado'
        : estado === 'erro'
          ? 'Não deu para gerar a imagem'
          : 'Compartilhar'
  return (
    <button
      type="button"
      className={className}
      onClick={compartilhar}
      disabled={estado === 'gerando'}
      aria-label={rotulo}
      title={rotulo}
    >
      {estado === 'baixado' ? <Check size={18} aria-hidden /> : <Share2 size={18} aria-hidden />}
      {soIcone ? null : <span>{rotulo}</span>}
      <span className={styles.vivo} aria-live="polite">
        {estado === 'baixado' || estado === 'erro' ? rotulo : ''}
      </span>
    </button>
  )
}
