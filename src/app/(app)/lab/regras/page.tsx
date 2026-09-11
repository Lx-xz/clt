'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Dialogo from '@/components/Dialogo'
import {
  Origem,
  PedirMotivo,
  estilosDaBancada as comuns,
} from '../_catalogo/Bancada'
import { salvarModo, semearCatalogo } from '@/data/cartas'
import { CARTAS_BASE } from '@/game/cards'
import { EVENTOS_BASE } from '@/game/events'
import { catalogoVeioDoBanco } from '@/game/catalogo'
import { MODO_NORMAL, modosDisponiveis, regras, totalDeDias, type Regras } from '@/game/regras'
import type { WeekConfig } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from '../cartas/cartas.module.sass'

/**
 * As regras do jogo — os números que não pertencem a carta nenhuma.
 *
 * É a bancada do aluguel. Ela existe porque balancear "o mês aperta pouco"
 * não é mexer em carta: é mexer na conta de sexta, no salário e na cota, e
 * isso morava solto no código.
 *
 * **Quem já está jogando não é afetado.** A run copia as regras na criação e
 * termina com elas (`GameState.modo`) — mudar o aluguel às três da tarde não
 * pode mudar o preço de quem está no dia 12. O número novo vale para a
 * próxima partida, e a partida antiga continua sendo relida com o preço que
 * ela pagou.
 *
 * Hoje só existe o `normal`. A tela já lista modos no plural porque a tabela
 * é uma tabela; se um dia houver um "difícil", ele entra aqui sem obra.
 */

/** Os números que dão para mexer sem inventar regra nova. A ordem é a de quem
 *  balanceia: primeiro o que mata, depois o que paga. */
const NUMEROS: { campo: keyof Regras; rotulo: string; dica: string; min: number; max: number }[] = [
  { campo: 'contasSemanais', rotulo: 'Contas de sexta (R$)', dica: 'O aluguel e o mercado. Não ter isso na sexta é despejo.', min: 0, max: 2000 },
  { campo: 'energiaBase', rotulo: 'Energia base', dica: 'A energia do dia é este número MENOS o estresse. É a engrenagem central do jogo.', min: 1, max: 30 },
  { campo: 'estresseMaximo', rotulo: 'Estresse que dá burnout', dica: 'Mexer aqui mexe também no teto de energia, porque os dois se encontram.', min: 2, max: 30 },
  { campo: 'advertenciasMaximas', rotulo: 'Advertências até a demissão', dica: 'Uma por semana com a meta falhada.', min: 1, max: 10 },
  { campo: 'dinheiroInicial', rotulo: 'Dinheiro inicial (R$)', dica: 'Quanto sobra da última quinzena.', min: 0, max: 5000 },
  { campo: 'descansoDoFimDeSemana', rotulo: 'Estresse que o fim de semana tira', dica: 'O único alívio garantido da semana.', min: 0, max: 10 },
  { campo: 'cartasNaMao', rotulo: 'Cartas na mão por dia', dica: 'O Dia Tranquilo continua dando duas a mais que isto, seja qual for o número.', min: 1, max: 12 },
  { campo: 'diasPorSemana', rotulo: 'Dias úteis por semana', dica: 'A sexta é o último dia da semana, então isto move o dia de pagamento.', min: 1, max: 7 },
]

const COLUNAS: { campo: keyof WeekConfig; rotulo: string }[] = [
  { campo: 'dailyQuota', rotulo: 'Cota/dia' },
  { campo: 'weeklyGoal', rotulo: 'Meta da semana' },
  { campo: 'fullSalary', rotulo: 'Salário cheio' },
  { campo: 'reducedSalary', rotulo: 'Salário reduzido' },
]

/** O resumo automático, como nas cartas: o número é da máquina, o motivo é
 *  de quem está mudando. */
function resumoDaMudanca(antes: Regras, depois: Regras): string {
  const partes: string[] = []
  for (const n of NUMEROS) {
    if (antes[n.campo] !== depois[n.campo]) {
      partes.push(`${n.rotulo}: ${antes[n.campo]} → ${depois[n.campo]}`)
    }
  }
  depois.semanas.forEach((s, i) => {
    const a = antes.semanas[i]
    if (!a) return partes.push(`Semana ${i + 1} nova`)
    for (const c of COLUNAS) {
      if (a[c.campo] !== s[c.campo]) partes.push(`S${i + 1} ${c.rotulo}: ${a[c.campo]} → ${s[c.campo]}`)
    }
  })
  if (antes.semanas.length !== depois.semanas.length) {
    partes.push(`Semanas: ${antes.semanas.length} → ${depois.semanas.length}`)
  }
  return partes.join(' · ') || 'Salvo sem mudança de número'
}

