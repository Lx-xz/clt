'use client'

import { Lock, Play, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NOMES_DE_RARIDADE } from '@/game/colecao'
import { custosDe } from '@/game/custos'
import { comentarioDaCarta, descreverCarta } from '@/game/descricao'
import type { ActionCard, Custo, EventCard } from '@/game/types'
import Card from '../Card'
import { TextoComIcones } from '../Dinheiro'
import { RESOURCE_ICONS, nomeDaClasse } from '../icons'
import styles from './CardDetail.module.sass'

interface CardDetailProps {
  card: ActionCard | EventCard
  /** Custo já ajustado pelo evento do dia, quando houver. */
  cost?: number
  onClose: () => void
  /** Ausente quando a carta não pode ser jogada agora (baralho, sem energia). */
  onPlay?: () => void
  /** Motivo de a carta não poder ser jogada, para o jogador não ficar no escuro. */
  blockedReason?: string
  /** Os custos além da energia já ajustados pelos eventos do dia. */
  custos?: Custo[]
  /** O que a página põe embaixo do texto — no baralho, as cópias e o
   *  histórico da carta. */
  children?: ReactNode
}

/**
 * As duas versões em prova (v0.45, o autor escolhe uma): nas duas a carta
 * FLUTUA sozinha, sem janela, com o brilho da raridade atrás (o mesmo da
 * abertura de recompensa). Muda o que vai ao lado dela:
 * - `janela`: as informações num cartão de papel flutuando;
 * - `solta`: o fundo mais escuro, e as informações escritas direto nele.
 */
type Versao = 'janela' | 'solta'
const CHAVE_VERSAO = 'clt-prova-detalhe'

function lerVersao(): Versao {
  try {
    return localStorage.getItem(CHAVE_VERSAO) === 'solta' ? 'solta' : 'janela'
  } catch {
    return 'janela'
  }
}

export default function CardDetail({ card, cost, custos, onClose, onPlay, blockedReason, children }: CardDetailProps) {
  const evento = 'tone' in card
  const [versao, setVersao] = useState<Versao>('janela')
  useEffect(() => setVersao(lerVersao()), [])
  function escolher(v: Versao) {
    setVersao(v)
    try { localStorage.setItem(CHAVE_VERSAO, v) } catch { /* sem armazenamento, só nesta abertura */ }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Energia = RESOURCE_ICONS.energia
  // no detalhe a descrição automática vai INTEIRA (a carta corta), e o
  // comentário embaixo; o texto antigo de efeito não se repete
  const automatica = !evento
  const comentario = automatica ? comentarioDaCarta(card.text) : null
  const custo = evento ? null : (cost ?? card.cost)
  const raridade = evento ? null : (card.raridade ?? 'comum')
  const outrosCustos = evento ? [] : (custos ?? custosDe(card))
  const brilho = evento ? styles.brilho_evento : styles[`brilho_${raridade}`]
  const comRaios = raridade === 'epica' || raridade === 'lendaria'

  return (
    <div
      className={`${styles.fundo} ${styles[versao]}`}
      role="dialog"
      aria-modal="true"
      aria-label={card.name}
      onClick={onClose}
    >
      <button type="button" className={styles.fechar} onClick={onClose} aria-label="Fechar" title="Fechar (Esc)">
        <X size={22} aria-hidden />
      </button>

      <div className={styles.cena}>
        <div className={`${styles.palco} ${brilho}`} onClick={(e) => e.stopPropagation()}>
          {comRaios ? <span className={styles.raios} aria-hidden /> : null}
          <span className={styles.brilho} aria-hidden />
          <div className={styles.flutua}>
            <Card card={card} cost={custo ?? undefined} custos={custos} className={styles.carta} />
          </div>
        </div>

        <div className={styles.info} onClick={(e) => e.stopPropagation()}>
          <div className={styles.cabeca}>
            <span className={`${styles.sobre} ${brilho}`}>
              {evento ? `evento · ${card.tone}` : `${NOMES_DE_RARIDADE[raridade!]} · ${nomeDaClasse(card.kind)}`}
            </span>
            <h2 className={styles.nome}>{card.name}</h2>
          </div>

          {!evento ? (
            <div className={styles.custos}>
              {/* o mesmo que o carimbo: sem custo, nenhum chip de custo */}
              {custo ? (
                <span className={`${styles.custo} ${styles.custo_energia}`}>
                  <Energia size={16} aria-hidden />
                  <b>{custo}</b>
                  {custo !== card.cost ? <s>{card.cost}</s> : null}
                </span>
              ) : null}
              {outrosCustos.map((c) => {
                const Icone = RESOURCE_ICONS[c.qual]
                return (
                  <span key={c.qual} className={`${styles.custo} ${styles[`custo_${c.qual}`]}`}>
                    <Icone size={16} aria-hidden />
                    <b>{c.quanto}</b>
                  </span>
                )
              })}
              {!custo && outrosCustos.length === 0 ? <span className={styles.semCusto}>sem custo</span> : null}
            </div>
          ) : null}

          <p className={styles.texto}>
            <TextoComIcones texto={automatica ? descreverCarta(card) || card.text : card.text} />
          </p>
          {comentario ? <p className={styles.comentario}>“{comentario}”</p> : null}
          {evento && card.choices ? (
            <ul className={styles.escolhas}>
              {card.choices.map((c) => (
                <li key={c.label}>
                  <strong>{c.label}</strong> <TextoComIcones texto={c.text} />
                </li>
              ))}
            </ul>
          ) : null}
          {blockedReason ? (
            <p className={styles.bloqueio}>
              <Lock size={14} aria-hidden />
              <span><TextoComIcones texto={blockedReason} /></span>
            </p>
          ) : null}
          {children ? <div className={styles.extra}>{children}</div> : null}
          {onPlay ? (
            <button type="button" className={styles.jogar} onClick={onPlay}>
              <Play size={18} fill="currentColor" aria-hidden />
              Jogar
            </button>
          ) : null}
        </div>
      </div>

      {/* a escolha entre as duas versões: some quando o autor decidir */}
      <div className={styles.prova} onClick={(e) => e.stopPropagation()} role="group" aria-label="Versão do detalhe">
        <span>Versão</span>
        <button type="button" aria-pressed={versao === 'janela'} onClick={() => escolher('janela')}>A · janela</button>
        <button type="button" aria-pressed={versao === 'solta'} onClick={() => escolher('solta')}>B · solta</button>
      </div>
    </div>
  )
}
