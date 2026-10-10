'use client'

import { CalendarCheck, Mail, Trophy, X, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCard } from '@/game/catalogo'
import { NOMES_DE_RARIDADE } from '@/game/colecao'
import { ENVELOPES } from '@/game/missoes'
import type { CardId, Raridade, TipoEnvelope } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Card from '../Card'
import Dialogo from '../Dialogo'
import styles from './Envelope.module.sass'

/**
 * Os três envelopes são o MESMO envelope em pé; o que os separa é o selo de
 * cera, como num escritório de verdade. Cor e ícone, e nada escrito: o
 * jogador aprende o selo do jeito que aprende a cor de um medidor.
 */
export const SELOS: Record<TipoEnvelope, { Icone: LucideIcon; classe: string }> = {
  comum: { Icone: Mail, classe: styles.seloComum },
  pardo: { Icone: CalendarCheck, classe: styles.seloPardo },
  confidencial: { Icone: Trophy, classe: styles.seloConfidencial },
}

/** O envelope desenhado, em pé. Só CSS: costas, bolso da frente com o V,
 *  a aba de cima (que gira para trás ao abrir) e o selo na ponta da aba. */
export function EnvelopeEmPe({ tipo, aberto = false, largura = 64, className, rotulo, onClick }: {
  tipo: TipoEnvelope
  aberto?: boolean
  largura?: number
  className?: string
  /** Com `onClick`, ele vira botão — e o rótulo é o que o leitor de tela diz. */
  rotulo?: string
  onClick?: () => void
}) {
  const { Icone, classe } = SELOS[tipo]
  const corpo = (
    <>
      <span className={styles.costas} aria-hidden />
      <span className={styles.bolso} aria-hidden />
      <span className={styles.aba} aria-hidden />
      <span className={`${styles.selo} ${classe}`} aria-hidden>
        <Icone />
      </span>
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
  return (
    <Dialogo titulo={env.nome} onFechar={onFechar}>
      <div className={styles.chancesTopo}>
        <EnvelopeEmPe tipo={tipo} largura={72} />
        <p>
          {env.origem}{' '}
          <b>{min === max ? `${min} cartas` : `De ${min} a ${max} cartas`}</b>, que podem vir repetidas.
        </p>
      </div>
      <p className={styles.chancesDica}>A chance de cada carta sair em cada raridade:</p>
      <ul className={styles.chances}>
        {ORDEM.map((r) => (
          <li key={r} className={`${styles.chance} ${styles[`chance_${r}`]}`}>
            <span className={styles.chanceNome}>{NOMES_DE_RARIDADE[r]}</span>
            <span className={styles.chanceBarra}>
              <span style={{ width: `${Math.max(env.chances[r] * 100, env.chances[r] ? 1.5 : 0)}%` }} />
            </span>
            <span className={styles.chanceValor}>{porcento(env.chances[r])}</span>
          </li>
        ))}
      </ul>
    </Dialogo>
  )
}

type Fase = 'chegando' | 'esperando' | 'abrindo' | 'revelando' | 'resumo'

/** Os tempos da abertura. Cada um bate com uma animação do sass. */
const T = { chegada: 650, abrir: 750, subir: 900, guardar: 420 }

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
export default function AberturaDeEnvelope({ tipo, cartas, novas, onFechar }: {
  tipo: TipoEnvelope
  cartas: CardId[]
  /** As que a pessoa não tinha nenhuma cópia antes: ganham o selo "nova". */
  novas: CardId[]
  onFechar: () => void
}) {
  const [fase, setFase] = useState<Fase>(semMovimento() ? 'esperando' : 'chegando')
  const [atual, setAtual] = useState(0)
  const [virada, setVirada] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [escala, setEscala] = useState(1)
  const ocupado = useRef(false)
  const env = ENVELOPES[tipo]

  // o palco é desenhado em 360×560 e ESCALADO para caber: as animações
  // trabalham em pixels fixos, e é isso que deixa a carta sair da boca do
  // envelope em qualquer tela
  useLayoutEffect(() => {
    const medir = () => setEscala(Math.min(1, (window.innerHeight - 150) / 560, (window.innerWidth - 24) / 360))
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

  function avancar() {
    if (ocupado.current) return
    if (fase === 'esperando') {
      ocupado.current = true
      setFase('abrindo')
      setTimeout(() => {
        ocupado.current = false
        setFase(cartas.length > 0 ? 'revelando' : 'resumo')
      }, semMovimento() ? 0 : T.abrir)
      return
    }
    if (fase === 'revelando' && virada) {
      if (atual >= cartas.length - 1) return setFase('resumo')
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
      if (e.key === 'Escape') {
        if (fase === 'resumo') onFechar()
        else setFase('resumo')
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (fase === 'resumo') onFechar()
        else avancar()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const carta = cartas[atual] ? getCard(cartas[atual]) : null
  const raridade = carta?.raridade ?? 'comum'
  const guardadas = cartas.slice(0, guardando ? atual + 1 : atual)

  const dica =
    fase === 'esperando'
      ? 'Toque no envelope para abrir'
      : fase === 'revelando' && virada
        ? atual < cartas.length - 1
          ? `Toque para a próxima · ${atual + 1} de ${cartas.length}`
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
          <div className={styles.areaToque} onClick={avancar} style={{ '--escala': escala } as React.CSSProperties}>
            <div className={styles.palco}>
              <div className={`${styles.envelopeNoPalco} ${styles[`fase_${fase}`]}`}>
                <EnvelopeEmPe tipo={tipo} aberto={fase === 'abrindo' || fase === 'revelando'} largura={190} />
              </div>
              {fase === 'revelando' && carta ? (
                <div
                  key={atual}
                  className={`${styles.cartaSaindo} ${virada ? styles.revelada : ''} ${guardando ? styles.guardando : ''} ${styles[`brilho_${raridade}`]}`}
                >
                  <span className={styles.brilho} aria-hidden />
                  {raridade === 'epica' || raridade === 'lendaria' ? <span className={styles.raios} aria-hidden /> : null}
                  <Card card={carta} faceDown={!virada} className={styles.cartaGrande} />
                  <span className={styles.rotuloRaridade} aria-live="polite">
                    {virada ? (
                      <>
                        {novas.includes(carta.id) ? <b className={styles.nova}>nova</b> : null}
                        {NOMES_DE_RARIDADE[raridade]}
                      </>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          <div className={styles.fileira} aria-label="Cartas que já saíram">
            {guardadas.map((id, i) => (
              <Card key={i} card={getCard(id)} className={styles.cartaPequena} />
            ))}
          </div>
          <p className={styles.dica}>{dica}</p>
        </>
      ) : (
        <div className={styles.resumo}>
          <h2 className={styles.resumoTitulo}>Cartas que vieram no envelope</h2>
          {cartas.length === 0 ? (
            <p className={styles.vazio}>Coleção completa: não havia carta que coubesse no envelope.</p>
          ) : (
            <div className={styles.resumoCartas}>
              {cartas.map((id, i) => {
                const c = getCard(id)
                return (
                  <div key={i} className={styles.resumoItem} style={{ '--i': i } as React.CSSProperties}>
                    <Card card={c} className={styles.cartaResumo} />
                    <span className={`${styles.rotuloResumo} ${styles[`texto_${c.raridade ?? 'comum'}`]}`}>
                      {novas.includes(id) && cartas.indexOf(id) === i ? <b className={styles.nova}>nova</b> : null}
                      {NOMES_DE_RARIDADE[c.raridade ?? 'comum']}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <p className={styles.dicaResumo}>Elas já estão na coleção. Ponha no baralho pela página do Baralho.</p>
          <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onFechar} autoFocus>
            Continuar
          </button>
        </div>
      )}
    </div>
  )

  return typeof document === 'undefined' ? null : createPortal(tela, document.body)
}
