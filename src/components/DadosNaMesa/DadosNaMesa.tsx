'use client'

import { useEffect, useRef, useState } from 'react'
import { RolagemNaMesa, dadosDoValor, type DadoNaMesa } from '../Dado3D'
import type { GameState } from '@/game/types'
import styles from './DadosNaMesa.module.sass'

/**
 * Os dados que uma carta rolou (v0.41: "1d3 de energia"), caindo no tapete.
 *
 * O número já saiu no motor (`GameState.ultimaRolagem`); aqui eles só são
 * jogados na mesa, pela mesma física do `/lab/sorte`, e param na face que
 * saiu. Depois de parar, o total fica um instante à vista e tudo some. Como
 * a `MensagemNaMesa`, quem diz que é uma rolagem NOVA é o `selo` — e a que
 * já estava no save quando a mesa abriu não rola de novo.
 *
 * Não pega o ponteiro: quem está arrastando a próxima carta para o tapete
 * passa por cima dos dados.
 */
const DEPOIS_DE_PARAR = 1400

export default function DadosNaMesa({ rolagem }: { rolagem: GameState['ultimaRolagem'] }) {
  const vista = useRef(rolagem?.selo ?? 0)
  const [ativa, setAtiva] = useState<NonNullable<GameState['ultimaRolagem']> | null>(null)
  const [parou, setParou] = useState(false)

  useEffect(() => {
    if (!rolagem || rolagem.selo === vista.current) return
    vista.current = rolagem.selo
    setAtiva(rolagem)
    setParou(false)
  }, [rolagem])

  useEffect(() => {
    if (!parou) return
    const t = setTimeout(() => setAtiva(null), DEPOIS_DE_PARAR)
    return () => clearTimeout(t)
  }, [parou])

  if (!ativa) return null
  const dados: DadoNaMesa[] = ativa.valores.flatMap((v) => dadosDoValor(ativa.lados, v) ?? [])
  if (dados.length === 0) return null

  return (
    <div className={`${styles.camada} ${parou ? styles.saindo : ''}`} aria-hidden>
      <RolagemNaMesa key={ativa.selo} dados={dados} jogada={ativa.selo} tamanho={64} onParar={() => setParou(true)} />
      {parou ? (
        <span className={styles.total}>
          {ativa.valores.length > 1 || ativa.mais ? `${ativa.valores.join(' + ')}${ativa.mais ? ` ${ativa.mais > 0 ? '+' : '−'} ${Math.abs(ativa.mais)}` : ''} = ` : ''}
          <b>{ativa.total}</b>
        </span>
      ) : null}
    </div>
  )
}
