'use client'

import { DesenhoDaRecompensa, DURACAO, useAndamento, type Forma } from '@/components/Recompensa'
import styles from './chapados.module.sass'

/**
 * A escada chapada na bancada: o MESMO desenho do jogo
 * (`components/Recompensa`), com o respiro de quem espera ser aberto e o
 * tranco de quando abre. Toque para abrir e fechar.
 */
export function Chapado({ tipo, aberto }: { tipo: Forma; aberto: boolean }) {
  const t = useAndamento(aberto, DURACAO[tipo])
  return <DesenhoDaRecompensa forma={tipo} t={t} className={`${styles.chapado} ${aberto ? styles.aberto : ''}`} />
}
