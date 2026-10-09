'use client'

import {
  CalendarCheck,
  Flame,
  Layers,
  Leaf,
  Medal,
  PiggyBank,
  ShieldCheck,
  Skull,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { Conquista } from '@/data/conquistas'
import styles from './Conquistas.module.sass'

/** O nome do ícone vem do banco; o que não estiver aqui vira medalha. */
const ICONES: Record<string, LucideIcon> = {
  calendar: CalendarCheck,
  trophy: Trophy,
  shield: ShieldCheck,
  leaf: Leaf,
  flame: Flame,
  piggy: PiggyBank,
  skull: Skull,
  layers: Layers,
}

/**
 * As conquistas como selos. As que faltam aparecem apagadas, com o texto de
 * como se ganha — saber o que existe para conquistar é metade da graça, e
 * esconder a lista faria dela uma surpresa que ninguém procura.
 */
export default function Conquistas({ lista, vazio, selos = false }: {
  lista: Conquista[]
  vazio?: string
  /** Só os selos, em linha: o ícone redondo, com o nome no `title` e no
   *  leitor de tela. É o que o perfil mostra — a lista com descrição mora no
   *  "ver todas". */
  selos?: boolean
}) {
  if (lista.length === 0) return vazio ? <p className={styles.vazio}>{vazio}</p> : null
  if (selos) {
    return (
      <ul className={styles.selos}>
        {lista.map((c) => {
          const Icone = ICONES[c.icone] ?? Medal
          const tem = c.ganha_em !== null
          const rotulo = `${c.nome}${tem ? '' : ' (ainda não)'}: ${c.descricao}`
          return (
            <li key={c.id} className={`${styles.seloRedondo} ${tem ? styles.ganhaRedondo : ''}`} title={rotulo}>
              <Icone size={20} aria-hidden />
              <span className={styles.leitor}>{rotulo}</span>
            </li>
          )
        })}
      </ul>
    )
  }
  return (
    <ul className={styles.grade}>
      {lista.map((c) => {
        const Icone = ICONES[c.icone] ?? Medal
        const tem = c.ganha_em !== null
        return (
          <li
            key={c.id}
            className={`${styles.selo} ${tem ? styles.ganha : ''}`}
            title={tem ? `Ganha em ${new Date(c.ganha_em as string).toLocaleDateString('pt-BR')}` : 'Ainda não'}
          >
            <span className={styles.icone}>
              <Icone size={20} aria-hidden />
            </span>
            <span className={styles.texto}>
              <b>{c.nome}</b>
              <span>{c.descricao}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
