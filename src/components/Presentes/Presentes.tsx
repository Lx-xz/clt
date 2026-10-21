'use client'

import { Gift } from 'lucide-react'
import { useEffect, useState } from 'react'
import { meusPresentes, receberPresente, type Presente } from '@/data/presentes'
import { abrirEnvelope, type Abertura } from '@/game/missoes'
import type { CardId, Collection } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Dialogo from '../Dialogo'
import AberturaDeEnvelope from '../Envelope'
import styles from './Presentes.module.sass'

/**
 * O presente do admin, na tela de quem o recebeu (v0.40). Mora no início,
 * que é onde a coleção já foi lida do banco: aberto antes disso, ele
 * subiria uma coleção velha por cima da de outro aparelho.
 *
 * O aviso diz QUE chegou e o recado, mas não a carta: ela sai de um
 * envelope, com a abertura de sempre (e vira token, como qualquer outra,
 * se já estiver no teto de cópias). Vários presentes juntos viram um
 * envelope só.
 */
export default function Presentes({ colecao, onMudar, convidado }: {
  colecao: Collection
  onMudar: (c: Collection) => void
  convidado: boolean
}) {
  const [lista, setLista] = useState<Presente[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [abrindo, setAbrindo] = useState<{ cartas: CardId[]; novas: CardId[]; emToken: Abertura['emToken'] } | null>(null)

  useEffect(() => {
    if (convidado) return
    let vivo = true
    void meusPresentes().then((p) => {
      if (vivo) setLista(p)
    })
    return () => {
      vivo = false
    }
  }, [convidado])

  async function abrir() {
    setOcupado(true)
    // marca como recebido ANTES de pôr na coleção: o banco só diz "sim" uma
    // vez, e é isso que impede outra aba de dar a mesma carta de novo
    const recebidos: Presente[] = []
    for (const p of lista) if (await receberPresente(p.id)) recebidos.push(p)
    setLista([])
    setOcupado(false)
    if (recebidos.length === 0) return
    const cartas = recebidos.map((p) => p.carta)
    const comEnvelope: Collection = {
      ...colecao,
      envelopes: [{ tipo: 'comum', id: `presente:${recebidos[0].id}`, cartas }, ...colecao.envelopes],
    }
    const r = abrirEnvelope(comEnvelope, 0)
    if (!r) return
    // a coleção muda antes da animação, como em toda abertura
    onMudar(r.colecao)
    setAbrindo({ cartas: r.cartas, novas: r.cartas.filter((id) => !(colecao.tenho[id] > 0)), emToken: r.emToken })
  }

  const recados = lista.map((p) => p.mensagem).filter((m): m is string => Boolean(m))

  return (
    <>
      {lista.length > 0 ? (
        <Dialogo
          titulo="Você ganhou um presente"
          acoes={
            <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={() => void abrir()} disabled={ocupado}>
              <Gift size={16} aria-hidden /> {ocupado ? 'Abrindo…' : 'Abrir'}
            </button>
          }
        >
          <div className={styles.corpo}>
            <Gift size={44} className={styles.icone} aria-hidden />
            <p className={styles.texto}>
              {lista.length === 1 ? 'Chegou uma carta para você.' : `Chegaram ${lista.length} cartas para você.`}
            </p>
            {recados.map((m, i) => (
              <blockquote key={i} className={styles.recado}>
                {m}
              </blockquote>
            ))}
          </div>
        </Dialogo>
      ) : null}
      {abrindo ? <AberturaDeEnvelope tipo="comum" {...abrindo} onFechar={() => setAbrindo(null)} /> : null}
    </>
  )
}
