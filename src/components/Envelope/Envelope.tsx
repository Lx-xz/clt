'use client'

import { useEffect, useState } from 'react'
import { getCard } from '@/game/catalogo'
import { ENVELOPES } from '@/game/missoes'
import type { CardId, TipoEnvelope } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Card from '../Card'
import Dialogo from '../Dialogo'
import styles from './Envelope.module.sass'

/** Quanto a aba leva para abrir antes de as cartas saírem. */
const ABA_MS = 520
/** O intervalo entre uma carta virar e a próxima. */
const VIRADA_MS = 320

/**
 * O envelope sendo aberto. As cartas JÁ estão na coleção quando isto aparece
 * (`abrirEnvelope` é chamado antes): a animação é só a hora de ver, e fechar
 * no meio dela não perde nada.
 *
 * Três tempos: o envelope fechado, esperando o toque; a aba abrindo; e as
 * cartas saindo de dentro, viradas para baixo, e desvirando uma de cada vez —
 * é o mesmo `faceDown` da mesa, o verso com a estampa da logo.
 */
export default function Envelope({ tipo, cartas, novas, onFechar }: {
  tipo: TipoEnvelope
  cartas: CardId[]
  /** As que a pessoa não tinha nenhuma cópia antes: ganham o selo "nova". */
  novas: CardId[]
  onFechar: () => void
}) {
  const [etapa, setEtapa] = useState<'fechado' | 'abrindo' | 'cartas'>('fechado')
  const [viradas, setViradas] = useState(0)
  const envelope = ENVELOPES[tipo]

  useEffect(() => {
    if (etapa !== 'abrindo') return
    const t = setTimeout(() => setEtapa('cartas'), ABA_MS)
    return () => clearTimeout(t)
  }, [etapa])

  useEffect(() => {
    if (etapa !== 'cartas' || viradas >= cartas.length) return
    // a primeira espera as cartas terminarem de sair do envelope
    const t = setTimeout(() => setViradas((v) => v + 1), viradas === 0 ? 450 : VIRADA_MS)
    return () => clearTimeout(t)
  }, [etapa, viradas, cartas.length])

  const terminou = etapa === 'cartas' && viradas >= cartas.length

  return (
    <Dialogo titulo={envelope.nome} onFechar={onFechar} largo>
      {etapa !== 'cartas' ? (
        <button
          type="button"
          className={`${styles.envelope} ${etapa === 'abrindo' ? styles.abrindo : ''}`}
          onClick={() => setEtapa('abrindo')}
          disabled={etapa === 'abrindo'}
          aria-label={`Abrir o ${envelope.nome.toLowerCase()}`}
        >
          <span className={styles.aba} aria-hidden />
          <span className={styles.frente} aria-hidden />
          {tipo === 'confidencial' ? (
            <span className={styles.carimbo} aria-hidden>Confidencial</span>
          ) : (
            <span className={styles.etiqueta} aria-hidden>RH · interno</span>
          )}
        </button>
      ) : cartas.length === 0 ? (
        <p className={styles.vazio}>Coleção completa: não havia carta que coubesse no envelope.</p>
      ) : (
        <div className={styles.cartas}>
          {cartas.map((id, i) => {
            const carta = getCard(id)
            const virada = i < viradas
            return (
              <div key={id} className={styles.saida} style={{ '--i': i } as React.CSSProperties}>
                <Card card={carta} faceDown={!virada} className={styles.carta} />
                <span className={`${styles.rotulo} ${virada ? styles.visivel : ''}`}>
                  {novas.includes(id) ? <b className={styles.nova}>nova</b> : null}
                  {carta.raridade ?? 'comum'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className={styles.legenda} aria-live="polite">
        {etapa === 'fechado'
          ? `${envelope.descricao} Toque no envelope para abrir.`
          : terminou && cartas.length > 0
            ? `${cartas.length === 1 ? 'A carta entrou' : 'As cartas entraram'} na coleção. Ponha no baralho pela página do Baralho.`
            : ' '}
      </p>

      {terminou ? (
        <div className={styles.acoes}>
          <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onFechar}>
            Guardar
          </button>
        </div>
      ) : null}
    </Dialogo>
  )
}
