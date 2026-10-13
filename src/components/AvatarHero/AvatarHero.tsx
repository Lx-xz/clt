'use client'

import type { ReactNode } from 'react'
import type { Avatar as Receita } from '@/data/avatar'
import Avatar, { TONS_DE_FUNDO, type Humor } from '../Avatar'
import styles from './AvatarHero.module.sass'

/**
 * O avatar em destaque: uma faixa na cor do fundo escolhido, com a figura
 * grande saindo pela borda de baixo. O retrato de
 * 112 px numa moldura era um selo ao lado do nick; aqui o avatar é a página.
 *
 * O tamanho é do CSS (a altura da faixa), não da prop: a figura ocupa a
 * altura toda e a largura acompanha. `children` vai por cima, no canto — é
 * onde mora o lápis de editar.
 */
export default function AvatarHero({
  avatar,
  className,
  classeDaFigura,
  humor,
  children,
}: {
  avatar: Receita
  className?: string
  /** Para quem quer a figura de outro tamanho dentro da mesma faixa (o
   *  editor, onde a faixa é alta e a figura em 108% dela passava da tela). */
  classeDaFigura?: string
  /** A cara do estresse (o início mostra a da run salva). O fundo da faixa
   *  continua o escolhido: o do humor é a cor que se lê em 24px, e aqui a
   *  cara é grande o bastante para falar sozinha. */
  humor?: Humor
  children?: ReactNode
}) {
  return (
    <div className={`${styles.hero} ${className ?? ''}`} style={{ background: TONS_DE_FUNDO[avatar.fundo] }}>
      <Avatar avatar={avatar} tamanho={320} humor={humor} vivo comCeu className={`${styles.figura} ${classeDaFigura ?? ''}`} />
      {children}
    </div>
  )
}
