'use client'

import { PlayingCard, Sparkles, X, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { avatarAleatorio, vestirParaMostrar, type Avatar as Receita } from '@/data/avatar'
import { getCard } from '@/game/catalogo'
import { COSMETICOS, cosmeticoPorId, type Cosmetico } from '@/game/cosmeticos'
import { TOKENS_POR_RARIDADE } from '@/game/tokens'
import { NOMES_DE_RARIDADE } from '@/game/colecao'
import { ENVELOPES, type FormaDaRecompensa } from '@/game/missoes'
import type { CardId, Raridade, TipoEnvelope } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Avatar from '../Avatar'
import Card from '../Card'
import Dialogo from '../Dialogo'
import { AboboraIcon, TokenIcon } from '../icons'
import { CosmeticoVirando, IconeDoCosmetico } from '../Maleta'
import { useSessaoSeHouver } from '../SessaoGuard'
import { DesenhoDaRecompensa, DURACAO, useAndamento } from '../Recompensa'
import styles from './Envelope.module.sass'

/**
 * O selo do envelope ANTIGO (v0.16–v0.22), que hoje só aparece no museu do
 * lab: os envelopes eram o mesmo envelope em pé, e o que os separava era o
 * selo de cera, na cor da raridade que dava nome ao envelope. O ícone era um
 * só, a carta de baralho: cinco ícones eram cinco coisas para decorar, e a
 * cor já dizia tudo.
 */
export const SELOS: Record<TipoEnvelope, { Icone: LucideIcon; classe: string }> = {
  comum: { Icone: PlayingCard, classe: styles.seloComum },
  pardo: { Icone: PlayingCard, classe: styles.seloPardo },
  confidencial: { Icone: PlayingCard, classe: styles.seloConfidencial },
  epico: { Icone: PlayingCard, classe: styles.seloEpico },
  abobora: { Icone: PlayingCard, classe: styles.seloEpico },
}

/**
 * O envelope que uma partida deu, ABERTO, com as cartas que vieram ao lado
 * — é a linha do recibo. Fechado (ainda na bandeja de quem o ganhou), ele
 * aparece lacrado e sem as cartas: o recibo não estraga a surpresa.
 */
export function EnvelopeComCartas({ tipo, cartas, cosmeticos, fechado = false, retrato, onAbrir }: {
  tipo: TipoEnvelope
  cartas: CardId[]
  cosmeticos?: string[]
  fechado?: boolean
  /** As cartas como eram na run (o replay de uma partida antiga). */
  retrato?: (id: CardId) => ReturnType<typeof getCard>
  /** Fechado e de quem está vendo: o envelope vira o botão de abrir. */
  onAbrir?: () => void
}) {
  const env = ENVELOPES[tipo]
  const carta = retrato ?? getCard
  return (
    <div className={styles.ganho}>
      <ObjetoDaRecompensa
        tipo={tipo}
        aberto={!fechado}
        largura={52}
        className={fechado ? undefined : styles.abertoParado}
        rotulo={fechado && onAbrir ? `Abrir ${env.artigo} ${env.nome.toLowerCase()}` : env.nome}
        onClick={fechado ? onAbrir : undefined}
      />
      <div className={styles.ganhoInfo}>
        <span className={styles.ganhoNome}>{env.nome}</span>
        {fechado ? (
          <p className={styles.ganhoDica}>{onAbrir ? 'Fechado. Toque para abrir.' : 'Ainda fechado.'}</p>
        ) : cartas.length === 0 && !cosmeticos?.length ? (
          <p className={styles.ganhoDica}>Veio vazio: a coleção já estava completa.</p>
        ) : (
          <>
            <div className={styles.ganhoCartas}>
              {cartas.map((id, i) => (
                <Card key={i} card={carta(id)} />
              ))}
            </div>
            {itensDe(cosmeticos).map((c) => (
              <span key={c.id} className={styles.ganhoItem}>
                <IconeDoCosmetico cosmetico={c} size={14} /> + {c.nome}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// a borda da cera não é um círculo: são gotas, como a cera que escorre
// antes de o carimbo descer. Doze ondas, alternando um pouco para fora e
// um pouco para dentro
const BORDA_DA_CERA = (() => {
  const pontos: string[] = []
  const n = 12
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2
    const r = i % 2 ? 17.2 : 19.4
    pontos.push(`${(20 + Math.cos(a) * r).toFixed(2)} ${(20 + Math.sin(a) * r).toFixed(2)}`)
  }
  // as pontas são ligadas por curvas, para a borda ondular e não serrilhar
  let d = `M ${pontos[0]}`
  for (let i = 1; i <= pontos.length; i++) {
    const [x, y] = pontos[i % pontos.length].split(' ').map(Number)
    const [x0, y0] = pontos[i - 1].split(' ').map(Number)
    d += ` Q ${x0.toFixed(2)} ${y0.toFixed(2)} ${((x0 + x) / 2).toFixed(2)} ${((y0 + y) / 2).toFixed(2)}`
  }
  return `${d} Z`
})()

/** O selo de cera: a borda em gotas, o anel que o carimbo afundou e o
 *  ícone no meio, em alto-relevo. Desenhado, e não um círculo com
 *  gradiente: é o que faz ele ler como cera de perto. */
function Cera({ classe, tipo }: { classe: string; tipo: TipoEnvelope }) {
  const { Icone } = SELOS[tipo]
  return (
    <span className={`${styles.selo} ${classe}`}>
      <svg viewBox="0 0 40 40" className={styles.cera}>
        <path d={BORDA_DA_CERA} transform="translate(.6 1.2)" className={styles.ceraSombra} />
        <path d={BORDA_DA_CERA} className={styles.ceraCorpo} />
        <circle cx="20" cy="20" r="12.6" className={styles.ceraAnel} />
        <circle cx="20" cy="20" r="11" className={styles.ceraMiolo} />
        <path d="M 11.5 15 A 10 10 0 0 1 21 9.6" className={styles.ceraBrilho} />
      </svg>
      <Icone />
    </span>
  )
}

/**
 * A recompensa desenhada, parada: o objeto da forma dela (envelope,
 * pacote, maleta ou cofre), fechado ou aberto. Com `onClick`, vira botão.
 * `largura` é a de um envelope antigo nesse lugar: o objeto ocupa um
 * quadrado um pouco maior, da mesma altura que o envelope em pé tinha, e
 * o que abre para cima (a aba, as abas, a porta) passa da caixa sem
 * empurrar nada — quem precisa de lugar em cima é o `abertoParado`.
 */
export function ObjetoDaRecompensa({ tipo, aberto = false, largura = 64, className, rotulo, onClick }: {
  tipo: TipoEnvelope
  aberto?: boolean
  largura?: number
  className?: string
  rotulo?: string
  onClick?: () => void
}) {
  const env = ENVELOPES[tipo]
  const lado = Math.round(largura * 1.3)
  const corpo = <DesenhoDaRecompensa forma={env.forma} t={aberto ? 1 : 0} viewBox="17 19 138 135" className={styles.objetoDesenho} />
  const props = {
    className: `${styles.objeto} ${className ?? ''}`,
    style: { width: lado, height: lado } as React.CSSProperties,
  }
  return onClick ? (
    <button type="button" {...props} onClick={onClick} aria-label={rotulo ?? env.nome}>
      {corpo}
    </button>
  ) : (
    <span {...props} role="img" aria-label={rotulo ?? env.nome}>
      {corpo}
    </span>
  )
}

/** O envelope ANTIGO (v0.16–v0.22), desenhado em pé, só com CSS: costas,
 *  bolso da frente com o V, a aba de cima (que gira para trás ao abrir) e o
 *  selo na ponta da aba. Hoje só o museu do lab o mostra. */
export function EnvelopeAntigo({ tipo, aberto = false, largura = 64, className, rotulo, onClick }: {
  tipo: TipoEnvelope
  aberto?: boolean
  largura?: number
  className?: string
  /** Com `onClick`, ele vira botão — e o rótulo é o que o leitor de tela diz. */
  rotulo?: string
  onClick?: () => void
}) {
  const { classe } = SELOS[tipo]
  const corpo = (
    <>
      <span className={styles.costas} aria-hidden />
      <span className={styles.bolso} aria-hidden />
      <span className={styles.abaSombra} aria-hidden />
      <span className={styles.aba} aria-hidden />
      {/* o selo é desenhado duas vezes e cada cópia mostra uma metade: a de
          cima vai com a aba (no mesmo giro dela), a de baixo fica no bolso.
          Ao abrir, a cera racha no meio, como racharia de verdade */}
      <span className={styles.seloAba} aria-hidden>
        <Cera classe={`${classe} ${styles.metadeCima}`} tipo={tipo} />
      </span>
      <Cera classe={`${classe} ${styles.metadeBaixo}`} tipo={tipo} />
    </>
  )
  const props = {
    className: `${styles.envelope} ${aberto ? styles.aberto : ''} ${className ?? ''}`,
    style: { '--env-w': `${largura}px` } as React.CSSProperties,
  }
  return onClick ? (
    <button type="button" {...props} onClick={onClick} aria-label={rotulo ?? ENVELOPES[tipo].nome}>
      {corpo}
    </button>
  ) : (
    <span {...props} role="img" aria-label={rotulo ?? ENVELOPES[tipo].nome}>
      {corpo}
    </span>
  )
}

const ORDEM: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']

function porcento(x: number): string {
  if (x === 0) return 'não vem'
  const p = x * 100
  return `${p < 1 ? p.toFixed(1) : Math.round(p)}%`
}

/** O que um envelope pode dar: quantas cartas e a chance de cada raridade
 *  POR CARTA. É o popup do envelope das missões — saber o prêmio é metade
 *  da vontade de cumprir. */
export function ChancesDoEnvelope({ tipo, onFechar }: { tipo: TipoEnvelope; onFechar: () => void }) {
  const env = ENVELOPES[tipo]
  const [min, max] = env.cartas
  const itens = env.itens ?? []
  // o resumo, a pedido do autor: quem joga quer saber QUANTO vem e se pode
  // vir cosmético, não a chance de cada quantidade nem a de cada item — essas
  // moram na tabela, e o /lab/envelopes mostra as mil aberturas
  const raridades = ORDEM.filter((r) => env.chances[r] > 0)
  return (
    <Dialogo titulo={env.nome} onFechar={onFechar}>
      <div className={styles.chancesTopo}>
        <ObjetoDaRecompensa tipo={tipo} largura={72} />
        <div>
          <p>{env.origem}</p>
          <p className={styles.chancesQuanto}>
            {max === 0 ? null : <b>{min === max ? `${min} cartas` : `De ${min} a ${max} cartas`}</b>}
            {itens.length > 0 ? (
              <span className={styles.chancesItem}>
                <Sparkles size={13} aria-hidden />
                {env.tema === 'halloween' ? 'Item de Halloween garantido' : itens[0] >= 1 ? 'Cosmético garantido' : 'Chance de vir cosmético'}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <p className={styles.chancesDica}>{max === 0 ? 'A raridade do item:' : 'A raridade de cada carta:'}</p>
      {/* uma barra só, com as cinco raridades lado a lado: o tamanho de cada
          pedaço já é a chance, e a legenda embaixo dá o número */}
      <div className={styles.barraUnica} role="img" aria-label={raridades.map((r) => `${NOMES_DE_RARIDADE[r]} ${porcento(env.chances[r])}`).join(', ')}>
        {raridades.map((r) => (
          <span key={r} className={styles[`chance_${r}`]} style={{ flexGrow: env.chances[r] }} />
        ))}
      </div>
      <ul className={styles.legenda} aria-hidden>
        {raridades.map((r) => (
          <li key={r} className={styles[`chance_${r}`]}>
            <i />
            {NOMES_DE_RARIDADE[r]}
            <b>{porcento(env.chances[r])}</b>
          </li>
        ))}
      </ul>
    </Dialogo>
  )
}

type Fase = 'chegando' | 'esperando' | 'abrindo' | 'revelando' | 'resumo'

/** Quanto segurar o objeto para a abertura rápida, e o passo entre uma
 *  carta e a outra desvirando nela. */
const SEGURAR_MS = 2000
const DESVIRAR_MS = 160

/** Os tempos da abertura. Cada um bate com uma animação do sass; o de abrir
 *  é o de cada objeto (`DURACAO`): o cofre gira o segredo antes da porta. */
const T = { chegada: 650, subir: 900, guardar: 420 }

/**
 * Por onde a carta sai de cada objeto, em pixels do palco (360×560, com o
 * objeto desenhado em 300px encostado embaixo). Ela nasce DENTRO dele, entre
 * a camada de trás e a da frente (`de`, com o tamanho `s0`), sobe, e em
 * `meio` já passou da parede da frente e pula para a frente de tudo. Os
 * números saem do desenho: a carta começa abaixo da boca e menor que ela —
 * maior, ela vazava por baixo do pacote. O cofre abre de FRENTE, então a
 * carta já nasce na frente, no meio da porta aberta.
 */
const SAIDA: Record<FormaDaRecompensa, { de: number; meio: number; s0: number; naFrente?: boolean }> = {
  envelope: { de: 298, meio: 190, s0: 0.58 },
  pacote: { de: 326, meio: 195, s0: 0.45 },
  maleta: { de: 299, meio: 200, s0: 0.5 },
  cofre: { de: 299, meio: 160, s0: 0.45, naFrente: true },
  // a abóbora abre por CIMA: a carta nasce no buraco da tampa
  abobora: { de: 350, meio: 205, s0: 0.42 },
}

function semMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * A abertura de um envelope, em TELA CHEIA e sem popup em volta: o envelope
 * vem para a frente da tela e é ele o popup. As cartas JÁ estão na coleção
 * quando isto aparece (`abrirEnvelope` roda antes): a animação é a hora de
 * ver, e pular ou fechar no meio não perde nada.
 *
 * O ritmo é de quem abre pacote de figurinha, um toque por vez:
 *   chega → toque: a cera estala e a aba abre → a primeira carta sobe de
 *   dentro, virada, e desvira com o brilho da raridade → toque: ela vai para
 *   o lado e sobe a próxima → … → toque: o resumo, com todas.
 *
 * Vai por PORTAL para o `body`: aberto de dentro do recibo de fim, a máscara
 * da nota prenderia o `position: fixed` no tamanho do recibo.
 */
/** Os itens que existem de verdade, na ordem em que vieram. */
function itensDe(ids: readonly string[] = []): Cosmetico[] {
  return ids.map(cosmeticoPorId).filter((c): c is Cosmetico => !!c)
}

/** A ficha em cima da carta (ou do item) que virou token, com o valor. */
function FichaEmCima({ valor }: { valor: number }) {
  return (
    <span className={styles.fichaEmCima} aria-label={`Virou ${valor} token${valor > 1 ? 's' : ''}`}>
      <TokenIcon size={30} />
      <b>+{valor}</b>
    </span>
  )
}

/** O avatar que veste o item: o de quem abre, ou — se ainda é o manequim,
 *  que não veste nada — um sorteado, só para mostrar a peça no corpo. */
function useModelo(): Receita {
  const sessao = useSessaoSeHouver()
  const [modelo] = useState<Receita>(() =>
    sessao?.avatar && sessao.avatar.rosto !== 'manequim' ? sessao.avatar : avatarAleatorio(COSMETICOS.map((c) => c.id)),
  )
  return modelo
}

const vestindo = (modelo: Receita, item: Cosmetico): Receita => vestirParaMostrar(modelo, item.campo, item.valor)

export default function AberturaDeEnvelope({ tipo, cartas, cosmeticos, novas, emToken, onFechar }: {
  tipo: TipoEnvelope
  cartas: CardId[]
  /** Os itens (peças do avatar) que vieram junto: sobem depois das cartas. */
  cosmeticos?: string[]
  /** As que a pessoa não tinha nenhuma cópia antes: ganham o selo "nova". */
  novas: CardId[]
  /** Quais viraram TOKEN (a cópia acima do teto, o item que já tinha), na
   *  ordem de `cartas` e de `cosmeticos` — veja `abrirEnvelope`. */
  emToken?: { cartas: boolean[]; cosmeticos: boolean[] }
  onFechar: () => void
}) {
  const [fase, setFase] = useState<Fase>(semMovimento() ? 'esperando' : 'chegando')
  const [atual, setAtual] = useState(0)
  const [virada, setVirada] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [escala, setEscala] = useState(1)
  const ocupado = useRef(false)
  // a abertura RÁPIDA (v0.31): segurar o objeto por `SEGURAR_MS` vai direto
  // para o resumo, com tudo de costas, e desvira um por um, depressa e sem
  // brilho — só a ficha do token salta. `viradas` é quantas já desviraram
  // (null: a abertura de sempre)
  const [viradas, setViradas] = useState<number | null>(null)
  const [segurando, setSegurando] = useState(false)
  const timerDeSegurar = useRef<ReturnType<typeof setTimeout> | null>(null)
  const segurou = useRef(false)
  const env = ENVELOPES[tipo]
  const abrir = Math.round(DURACAO[env.forma] * 0.9)
  const t = useAndamento(fase === 'abrindo' || fase === 'revelando', DURACAO[env.forma])
  const saida = SAIDA[env.forma]
  // as cartas primeiro, e os itens depois, um por toque, como mais um prêmio
  // os itens que existem de verdade, cada um com a sua marca de token (o
  // índice é o de `cosmeticos`, antes do filtro)
  const itensComToken = (cosmeticos ?? [])
    .map((id, i) => ({ item: cosmeticoPorId(id), token: emToken?.cosmeticos[i] ?? false }))
    .filter((x): x is { item: Cosmetico; token: boolean } => !!x.item)
  const itens = itensComToken.map((x) => x.item)
  const total = cartas.length + itens.length
  /** O valor em tokens da posição `i` (carta, e depois item), ou 0 se ela
   *  entrou na coleção. */
  const tokenDe = (i: number): number => {
    if (i < cartas.length) return emToken?.cartas[i] ? TOKENS_POR_RARIDADE[getCard(cartas[i]).raridade ?? 'comum'] : 0
    const x = itensComToken[i - cartas.length]
    return x?.token ? TOKENS_POR_RARIDADE[x.item.raridade] : 0
  }
  const somaDeTokens = Array.from({ length: total }, (_, i) => tokenDe(i)).reduce((a, b) => a + b, 0)
  const modelo = useModelo()

  // o palco é desenhado em 360×560 e ESCALADO para caber: as animações
  // trabalham em pixels fixos, e é isso que deixa a carta sair da boca do
  // envelope em qualquer tela
  useLayoutEffect(() => {
    // 190 de folga: o título, a fileira das que já saíram e a dica
    const medir = () => setEscala(Math.min(1, (window.innerHeight - 190) / 560, (window.innerWidth - 24) / 360))
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  // trava a página atrás, como o Dialogo — e solta só se fomos nós que travamos
  useEffect(() => {
    const html = document.documentElement
    const jaEstava = html.dataset.popup === 'aberto'
    html.dataset.popup = 'aberto'
    return () => {
      if (!jaEstava) delete html.dataset.popup
    }
  }, [])

  useEffect(() => {
    if (fase !== 'chegando') return
    const t = setTimeout(() => setFase('esperando'), T.chegada)
    return () => clearTimeout(t)
  }, [fase])

  // a carta sobe virada e só desvira quando chega: é o "o que será?" que a
  // abertura inteira existe para dar
  useEffect(() => {
    if (fase !== 'revelando' || guardando) return
    setVirada(false)
    const t = setTimeout(() => setVirada(true), semMovimento() ? 0 : T.subir)
    return () => clearTimeout(t)
  }, [fase, atual, guardando])

  function comecarASegurar() {
    if (fase !== 'esperando') return
    segurou.current = false
    setSegurando(true)
    timerDeSegurar.current = setTimeout(() => {
      segurou.current = true
      setSegurando(false)
      setViradas(0)
      setFase('resumo')
    }, SEGURAR_MS)
  }

  function soltar() {
    if (timerDeSegurar.current) clearTimeout(timerDeSegurar.current)
    timerDeSegurar.current = null
    setSegurando(false)
  }

  useEffect(() => () => soltar(), [])

  // desvira um por um, depressa
  useEffect(() => {
    if (viradas === null || viradas >= total) return
    const t = setTimeout(() => setViradas((v) => (v ?? 0) + 1), viradas === 0 ? 350 : DESVIRAR_MS)
    return () => clearTimeout(t)
  }, [viradas, total])
  /** A posição `i` do resumo já está à mostra. */
  const aMostra = (i: number) => viradas === null || i < viradas

  function avancar() {
    // o toque que termina um "segurar" não abre de novo
    if (segurou.current) {
      segurou.current = false
      return
    }
    if (ocupado.current) return
    if (fase === 'esperando') {
      ocupado.current = true
      setFase('abrindo')
      setTimeout(() => {
        ocupado.current = false
        setFase(total > 0 ? 'revelando' : 'resumo')
      }, semMovimento() ? 0 : abrir)
      return
    }
    if (fase === 'revelando' && virada) {
      if (atual >= total - 1) return setFase('resumo')
      ocupado.current = true
      setGuardando(true)
      setTimeout(() => {
        ocupado.current = false
        // virada volta a false NO MESMO render da troca: senão a próxima
        // carta nasceria desvirada por um quadro, entregando a surpresa
        setVirada(false)
        setGuardando(false)
        setAtual((a) => a + 1)
      }, semMovimento() ? 0 : T.guardar)
    }
  }

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') e.stopPropagation()
      if (e.key === 'Escape') {
        // no meio da rápida, o Esc mostra tudo de uma vez; de novo, fecha
        if (fase === 'resumo' && viradas !== null && viradas < total) setViradas(total)
        else if (fase === 'resumo') onFechar()
        else setFase('resumo')
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (fase === 'resumo') onFechar()
        else avancar()
      }
    }
    // na CAPTURA, e parando ali: a abertura nasce de dentro do recibo, e o
    // Esc que pula a animação também fechava o recibo atrás dela
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  })

  const carta = atual < cartas.length ? getCard(cartas[atual]) : null
  const item = atual >= cartas.length ? (itens[atual - cartas.length] ?? null) : null
  const raridade = carta?.raridade ?? item?.raridade ?? 'comum'
  const tokenAtual = tokenDe(atual)
  const saidas = guardando ? atual + 1 : atual
  const guardadas = cartas.slice(0, Math.min(cartas.length, saidas))
  const itensGuardados = itens.slice(0, Math.max(0, saidas - cartas.length))
  // a fileira cabe na tela: com muitas cartas, elas se sobrepõem (margem
  // negativa) em vez de quebrar a linha e empurrar o palco
  const larguraFileira = typeof window === 'undefined' ? 360 : Math.min(window.innerWidth - 32, 900)
  const sobra =
    guardadas.length > 1 ? Math.min(6, (larguraFileira - guardadas.length * 69) / (guardadas.length - 1)) : 6

  const dica =
    fase === 'esperando'
      ? segurando
        ? 'Segure… abrindo tudo de uma vez'
        : `Toque ${env.artigo === 'a' ? 'na' : 'no'} ${env.nome.toLowerCase()} para abrir · segure para abrir tudo`
      : fase === 'revelando' && virada
        ? atual < total - 1
          ? `Toque para a próxima · ${atual + 1} de ${total}`
          : 'Toque para ver tudo'
        : ' '

  const tela = (
    <div className={`${styles.cortina} ${fase === 'resumo' ? styles.cortinaResumo : ''}`} role="dialog" aria-modal="true" aria-label={env.nome}>
      {fase !== 'resumo' ? (
        <>
          <button type="button" className={styles.pular} onClick={() => setFase('resumo')}>
            Pular <X size={14} aria-hidden />
          </button>
          <div className={styles.titulo}>{env.nome}</div>
          {/* o palco inteiro é o alvo do toque: abrir e passar carta é o
              mesmo gesto, onde quer que o dedo caia */}
          <div
            className={styles.areaToque}
            onClick={avancar}
            onPointerDown={comecarASegurar}
            onPointerUp={soltar}
            onPointerLeave={soltar}
            onPointerCancel={soltar}
            onContextMenu={(e) => e.preventDefault()}
            style={{ '--escala': escala, '--segurar': `${SEGURAR_MS}ms` } as React.CSSProperties}
          >
            <div className={styles.palco}>
              {/* o objeto em duas camadas, e a carta passa entre elas. Sendo
                  segurado, ele treme e a barra embaixo enche */}
              <div className={`${styles.objetoNoPalco} ${styles[`fase_${fase}`]} ${segurando ? styles.segurando : ''}`}>
                <DesenhoDaRecompensa forma={env.forma} t={t} camada="tras" className={styles.camadaTras} />
                <DesenhoDaRecompensa forma={env.forma} t={t} camada="frente" className={styles.camadaFrente} />
              </div>
              {segurando ? <span className={styles.barraDeSegurar} aria-hidden /> : null}
              {fase === 'revelando' && (carta || item) ? (
                <div
                  key={atual}
                  className={`${styles.cartaSaindo} ${item ? styles.itemSaindo : ''} ${virada ? styles.revelada : ''} ${guardando ? styles.guardando : ''} ${tokenAtual && virada ? styles.virandoToken : ''} ${styles[`brilho_${raridade}`]}`}
                  style={
                    {
                      '--de': `${saida.de}px`,
                      '--meio': `${saida.meio}px`,
                      '--s0': saida.s0,
                      '--z0': saida.naFrente ? 6 : 2,
                    } as React.CSSProperties
                  }
                >
                  {carta ? (
                    <>
                      <span className={styles.brilho} aria-hidden />
                      {raridade === 'epica' || raridade === 'lendaria' ? <span className={styles.raios} aria-hidden /> : null}
                      <Card card={carta} faceDown={!virada} className={styles.cartaGrande} />
                      <span className={styles.rotuloRaridade} aria-live="polite">
                        {virada ? (
                          <>
                            {tokenAtual ? (
                              <b className={styles.repetida}>acima do limite</b>
                            ) : novas.includes(carta.id) ? (
                              <b className={styles.nova}>nova</b>
                            ) : null}
                            {NOMES_DE_RARIDADE[raridade]}
                          </>
                        ) : null}
                      </span>
                    </>
                  ) : item ? (
                    <CosmeticoVirando cosmetico={item} avatar={vestindo(modelo, item)} virado={virada} nova={!tokenAtual} />
                  ) : null}
                  {/* a repetida acima do limite: desvira como as outras, e
                      então esmaece e a ficha salta por cima, com o valor */}
                  {tokenAtual && virada ? (
                    <span className={styles.fichaGanha} aria-label={`Virou ${tokenAtual} token${tokenAtual > 1 ? 's' : ''}`}>
                      <TokenIcon size={58} />
                      <b>+{tokenAtual}</b>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className={styles.fileira} aria-label="Cartas que já saíram" style={{ '--sobra': `${sobra}px` } as React.CSSProperties}>
            {guardadas.map((id, i) => (
              <span key={i} className={`${styles.naFileira} ${tokenDe(i) ? styles.emToken : ''}`}>
                <Card card={getCard(id)} className={styles.cartaPequena} />
                {tokenDe(i) ? <TokenIcon size={26} className={styles.fichaPequena} /> : null}
              </span>
            ))}
            {itensGuardados.map((c, i) => (
              <span key={c.id} className={`${styles.naFileira} ${tokenDe(cartas.length + i) ? styles.emToken : ''}`}>
                <span className={styles.itemPequeno}>
                  <Avatar avatar={vestindo(modelo, c)} tamanho={69} />
                  {c.tema === 'halloween' ? <AboboraIcon size={16} className={styles.temaNoItem} /> : null}
                </span>
                {tokenDe(cartas.length + i) ? <TokenIcon size={26} className={styles.fichaPequena} /> : null}
              </span>
            ))}
          </div>
          <p className={styles.dica}>{dica}</p>
        </>
      ) : (
        <div className={`${styles.resumo} ${viradas !== null ? styles.resumoRapido : ''}`}>
          <h2 className={styles.resumoTitulo}>
            O que veio {env.artigo === 'a' ? 'na' : 'no'} {env.nome.toLowerCase()}
          </h2>
          {total === 0 ? (
            <p className={styles.vazio}>Coleção completa: não havia carta que coubesse aqui.</p>
          ) : (
            <div className={styles.resumoCartas}>
              {cartas.map((id, i) => {
                const c = getCard(id)
                const visto = aMostra(i)
                const token = visto ? tokenDe(i) : 0
                return (
                  <div key={i} className={`${styles.resumoItem} ${token ? styles.emToken : ''}`} style={{ '--i': i } as React.CSSProperties}>
                    <Card card={c} faceDown={!visto} className={styles.cartaResumo} />
                    {token ? <FichaEmCima valor={token} /> : null}
                    <span className={`${styles.rotuloResumo} ${styles[`texto_${c.raridade ?? 'comum'}`]}`}>
                      {visto ? (
                        <>
                          {!token && novas.includes(id) && cartas.indexOf(id) === i ? <b className={styles.nova}>nova</b> : null}
                          {NOMES_DE_RARIDADE[c.raridade ?? 'comum']}
                        </>
                      ) : (
                        ' '
                      )}
                    </span>
                  </div>
                )
              })}
              {itens.map((c, i) => {
                const visto = aMostra(cartas.length + i)
                const token = visto ? tokenDe(cartas.length + i) : 0
                return (
                  <div key={c.id} className={`${styles.resumoItem} ${token ? styles.emToken : ''}`} style={{ '--i': cartas.length + i } as React.CSSProperties}>
                    {visto ? (
                      <span className={styles.itemResumo}>
                        <Avatar avatar={vestindo(modelo, c)} tamanho={138} />
                        {c.tema === 'halloween' ? <AboboraIcon size={24} className={styles.temaNoItem} /> : null}
                      </span>
                    ) : (
                      // de costas: o verso da carta, do tamanho do item
                      <span className={`${styles.itemResumo} ${styles.itemDeCostas}`} aria-label="Item ainda virado">
                        <PlayingCard size={34} aria-hidden />
                      </span>
                    )}
                    {token ? <FichaEmCima valor={token} /> : null}
                    <span className={styles.nomeDoItem}>
                      {visto ? (
                        <>
                          <IconeDoCosmetico cosmetico={c} size={15} /> {c.nome}
                        </>
                      ) : (
                        ' '
                      )}
                    </span>
                    <span className={`${styles.rotuloResumo} ${styles[`texto_${c.raridade}`]}`}>
                      {visto ? (
                        <>
                          {token ? null : <b className={styles.nova}>item</b>}
                          {NOMES_DE_RARIDADE[c.raridade]}
                        </>
                      ) : (
                        ' '
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {/* a soma das que viraram token, embaixo de tudo */}
          {somaDeTokens > 0 && (viradas === null || viradas >= total) ? (
            <p className={styles.somaDeTokens} style={{ '--i': total } as React.CSSProperties}>
              <TokenIcon size={28} />
              <span>
                <b>+{somaDeTokens}</b> token{somaDeTokens > 1 ? 's' : ''} das que passaram do limite
              </span>
            </p>
          ) : null}
          <p className={styles.dicaResumo}>
            {itens.length > 0
              ? 'As cartas já estão na coleção, e o item já aparece no editor do avatar.'
              : 'Elas já estão na coleção. Ponha no baralho pela página do Baralho.'}
          </p>
          <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onFechar} autoFocus>
            Continuar
          </button>
        </div>
      )}
    </div>
  )

  return typeof document === 'undefined' ? null : createPortal(tela, document.body)
}
