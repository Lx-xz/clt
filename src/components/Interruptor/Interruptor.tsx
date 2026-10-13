'use client'

import { Check, X } from 'lucide-react'
import BotaoQueTreme from '../BotaoQueTreme'
import styles from './Interruptor.module.sass'

/**
 * Liga e desliga, para o que vale na hora (o mudo, a música baixa fora do
 * jogo). A caixa de marcar (`Check`) continua para o que é resposta de
 * formulário — "li e aceito os termos" — e não um ajuste que muda o site
 * no momento do toque: essa é a diferença que o desenho de cada um diz.
 *
 * É um `button` com `role="switch"`: teclado, foco e leitor de tela vêm do
 * próprio botão, e o `aria-checked` diz o estado. A linha inteira é o alvo
 * do toque, não só a bolinha — no celular, acertar 40 px é loteria.
 */
export default function Interruptor({
  ligado,
  onChange,
  rotulo,
  dica,
  icone,
  desabilitado = false,
}: {
  ligado: boolean
  onChange: (v: boolean) => void
  rotulo: string
  /** Uma linha embaixo do rótulo, dizendo o que o ajuste faz. */
  dica?: React.ReactNode
  icone?: React.ReactNode
  desabilitado?: boolean
}) {
  return (
    // no iPhone com a vibração ligada, alternar treme (`BotaoQueTreme`)
    <BotaoQueTreme
      role="switch"
      aria-checked={ligado}
      disabled={desabilitado}
      className={`${styles.linha} ${desabilitado ? styles.desligado : ''}`}
      onClick={() => onChange(!ligado)}
    >
      {icone ? <span className={styles.icone} aria-hidden>{icone}</span> : null}
      <span className={styles.textos}>
        <span className={styles.rotulo}>{rotulo}</span>
        {dica ? <span className={styles.dica}>{dica}</span> : null}
      </span>
      <span className={`${styles.trilho} ${ligado ? styles.ligado : ''}`} aria-hidden>
        {/* o estado também na bolinha, e não só na cor: verde e cinza não
            são diferença para todo mundo */}
        <span className={styles.bolinha}>
          {ligado ? <Check size={15} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
        </span>
      </span>
    </BotaoQueTreme>
  )
}
