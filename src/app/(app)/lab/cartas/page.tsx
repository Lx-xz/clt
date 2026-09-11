'use client'

import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import Dialogo from '@/components/Dialogo'
import { ACTION_CARDS } from '@/game/cards'
import type { Acao, Efeito, Recurso } from '@/game/acoes'
import type { ActionCard, CardKind } from '@/game/types'
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
 * Agora dá para editar a carta INTEIRA, inclusive as cinco marcadas
 * `especial`: desde que o que a carta faz virou lista de ações (`acoes.ts`),
 * a segunda reunião do dia e o sorteio do Pedir Aumento são dado como
 * qualquer outro. Não existe mais "a regra está no motor".
 *
 * A edição tem dois níveis, de propósito:
 *
 * - **Os quatro campos de recurso** mexem no bloco de efeito SEM condição —
 *   o "+2 produtividade" da carta. É o que cobre a maioria e o que se usa
 *   para rebalancear.
 * - **O painel de ações** mostra a lista inteira em JSON e aceita edição.
 *   É a única forma de mexer numa carta condicional sem inventar um
 *   formulário para cada tipo de ação, e o rascunho é local: JSON inválido
 *   estraga o rascunho, não o jogo de ninguém.
 */

const CHAVE = 'clt:lab-cartas:v1'

const CLASSES: CardKind[] = ['tarefa', 'descanso', 'grana', 'social']
const RECURSOS: Recurso[] = ['produtividade', 'energia', 'estresse', 'dinheiro']

function nova(): ActionCard {
  return { id: 'carta-nova', name: 'Carta Nova', cost: 2, kind: 'tarefa', text: '', efeitos: [{ acoes: [] }], starter: false }
}

/** O índice do bloco sem condição — o "efeito simples" da carta. */
function blocoSimples(c: ActionCard): number {
  return c.efeitos.findIndex((e) => !e.se && !e.quando)
}

/** Quanto a carta soma num recurso, somando as ações do bloco simples. */
function somaDe(c: ActionCard, qual: Recurso): number | '' {
  const bloco = c.efeitos[blocoSimples(c)]
  if (!bloco) return ''
  const total = bloco.acoes
    .filter((a): a is Extract<Acao, { faz: 'recurso' }> => a.faz === 'recurso' && a.qual === qual)
    .reduce((soma, a) => soma + a.quanto, 0)
  return total === 0 ? '' : total
}

/** Objeto literal de TypeScript (chave sem aspas), para o código sair colável. */
function literal(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(literal).join(', ')}]`
  if (valor && typeof valor === 'object') {
    const partes = Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${literal(v)}`)
    return `{ ${partes.join(', ')} }`
  }
  if (typeof valor === 'string') return `'${valor.replace(/'/g, "\\'")}'`
  return String(valor)
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
        `efeitos: ${literal(c.efeitos)}`,
      ]
      if (c.restricao) partes.push(`restricao: ${literal(c.restricao)}`)
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

  /**
   * Escreve a soma de um recurso no bloco sem condição: tira as ações
   * daquele recurso e põe uma só com o total. Sem isso, digitar no campo duas
   * vezes deixaria duas ações somando a mesma coisa.
   */
  function mudarRecurso(i: number, qual: Recurso, valor: string) {
    const c = cartas[i]
    const n = Number(valor)
    const quanto = valor === '' || !Number.isFinite(n) ? 0 : n
    const efeitos = [...c.efeitos]
    let alvo = blocoSimples(c)
    if (alvo < 0) {
      efeitos.push({ acoes: [] })
      alvo = efeitos.length - 1
    }
    const restantes = efeitos[alvo].acoes.filter((a) => !(a.faz === 'recurso' && a.qual === qual))
    const acoes: Acao[] = quanto === 0 ? restantes : [...restantes, { faz: 'recurso', qual, quanto }]
    efeitos[alvo] = { ...efeitos[alvo], acoes }
    mudar(i, { efeitos })
  }

  /** O painel cru. JSON inválido não é salvo — o rascunho anterior fica. */
  function mudarEfeitosCrus(i: number, texto: string) {
    try {
      const lido = JSON.parse(texto) as Efeito[]
      if (Array.isArray(lido)) mudar(i, { efeitos: lido })
    } catch {
      // digitação no meio do caminho: ignora até o JSON fechar
    }
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
              {c.especial ? <b className={styles.marcaEspecial}>tem condição</b> : null}
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
              Esta carta faz <b>mais do que somar recurso</b>: ela tem condição, descarte ou
              sorteio. Os quatro campos de recurso mexem só no efeito sem condição — o resto está
              no painel de ações, embaixo.
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
            {RECURSOS.map((qual) => (
              <label key={qual}>
                <span>{qual}</span>
                <input
                  type="number"
                  value={somaDe(emEdicao, qual)}
                  placeholder="0"
                  onChange={(ev) => mudarRecurso(aberta, qual, ev.target.value)}
                />
              </label>
            ))}
          </div>
          <p className={styles.dica}>
            Estresse positivo <b>sobe</b> o estresse, negativo desce. Nunca passa de zero.
          </p>

          <label className={styles.texto}>
            <span>ações da carta</span>
            <textarea
              rows={6}
              spellCheck={false}
              defaultValue={JSON.stringify(emEdicao.efeitos, null, 1)}
              onChange={(ev) => mudarEfeitosCrus(aberta, ev.target.value)}
            />
          </label>
          <p className={styles.dica}>
            A lista inteira, do jeito que o motor lê. O vocabulário está em{' '}
            <code>src/game/acoes.ts</code>: <code>recurso</code>, <code>comprar</code>,{' '}
            <code>descartar</code>, <code>custo</code>, <code>sorteio</code> e companhia, cada
            bloco com um <code>se</code> opcional. JSON inválido é ignorado até fechar.
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
            <code>src/game/cards.ts</code>. Não há mais nada a fazer no motor: ele lê a lista de
            ações e pronto. Mudou número de carta? Suba <code>VERSAO_BARALHO</code> e escreva a
            linha em <code>src/data/balanceamento.ts</code> — é ela que o jogador lê no baralho.
          </p>
          <pre className={styles.codigo}>{codigo}</pre>
        </Dialogo>
      ) : null}
    </main>
  )
}
