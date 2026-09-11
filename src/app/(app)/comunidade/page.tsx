'use client'

import { useState } from 'react'
import Segmentado from '@/components/Segmentado'
import Analise from './Analise'
import Feedbacks from './Feedbacks'
import Novidades from './Novidades'
import styles from './comunidade.module.sass'

type Aba = 'novidades' | 'feedbacks' | 'analise'

/**
 * Novidades, Feedbacks e Análise eram três entradas no menu para o mesmo
 * assunto: o que está acontecendo com o jogo. Quem abre uma quase sempre quer
 * olhar a outra — o relato vira novidade, a novidade se explica pelo número.
 * Juntando em abas, o menu encurta e o caminho entre elas some.
 */
export default function ComunidadePage() {
  const [aba, setAba] = useState<Aba>('novidades')

  return (
    <main className="page">
      <header className={styles.topo}>
        <h1 className={styles.titulo}>Comunidade</h1>
        <Segmentado
          className={styles.abas}
          rotulo="O que ver"
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: 'novidades', rotulo: 'Novidades' },
            { valor: 'feedbacks', rotulo: 'Feedbacks' },
            { valor: 'analise', rotulo: 'Análise' },
          ]}
        />
      </header>

      {aba === 'novidades' ? <Novidades /> : null}
      {aba === 'feedbacks' ? <Feedbacks /> : null}
      {aba === 'analise' ? <Analise /> : null}
    </main>
  )
}
