'use client'

import type { ReactNode } from 'react'
import type { Avatar as Receita } from '@/data/avatar'
import Avatar, { TONS_DE_FUNDO } from './Avatar'
import styles from './AvatarHero.module.sass'

/**
 * O avatar em destaque: uma faixa na cor do fundo escolhido, com a figura
 * grande saindo pela borda de baixo — como o perfil do Duolingo. O retrato de
 * 112 px numa moldura era um selo ao lado do nick; aqui o avatar é a página.
 *
 * O tamanho é do CSS (a altura da faixa), não da prop: a figura ocupa a
 * altura toda e a largura acompanha. `children` vai por cima, no canto — é
 * onde mora o lápis de editar.
 */
export default function AvatarHero({
  avatar,
  className,
  children,
}: {
  avatar: Receita
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={`${styles.hero} ${className ?? ''}`} style={{ background: TONS_DE_FUNDO[avatar.fundo] }}>
      <Avatar avatar={avatar} tamanho={320} className={styles.figura} />
      {children}
    </div>
  )
}
