'use client'

import {
  CalendarCheck,
  Flame,
  HelpCircle,
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
import { TokenIcon } from '../icons'
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
  oculta: HelpCircle,
}

const METAIS = ['', 'bronze', 'prata', 'ouro'] as const

/**
 * Uma entrada da lista: a conquista sozinha, ou o GRUPO das que sobem de
 * nível (bronze, prata, ouro), que vira uma entrada só — três selos do
 * colecionador seriam três vezes a mesma ideia.
 */
interface Entrada {
  id: string
  nome: string
  descricao: string
  icone: string
  /** Quantos níveis já ganhos (0 a 3) num grupo; 0 ou 1 numa sozinha. */
  nivel: number
  niveis: number
  ganha: boolean
  oculta: boolean
  tokens: number
  /** A do próximo nível, para dizer o que falta. */
  proxima?: Conquista
}

function agrupar(lista: Conquista[]): Entrada[] {
  const saida: Entrada[] = []
  const grupos = new Map<string, Conquista[]>()
  for (const c of lista) {
    if (c.grupo) {
      if (!grupos.has(c.grupo)) {
        grupos.set(c.grupo, [])
        saida.push({ id: c.grupo } as Entrada)
      }
      grupos.get(c.grupo)!.push(c)
    } else {
      saida.push({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
        icone: c.icone,
        nivel: c.ganha_em ? 1 : 0,
        niveis: 1,
        ganha: c.ganha_em !== null,
        oculta: Boolean(c.oculta),
        tokens: c.tokens ?? 0,
      })
    }
  }
  return saida.map((e) => {
    const g = grupos.get(e.id)
    if (!g) return e
    const ordem = [...g].sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0))
    const ganhas = ordem.filter((c) => c.ganha_em)
    const topo = ganhas[ganhas.length - 1]
    const proxima = ordem.find((c) => !c.ganha_em)
    return {
      id: e.id,
      nome: ordem[0].nome,
      descricao: (proxima ?? topo ?? ordem[0]).descricao,
      icone: ordem[0].icone,
      nivel: ganhas.length,
      niveis: ordem.length,
      ganha: ganhas.length > 0,
      oculta: false,
      tokens: (proxima ?? topo ?? ordem[0]).tokens ?? 0,
      proxima,
    }
  })
}

/**
 * As conquistas. `selos` é o resumo do perfil: um selo redondo por entrada,
 * pintado na cor do metal quando é de nível. Sem `selos`, a aba inteira:
 * as de nível com os três metais à vista e o que falta para o próximo, e as
 * outras com o que pagam. A oculta ainda não ganha não tem nome — quem a
 * esconde é o banco (`minhas_conquistas`); do perfil de outra pessoa só
 * vêm as ganhas.
 */
export default function Conquistas({ lista, vazio, selos = false }: {
  lista: Conquista[]
  vazio?: string
  selos?: boolean
}) {
  if (lista.length === 0) return vazio ? <p className={styles.vazio}>{vazio}</p> : null
  const entradas = agrupar(lista)

  if (selos) {
    return (
      <ul className={styles.selos}>
        {entradas.map((e) => {
          const Icone = ICONES[e.icone] ?? Medal
          const metal = e.niveis > 1 && e.nivel > 0 ? METAIS[e.nivel] : ''
          const rotulo = `${e.nome}${e.ganha ? (metal ? ` (${metal})` : '') : ' (ainda não)'}: ${e.descricao}`
          return (
            <li
              key={e.id}
              className={`${styles.seloRedondo} ${e.ganha ? styles.ganhaRedondo : ''} ${metal ? styles[metal] : ''}`}
              title={rotulo}
            >
              <Icone size={20} aria-hidden />
              <span className={styles.leitor}>{rotulo}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  const deNivel = entradas.filter((e) => e.niveis > 1)
  const sozinhas = entradas.filter((e) => e.niveis === 1)
  const ganhasTodas = lista.filter((c) => c.ganha_em)
  const tokensGanhos = ganhasTodas.reduce((t, c) => t + (c.tokens ?? 0), 0)

  return (
    <div className={styles.aba}>
      <p className={styles.resumo}>
        <b>{ganhasTodas.length}</b> de {lista.length} ·{' '}
        <span className={styles.tokens}>
          <TokenIcon size={14} /> {tokensGanhos}
        </span>{' '}
        ganhos
      </p>

      {deNivel.length > 0 ? (
        <ul className={styles.niveis}>
          {deNivel.map((e) => {
            const Icone = ICONES[e.icone] ?? Medal
            return (
              <li key={e.id} className={`${styles.nivelCartao} ${e.nivel > 0 ? styles[METAIS[e.nivel]] : ''}`}>
                <span className={styles.nivelIcone}>
                  <Icone size={22} aria-hidden />
                </span>
                <span className={styles.texto}>
                  <b>
                    {e.nome}
                    {e.nivel > 0 ? <em className={styles.metal}>{METAIS[e.nivel]}</em> : null}
                  </b>
                  <span>{e.proxima ? `Próximo: ${e.descricao.charAt(0).toLowerCase()}${e.descricao.slice(1)}` : 'Completo.'}</span>
                </span>
                <span className={styles.medalhas} aria-label={`${e.nivel} de ${e.niveis} níveis`}>
                  {[1, 2, 3].slice(0, e.niveis).map((n) => (
                    <span key={n} className={`${styles.medalha} ${styles[METAIS[n]]} ${n <= e.nivel ? styles.acesa : ''}`} />
                  ))}
                </span>
                {e.proxima ? (
                  <span className={styles.paga} title="O que o próximo nível paga">
                    <TokenIcon size={13} /> {e.tokens}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      <ul className={styles.grade}>
        {sozinhas.map((e) => {
          const Icone = ICONES[e.icone] ?? Medal
          return (
            <li key={e.id} className={`${styles.selo} ${e.ganha ? styles.ganha : ''} ${e.oculta && !e.ganha ? styles.oculta : ''}`}>
              <span className={styles.icone}>
                <Icone size={20} aria-hidden />
              </span>
              <span className={styles.texto}>
                <b>{e.nome}</b>
                <span>{e.descricao}</span>
              </span>
              <span className={styles.paga}>
                <TokenIcon size={13} /> {e.tokens}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
