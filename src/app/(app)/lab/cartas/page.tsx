'use client'

import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import Dialogo from '@/components/Dialogo'
import { ACTION_CARDS } from '@/game/cards'
import type { ActionCard, CardKind, EfeitoCarta } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './cartas.module.sass'

/**
 * A bancada das cartas.
 *
 * **Ela não grava no banco, e isso é decisão, não preguiça.** As cartas são
 * regra do jogo: se morassem no banco, um `delete` apagaria uma carta que
 * está dentro do save e do baralho de quem está no meio de uma run, e uma
 * carta nova chegaria sem o motor saber o que ela faz. Aqui se edita um
 * rascunho e se leva o `cards.ts` pronto para o repositório — que continua
 * sendo a fonte da verdade.
 *
 * O que dá para editar de verdade: nome, custo, classe, texto, cópias no
 * baralho inicial e o `efeito` — a soma de recursos que a carta faz. Isso
 * cobre 15 das 20 cartas inteirinhas.
 *
 * O que NÃO dá: a regra das cinco cartas marcadas `especial`. A segunda
 * reunião do dia, o descarte do Foco Total, o passivo do Automatizar, o
 * sorteio do Pedir Aumento e o cancelamento de advertência do Puxar o Saco
 * são CÓDIGO, no `switch` de `playCard`. O editor mostra o aviso e deixa
 * mexer no resto da carta; a regra em si continua sendo assunto do motor.
 */

const CHAVE = 'clt:lab-cartas:v1'

const CLASSES: CardKind[] = ['tarefa', 'descanso', 'grana', 'social']
const RECURSOS: { campo: keyof EfeitoCarta; rotulo: string }[] = [
  { campo: 'produtividade', rotulo: 'produtividade' },
  { campo: 'energia', rotulo: 'energia' },
  { campo: 'estresse', rotulo: 'estresse' },
  { campo: 'dinheiro', rotulo: 'dinheiro' },
]

function nova(): ActionCard {
  return { id: 'carta-nova', name: 'Carta Nova', cost: 2, kind: 'tarefa', text: '', efeito: {}, starter: false }
}

/** O arquivo `cards.ts` reconstruído a partir do rascunho, pronto para colar. */
function comoCodigo(cartas: ActionCard[]): string {
  return cartas
    .map((c) => {
      const partes = [
        `id: '${c.id}'`,
        `name: '${c.name.replace(/'/g, "\\'")}'`,
        `cost: ${c.cost}`,
        `kind: '${c.kind}'`,
        `text: '${c.text.replace(/'/g, "\\'")}'`,
        `efeito: { ${Object.entries(c.efeito ?? {})
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')} }`,
      ]
      if (c.especial) partes.push('especial: true')
      partes.push(`starter: ${c.starter}`)
      if (c.copies) partes.push(`copies: ${c.copies}`)
      return `  { ${partes.join(', ')} },`
    })
    .join('\n')
}

