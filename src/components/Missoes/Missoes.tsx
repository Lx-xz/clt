'use client'

import { Circle, CircleCheck, Mail } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ENVELOPES, MISSOES, abrirEnvelope, feitasHoje } from '@/game/missoes'
import type { CardId, Collection, TipoEnvelope } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Envelope from '../Envelope'
import styles from './Missoes.module.sass'

/**
 * As missões do dia e os envelopes por abrir. Mora no início (onde se chega)
 * e no recibo de fim de run (onde a missão acaba de ser cumprida).
 *
 * Quem guarda a coleção é quem chama (`onMudar`): no início é o
 * `sincronizar` sem run nova, na mesa é o mesmo da jogada.
 */
export default function Missoes({ colecao, onMudar, cumpridasAgora = [] }: {
  colecao: Collection
  onMudar: (c: Collection) => void
  /** As que a partida que acabou de terminar cumpriu: ganham destaque. */
  cumpridasAgora?: string[]
}) {
  const [aberto, setAberto] = useState<{ tipo: TipoEnvelope; cartas: CardId[]; novas: CardId[] } | null>(null)
  const feitas = feitasHoje(colecao)
  const fila = colecao.envelopes

  function abrir() {
    const r = abrirEnvelope(colecao)
    if (!r) return
    // a coleção muda ANTES da animação: fechar o popup no meio, ou a aba,
    // não pode perder a carta
    onMudar(r.colecao)
    setAberto({ tipo: r.tipo, cartas: r.cartas, novas: r.cartas.filter((id) => !(colecao.tenho[id] > 0)) })
  }

  return (
    <div className={styles.missoes}>
      <ul className={styles.lista}>
        {MISSOES.map((m) => {
          const feita = feitas.includes(m.id)
          return (
            <li
              key={m.id}
              className={`${styles.missao} ${feita ? styles.feita : ''} ${cumpridasAgora.includes(m.id) ? styles.agora : ''}`}
            >
              {feita ? <CircleCheck size={18} aria-label="feita" /> : <Circle size={18} aria-label="por fazer" />}
              <span className={styles.texto}>
                <b>{m.nome}</b>
                {m.descricao}
              </span>
              <span className={`${styles.premio} ${m.premio === 'confidencial' ? styles.confidencial : ''}`}>
                <Mail size={13} aria-hidden /> {m.premio === 'confidencial' ? 'raro' : 'envelope'}
              </span>
            </li>
          )
        })}
      </ul>

      {fila.length > 0 ? (
        <button type="button" className={`${buttons.button} ${buttons.primary} ${styles.abrir}`} onClick={abrir}>
          <Mail size={16} aria-hidden />
          Abrir o {ENVELOPES[fila[0]].nome.toLowerCase()}
          {fila.length > 1 ? <span className={styles.mais}>+{fila.length - 1}</span> : null}
        </button>
      ) : feitas.length === MISSOES.length ? (
        <p className={styles.nota}>Tudo feito por hoje. As missões renovam à meia-noite.</p>
      ) : null}

      {/* pelo portal: no recibo de fim, isto mora dentro da nota fiscal, e a
          máscara da serrilha (e o drop-shadow da moldura) viram o bloco
          contentor de qualquer `position: fixed` lá dentro — o popup do
          envelope ficaria preso no tamanho do recibo */}
      {aberto ? createPortal(<Envelope {...aberto} onFechar={() => setAberto(null)} />, document.body) : null}
    </div>
  )
}
