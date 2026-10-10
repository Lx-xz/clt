'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { ENVELOPES, MISSOES, abrirEnvelope, feitasHoje } from '@/game/missoes'
import type { CardId, Collection, TipoEnvelope } from '@/game/types'
import AberturaDeEnvelope, { ChancesDoEnvelope, EnvelopeEmPe } from '../Envelope'
import styles from './Missoes.module.sass'

const ORDEM_DA_BANDEJA: TipoEnvelope[] = ['confidencial', 'pardo', 'comum']

/**
 * As missões do dia e os envelopes por abrir. Mora no início (onde se chega)
 * e no recibo de fim de run (onde a missão acaba de ser cumprida).
 *
 * Cada missão é uma linha: o que fazer, a barra de progresso e, na frente, o
 * envelope que ela dá — clicar nele mostra o que ele pode trazer. Embaixo,
 * a bandeja com os envelopes ganhos e ainda fechados; clicar num deles o
 * abre, em tela cheia.
 *
 * Quem guarda a coleção é quem chama (`onMudar`): no início é o
 * `sincronizar` sem run nova, na mesa é o mesmo da jogada.
 */
export default function Missoes({ colecao, onMudar, cumpridasAgora = [], compacto = false }: {
  colecao: Collection
  onMudar: (c: Collection) => void
  /** As que a partida que acabou de terminar cumpriu: ganham destaque. */
  cumpridasAgora?: string[]
  /** No recibo de fim, só a bandeja: as missões já foram mostradas no início. */
  compacto?: boolean
}) {
  const [abrindo, setAbrindo] = useState<{ tipo: TipoEnvelope; cartas: CardId[]; novas: CardId[] } | null>(null)
  const [chances, setChances] = useState<TipoEnvelope | null>(null)
  const feitas = feitasHoje(colecao)

  function abrir(tipo: TipoEnvelope) {
    const r = abrirEnvelope(colecao, colecao.envelopes.indexOf(tipo))
    if (!r) return
    // a coleção muda ANTES da animação: pular ou fechar no meio não pode
    // perder a carta
    onMudar(r.colecao)
    setAbrindo({ tipo: r.tipo, cartas: r.cartas, novas: r.cartas.filter((id) => !(colecao.tenho[id] > 0)) })
  }

  const naBandeja = ORDEM_DA_BANDEJA.map((tipo) => ({
    tipo,
    quantos: colecao.envelopes.filter((e) => e === tipo).length,
  })).filter((g) => g.quantos > 0)

  return (
    <div className={styles.missoes}>
      {compacto ? null : (
        <ul className={styles.lista}>
          {MISSOES.map((m) => {
            const feita = feitas.includes(m.id)
            return (
              <li
                key={m.id}
                className={`${styles.missao} ${feita ? styles.feita : ''} ${cumpridasAgora.includes(m.id) ? styles.agora : ''}`}
              >
                <div className={styles.texto}>
                  <b>{m.nome}</b>
                  <span>{m.descricao}</span>
                  <span className={styles.progresso}>
                    <span className={styles.barra} role="progressbar" aria-valuemin={0} aria-valuemax={1} aria-valuenow={feita ? 1 : 0}>
                      <span style={{ width: feita ? '100%' : '0%' }} />
                    </span>
                    <span className={styles.conta}>
                      {feita ? <Check size={13} aria-label="feita" /> : null}
                      {feita ? 1 : 0}/1
                    </span>
                  </span>
                </div>
                <EnvelopeEmPe
                  tipo={m.premio}
                  largura={58}
                  className={feita ? styles.envelopeGanho : ''}
                  rotulo={`${ENVELOPES[m.premio].nome}: ver o que ele pode trazer`}
                  onClick={() => setChances(m.premio)}
                />
              </li>
            )
          })}
          <li className={`${styles.missao} ${styles.sempre}`}>
            <div className={styles.texto}>
              <b>Toda partida</b>
              <span>Ganhando ou perdendo, terminar uma partida dá um envelope comum.</span>
            </div>
            <EnvelopeEmPe
              tipo="comum"
              largura={48}
              rotulo={`${ENVELOPES.comum.nome}: ver o que ele pode trazer`}
              onClick={() => setChances('comum')}
            />
          </li>
        </ul>
      )}

      {naBandeja.length > 0 ? (
        <div className={styles.bandeja}>
          <span className={styles.bandejaTitulo}>Para abrir</span>
          <div className={styles.bandejaEnvelopes}>
            {naBandeja.map(({ tipo, quantos }) => (
              <span key={tipo} className={styles.pilha}>
                <EnvelopeEmPe
                  tipo={tipo}
                  largura={64}
                  className={styles.paraAbrir}
                  rotulo={`Abrir o ${ENVELOPES[tipo].nome.toLowerCase()}`}
                  onClick={() => abrir(tipo)}
                />
                {quantos > 1 ? <span className={styles.quantos}>×{quantos}</span> : null}
              </span>
            ))}
          </div>
          <span className={styles.bandejaDica}>Toque num envelope para abrir</span>
        </div>
      ) : compacto ? null : feitas.length === MISSOES.length ? (
        <p className={styles.nota}>Tudo feito por hoje. As missões renovam à meia-noite.</p>
      ) : null}

      {chances ? <ChancesDoEnvelope tipo={chances} onFechar={() => setChances(null)} /> : null}
      {abrindo ? <AberturaDeEnvelope {...abrindo} onFechar={() => setAbrindo(null)} /> : null}
    </div>
  )
}