export default function LabRegrasPage() {
  const [modos, setModos] = useState<Regras[]>(() => modosDisponiveis())
  const [doBanco, setDoBanco] = useState(() => catalogoVeioDoBanco())
  const [emEdicao, setEmEdicao] = useState<Regras | null>(null)
  const [pedindo, setPedindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [recado, setRecado] = useState<string | null>(null)

  function recarregar() {
    setModos(modosDisponiveis())
    setDoBanco(catalogoVeioDoBanco())
  }

  async function semear() {
    setOcupado(true)
    const r = await semearCatalogo(CARTAS_BASE, EVENTOS_BASE, [MODO_NORMAL])
    setOcupado(false)
    if (!r.ok) return setErro(r.erro ?? 'Não deu para semear.')
    recarregar()
    setRecado('Catálogo e modo semeados. Daqui em diante o banco é quem manda.')
  }

  async function gravar(oQue: string, porque: string) {
    if (!emEdicao) return
    setOcupado(true)
    const r = await salvarModo(emEdicao, oQue, porque)
    setOcupado(false)
    if (!r.ok) return setErro(r.erro ?? 'Não deu para salvar.')
    recarregar()
    setPedindo(false)
    setEmEdicao(null)
    setRecado(`${emEdicao.nome} salvo. Vale a partir da próxima partida que alguém começar.`)
  }

  function mudarNumero(campo: keyof Regras, valor: number) {
    if (!emEdicao) return
    setEmEdicao({ ...emEdicao, [campo]: valor })
  }

  function mudarSemana(i: number, campo: keyof WeekConfig, valor: number) {
    if (!emEdicao) return
    const semanas = emEdicao.semanas.map((s, j) => (i === j ? { ...s, [campo]: valor } : s))
    setEmEdicao({ ...emEdicao, semanas })
  }

  const original = emEdicao ? (modos.find((m) => m.id === emEdicao.id) ?? MODO_NORMAL) : MODO_NORMAL

  return (
    <main className="page">
      <Link href="/lab" className={styles.voltar}>
        <ArrowLeft size={14} aria-hidden /> Lab
      </Link>

      <h1 className={styles.titulo}>Regras do jogo</h1>
      <p className={styles.intro}>
        Os números que não pertencem a carta nenhuma: aluguel, cota, salário, energia base.{' '}
        <b>Quem já está no meio de uma partida não é afetado</b> — cada run copia as regras
        quando começa e termina com elas. O número novo vale para a próxima.
      </p>

      <Origem doBanco={doBanco} aoSemear={semear} semeando={ocupado} />

      {recado ? <p className={styles.recado}>{recado}</p> : null}
      {erro && !pedindo ? <p className={styles.erroTopo}>{erro}</p> : null}

      <div className={styles.modos}>
        {modos.map((m) => (
          <button
            key={m.id}
            type="button"
            className={styles.modo}
            onClick={() => { setErro(null); setEmEdicao(structuredClone(m)) }}
            disabled={!doBanco}
          >
            <b>{m.nome}</b>
            <span>{m.descricao}</span>
            <span className={styles.modoNumeros}>
              R$ {m.contasSemanais} de contas · energia {m.energiaBase} · {m.semanas.length} semanas ·{' '}
              {totalDeDias(m)} dias{m.id === regras().id ? ' · em uso' : ''}
            </span>
          </button>
        ))}
      </div>

      {!doBanco ? (
        <p className={styles.dicaSecao}>
          Semeie o banco para poder editar. Até lá o jogo roda com o modo do código, que é
          exatamente o mesmo — só não dá para mexer nele sem publicar o site.
        </p>
      ) : null}

      {emEdicao ? (
        <Dialogo titulo={emEdicao.nome} onFechar={() => setEmEdicao(null)} largo>
          <div className={styles.campos}>
            {NUMEROS.map((n) => (
              <label key={n.campo} className={comuns.rotulo}>
                {n.rotulo}
                <input
                  className={comuns.campo}
                  type="number"
                  min={n.min}
                  max={n.max}
                  value={Number(emEdicao[n.campo])}
                  onChange={(e) => mudarNumero(n.campo, Number(e.target.value) || 0)}
                />
                <span className={comuns.dica}>{n.dica}</span>
              </label>
            ))}
          </div>

          <h3 className={styles.subtituloDialogo}>As semanas</h3>
          <p className={comuns.dica}>
            A cota é por dia; a meta é a soma da semana e falhá-la custa uma advertência e o
            salário reduzido.
          </p>
          <div className={styles.tabelaRolavel}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th>Semana</th>
                  {COLUNAS.map((c) => <th key={c.campo}>{c.rotulo}</th>)}
                </tr>
              </thead>
              <tbody>
                {emEdicao.semanas.map((s, i) => (
                  <tr key={s.week}>
                    <th scope="row">{i + 1}</th>
                    {COLUNAS.map((c) => (
                      <td key={c.campo}>
                        <input
                          className={comuns.campo}
                          type="number"
                          min={0}
                          value={s[c.campo]}
                          onChange={(e) => mudarSemana(i, c.campo, Number(e.target.value) || 0)}
                          aria-label={`Semana ${i + 1}, ${c.rotulo}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={styles.conta}>
            Dá <b>{totalDeDias(emEdicao)} dias úteis</b>. Entra{' '}
            <b>R$ {emEdicao.semanas.reduce((s, w) => s + w.fullSalary, 0)}</b> de salário cheio no
            mês inteiro contra <b>R$ {emEdicao.contasSemanais * emEdicao.semanas.length}</b> de
            contas — {' '}
            {emEdicao.semanas.reduce((s, w) => s + w.fullSalary, 0) + emEdicao.dinheiroInicial >
            emEdicao.contasSemanais * emEdicao.semanas.length
              ? 'sobra, então o despejo só acontece com erro de verdade.'
              : 'não fecha sozinho: o dinheiro precisa vir das cartas.'}
          </p>

          <div className={comuns.acoesDialogo}>
            <button type="button" className={buttons.button} onClick={() => setEmEdicao(null)}>
              Fechar
            </button>
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              onClick={() => { setErro(null); setPedindo(true) }}
            >
              Salvar no banco
            </button>
          </div>
        </Dialogo>
      ) : null}

      {pedindo && emEdicao ? (
        <PedirMotivo
          titulo={`Salvar ${emEdicao.nome}`}
          oQueSugerido={resumoDaMudanca(original, emEdicao)}
          exemplo="O despejo não acontecia em 1500 runs: o salário sobrava R$ 400 por mês contra uma conta parada em 300."
          aoConfirmar={gravar}
          aoFechar={() => setPedindo(false)}
          erro={erro}
          salvando={ocupado}
        />
      ) : null}
    </main>
  )
}