export default function LabCartasPage() {
  const [cartas, setCartas] = useState<ActionCard[]>(ACTION_CARDS)
  const [aberta, setAberta] = useState<number | null>(null)
  const [vendoCodigo, setVendoCodigo] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE)
      if (bruto) setCartas(JSON.parse(bruto) as ActionCard[])
    } catch {
      // sem storage o rascunho só não sobrevive ao F5
    }
  }, [])

  function guardar(lista: ActionCard[]) {
    setCartas(lista)
    setCopiado(false)
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(lista))
    } catch {
      // ignorado
    }
  }

  function mudar(i: number, mudanca: Partial<ActionCard>) {
    guardar(cartas.map((c, j) => (j === i ? { ...c, ...mudanca } : c)))
  }

  function mudarEfeito(i: number, campo: keyof EfeitoCarta, valor: string) {
    const n = valor === '' ? undefined : Number(valor)
    mudar(i, { efeito: { ...cartas[i].efeito, [campo]: Number.isFinite(n) ? n : undefined } })
  }

  const codigo = comoCodigo(cartas)
  const emEdicao = aberta === null ? null : cartas[aberta]

  return (
    <main className="page">
      <Link className={styles.voltar} href="/lab">
        ← voltar ao lab
      </Link>
      <h1 className={styles.titulo}>Lab das cartas</h1>
      <p className={styles.intro}>
        Rascunho. Nada aqui muda o jogo de ninguém: no fim você leva o <code>cards.ts</code> pronto
        para o repositório. Carta é regra, e regra que mora no banco vira carta apagada dentro do
        save de quem está jogando.
      </p>

      <div className={styles.acoes}>
        <button
          type="button"
          className={buttons.button}
          onClick={() => {
            guardar([...cartas, nova()])
            setAberta(cartas.length)
          }}
        >
          <Plus size={15} aria-hidden />
          Carta nova
        </button>
        <button type="button" className={buttons.button} onClick={() => guardar(ACTION_CARDS)}>
          <RotateCcw size={15} aria-hidden />
          Voltar às do jogo
        </button>
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          onClick={() => setVendoCodigo(true)}
        >
          Ver o código
        </button>
      </div>

      <div className={styles.grade}>
        {cartas.map((c, i) => (
          <button key={`${c.id}-${i}`} type="button" className={styles.celula} onClick={() => setAberta(i)}>
            <Card card={c} className={styles.carta} />
            <span className={styles.rotulo}>
              {c.starter ? `inicial ×${c.copies ?? 1}` : 'desbloqueável'}
              {c.especial ? <b className={styles.marcaEspecial}>regra no motor</b> : null}
            </span>
          </button>
        ))}
      </div>

      {emEdicao && aberta !== null ? (
        <Dialogo titulo={`Editar: ${emEdicao.name}`} largo onFechar={() => setAberta(null)}>
          <div className={styles.previa}>
            <Card card={emEdicao} className={styles.carta} />
          </div>

          {emEdicao.especial ? (
            <p className={styles.especial}>
              Esta carta tem <b>regra no motor</b>, no <code>switch</code> de <code>playCard</code>:
              o que a torna especial não está em nenhum campo daqui. Dá para mudar nome, custo,
              classe, texto e a soma de recursos — a regra continua sendo código.
            </p>
          ) : null}

          <div className={styles.campos}>
            <label>
              <span>id</span>
              <input
                value={emEdicao.id}
                onChange={(ev) => mudar(aberta, { id: ev.target.value })}
                spellCheck={false}
              />
            </label>
            <label>
              <span>nome</span>
              <input value={emEdicao.name} onChange={(ev) => mudar(aberta, { name: ev.target.value })} />
            </label>
            <label>
              <span>custo</span>
              <input
                type="number"
                min={0}
                max={10}
                value={emEdicao.cost}
                onChange={(ev) => mudar(aberta, { cost: Number(ev.target.value) })}
              />
            </label>
            <label>
              <span>classe</span>
              <select
                value={emEdicao.kind}
                onChange={(ev) => mudar(aberta, { kind: ev.target.value as CardKind })}
              >
                {CLASSES.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>cópias</span>
              <input
                type="number"
                min={0}
                max={6}
                value={emEdicao.copies ?? 0}
                onChange={(ev) =>
                  mudar(aberta, { copies: Number(ev.target.value) || undefined })
                }
              />
            </label>
            <label>
              <span>no baralho inicial</span>
              <select
                value={emEdicao.starter ? 'sim' : 'nao'}
                onChange={(ev) => mudar(aberta, { starter: ev.target.value === 'sim' })}
              >
                <option value="sim">sim</option>
                <option value="nao">não (recompensa)</option>
              </select>
            </label>
          </div>

          <label className={styles.texto}>
            <span>texto da carta</span>
            <textarea
              rows={2}
              value={emEdicao.text}
              onChange={(ev) => mudar(aberta, { text: ev.target.value })}
            />
          </label>
          <p className={styles.dica}>
            O texto é só o que o jogador lê — quem faz a conta é o efeito abaixo. Os dois podem
            discordar sem o jogo reclamar, então confira.
          </p>

          <div className={styles.campos}>
            {RECURSOS.map(({ campo, rotulo }) => (
              <label key={campo}>
                <span>{rotulo}</span>
                <input
                  type="number"
                  value={emEdicao.efeito?.[campo] ?? ''}
                  placeholder="0"
                  onChange={(ev) => mudarEfeito(aberta, campo, ev.target.value)}
                />
              </label>
            ))}
          </div>
          <p className={styles.dica}>
            Estresse positivo <b>sobe</b> o estresse, negativo desce. Nunca passa de zero.
          </p>

          <button
            type="button"
            className={`${buttons.button} ${styles.excluir}`}
            onClick={() => {
              guardar(cartas.filter((_, j) => j !== aberta))
              setAberta(null)
            }}
          >
            <Trash2 size={15} aria-hidden />
            Tirar do rascunho
          </button>
        </Dialogo>
      ) : null}

      {vendoCodigo ? (
        <Dialogo
          titulo="ACTION_CARDS"
          largo
          onFechar={() => setVendoCodigo(false)}
          acoes={
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              onClick={() => void navigator.clipboard?.writeText(codigo).then(() => setCopiado(true))}
            >
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          }
        >
          <p className={styles.dica}>
            Cole no lugar do miolo de <code>ACTION_CARDS</code>, em{' '}
            <code>src/game/cards.ts</code>. Carta com <code>especial: true</code> precisa do
            <code> case</code> dela no <code>playCard</code>; sem ele, a parte especial some e
            sobra só o efeito.
          </p>
          <pre className={styles.codigo}>{codigo}</pre>
        </Dialogo>
      ) : null}
    </main>
  )
}
