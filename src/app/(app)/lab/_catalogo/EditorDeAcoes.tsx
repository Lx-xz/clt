'use client'

import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useId, useState } from 'react'
import { todasAsCartas } from '@/game/catalogo'
import type { Acao, Condicao, Efeito, Quando } from '@/game/acoes'
import type { EventChoice } from '@/game/types'
import {
  CONDICOES, DESCRITORES, GRUPOS, QUANDOS,
  descritorDe, novaAcao, novaCondicao,
  type Campo, type Descritor, type NomeDeAcao, type NomeDeCondicao,
} from './descritores'
import styles from './editor.module.sass'

/**
 * O editor visual das ações — o que aposentou o painel de JSON cru.
 *
 * A linguagem do jogo NÃO é o Scratch, e é por isso que isto coube em um
 * arquivo: não há expressão (todo parâmetro é literal), não há variável, e só
 * existem dois pontos de aninhamento (`sorteio.entao/senao` e
 * `escolherDescarte.entao`). Uma lista vertical com listas dentro cobre a
 * linguagem inteira — canvas, encaixe por forma e arrastar não acrescentariam
 * capacidade nenhuma, só deleite, e ficaram de fora desta primeira fatia.
 *
 * **Quem sabe desenhar um campo é a tabela de descritores, não este arquivo.**
 * Aqui só existem os cinco tipos de campo e a recursão. Ação nova entra em
 * `descritores.ts` e aparece aqui sozinha — e, se ninguém a descrever lá, o
 * build quebra antes de alguém descobrir pelo silêncio.
 *
 * O JSON não sumiu: virou `EscapeJson`, recolhido. Ele continua sendo a saída
 * para o caso raro, e o lugar onde se confere o que o editor produziu.
 */

// ------------------------------------------------------------------ campos

type Obj = Record<string, unknown>

/**
 * Campo opcional vazio SOME do objeto em vez de virar `false`/`""` no JSON.
 * O que vai para o banco é lido por humano no diff da carta; ruído ali custa
 * atenção toda vez que alguém for balancear.
 */
function comCampo(obj: Obj, c: Campo, valor: unknown): Obj {
  const novo = { ...obj }
  const vazio = valor === '' || valor === false || (Array.isArray(valor) && valor.length === 0)
  if (c.opcional && vazio) delete novo[c.chave]
  else novo[c.chave] = valor
  return novo
}

function CampoSimples({ c, valor, aoMudar, cartas }: {
  c: Campo
  valor: unknown
  aoMudar: (v: unknown) => void
  cartas: string[]
}) {
  const id = useId()
  const k = c.campo

  if (k.tipo === 'simNao') {
    return (
      <label className={styles.marca}>
        <input type="checkbox" checked={valor === true} onChange={(e) => aoMudar(e.target.checked)} />
        {c.rotulo}
      </label>
    )
  }

  if (k.tipo === 'numeroOuTudo') {
    const tudo = valor === 'tudo'
    return (
      <span className={styles.campo}>
        <span className={styles.rotulo}>{c.rotulo}</span>
        <span className={styles.linha}>
          {tudo ? null : (
            <input
              className={styles.numero}
              type="number"
              value={typeof valor === 'number' ? valor : 1}
              onChange={(e) => aoMudar(Number(e.target.value) || 0)}
            />
          )}
          <label className={styles.marca}>
            <input type="checkbox" checked={tudo} onChange={(e) => aoMudar(e.target.checked ? 'tudo' : 1)} />
            a mão inteira
          </label>
        </span>
      </span>
    )
  }

  return (
    <label className={styles.campo} htmlFor={id}>
      <span className={styles.rotulo}>{c.rotulo}</span>
      {k.tipo === 'numero' ? (
        <input
          id={id}
          className={styles.numero}
          type="number"
          min={k.min}
          max={k.max}
          value={typeof valor === 'number' ? valor : ''}
          onChange={(e) => aoMudar(Number(e.target.value) || 0)}
        />
      ) : null}
      {k.tipo === 'porcento' ? (
        // guardado de 0 a 1, digitado de 0 a 100: ninguém pensa "chance 0,4"
        <span className={styles.linha}>
          <input
            id={id}
            className={styles.numero}
            type="number"
            min={0}
            max={100}
            value={Math.round((typeof valor === 'number' ? valor : 0) * 100)}
            onChange={(e) => aoMudar(Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100)}
          />
          <span className={styles.sufixo}>%</span>
        </span>
      ) : null}
      {k.tipo === 'escolha' ? (
        <select id={id} className={styles.seletor} value={String(valor ?? '')} onChange={(e) => aoMudar(e.target.value)}>
          {k.opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
          ))}
        </select>
      ) : null}
      {k.tipo === 'texto' ? (
        <input
          id={id}
          className={styles.texto}
          value={typeof valor === 'string' ? valor : ''}
          placeholder={k.exemplo}
          onChange={(e) => aoMudar(e.target.value)}
        />
      ) : null}
      {k.tipo === 'carta' ? (
        <>
          <input
            id={id}
            className={styles.texto}
            list={`${id}-cartas`}
            value={typeof valor === 'string' ? valor : ''}
            placeholder="id-da-carta"
            onChange={(e) => aoMudar(e.target.value)}
          />
          <datalist id={`${id}-cartas`}>
            {cartas.map((c2) => <option key={c2} value={c2} />)}
          </datalist>
        </>
      ) : null}
    </label>
  )
}

// ------------------------------------------------------------------ blocos

function Bloco({ acao, aoMudar, aoRemover, aoSubir, aoDescer, cartas }: {
  acao: Acao
  aoMudar: (a: Acao) => void
  aoRemover: () => void
  aoSubir?: () => void
  aoDescer?: () => void
  cartas: string[]
}) {
  const d = descritorDe(acao.faz)
  const obj = acao as unknown as Obj

  // ação sem descritor não deveria existir (o `satisfies` quebra o build
  // antes), mas o editor não pode ENGOLIR uma: um JSON colado à mão pode
  // trazer qualquer coisa, e some-la calada apagaria o efeito da carta
  if (!d) {
    return (
      <div className={`${styles.bloco} ${styles.desconhecido}`}>
        <span className={styles.nome}>Ação desconhecida: {String(acao.faz)}</span>
        <button type="button" className={styles.iconeBotao} onClick={aoRemover} aria-label="Remover">
          <X size={14} aria-hidden />
        </button>
      </div>
    )
  }

  const simples = d.campos.filter((c) => c.campo.tipo !== 'acoes')
  const listas = d.campos.filter((c) => c.campo.tipo === 'acoes')
  const { Icone } = d

  return (
    <div className={styles.bloco} data-grupo={d.grupo}>
      <div className={styles.cabeca}>
        <Icone size={15} aria-hidden className={styles.icone} />
        <span className={styles.nome}>{d.rotulo}</span>
        <div className={styles.campos}>
          {simples.map((c) => (
            <CampoSimples
              key={c.chave}
              c={c}
              valor={obj[c.chave] ?? (c.opcional ? undefined : c.padrao)}
              aoMudar={(v) => aoMudar(comCampo(obj, c, v) as unknown as Acao)}
              cartas={cartas}
            />
          ))}
        </div>
        <div className={styles.mando}>
          <button type="button" className={styles.iconeBotao} onClick={aoSubir} disabled={!aoSubir} aria-label="Subir">
            <ChevronUp size={14} aria-hidden />
          </button>
          <button type="button" className={styles.iconeBotao} onClick={aoDescer} disabled={!aoDescer} aria-label="Descer">
            <ChevronDown size={14} aria-hidden />
          </button>
          <button type="button" className={`${styles.iconeBotao} ${styles.tirar}`} onClick={aoRemover} aria-label="Remover">
            <X size={14} aria-hidden />
          </button>
        </div>
      </div>

      {listas.map((c) => (
        <fieldset key={c.chave} className={styles.aninhado}>
          <legend className={styles.legenda}>{c.rotulo}</legend>
          <ListaDeAcoes
            acoes={Array.isArray(obj[c.chave]) ? (obj[c.chave] as Acao[]) : []}
            aoMudar={(lista) => aoMudar(comCampo(obj, c, lista) as unknown as Acao)}
          />
        </fieldset>
      ))}
    </div>
  )
}

/** A lista de ações, que se contém: é o único lugar onde há recursão. */
export function ListaDeAcoes({ acoes, aoMudar }: { acoes: Acao[]; aoMudar: (a: Acao[]) => void }) {
  const cartas = todasAsCartas().map((c) => c.id)

  function trocar(i: number, a: Acao) {
    aoMudar(acoes.map((x, j) => (j === i ? a : x)))
  }
  function mover(i: number, passo: number) {
    const copia = [...acoes]
    const [x] = copia.splice(i, 1)
    copia.splice(i + passo, 0, x)
    aoMudar(copia)
  }

  return (
    <div className={styles.lista}>
      {acoes.map((a, i) => (
        <Bloco
          key={i}
          acao={a}
          cartas={cartas}
          aoMudar={(nova) => trocar(i, nova)}
          aoRemover={() => aoMudar(acoes.filter((_, j) => j !== i))}
          aoSubir={i > 0 ? () => mover(i, -1) : undefined}
          aoDescer={i < acoes.length - 1 ? () => mover(i, 1) : undefined}
        />
      ))}
      <Adicionar aoEscolher={(faz) => aoMudar([...acoes, novaAcao(faz)])} />
    </div>
  )
}

/**
 * O menu de ações novas é um `<select>` com `optgroup`, e não um popover
 * desenhado: o navegador já entrega a lista agrupada, o teclado, o leitor de
 * tela e o seletor de rolinha do celular de graça. Desenhar isso à mão seria
 * mais código para ficar pior no dedo.
 */
function Adicionar({ aoEscolher }: { aoEscolher: (faz: NomeDeAcao) => void }) {
  return (
    <select
      className={styles.adicionar}
      value=""
      aria-label="Adicionar ação"
      onChange={(e) => {
        if (e.target.value) aoEscolher(e.target.value as NomeDeAcao)
      }}
    >
      <option value="">+ adicionar ação</option>
      {GRUPOS.map((g) => {
        const desta = (Object.entries(DESCRITORES) as [NomeDeAcao, Descritor][])
          .filter(([, d]) => d.grupo === g.id)
        if (desta.length === 0) return null
        return (
          <optgroup key={g.id} label={g.rotulo}>
            {desta.map(([faz, d]) => <option key={faz} value={faz}>{d.rotulo}</option>)}
          </optgroup>
        )
      })}
    </select>
  )
}

// ---------------------------------------------------------------- condição

function EditorDeCondicao({ cond, aoMudar }: { cond: Condicao | undefined; aoMudar: (c: Condicao | undefined) => void }) {
  const cartas: string[] = []
  const d = cond ? (CONDICOES as Record<string, Descritor>)[cond.se] : undefined
  const obj = (cond ?? {}) as unknown as Obj

  return (
    <div className={styles.condicao}>
      <label className={styles.campo}>
        <span className={styles.rotulo}>Só se</span>
        <select
          className={styles.seletor}
          value={cond?.se ?? ''}
          onChange={(e) => aoMudar(e.target.value ? novaCondicao(e.target.value as NomeDeCondicao) : undefined)}
        >
          <option value="">Sempre</option>
          {(Object.entries(CONDICOES) as [NomeDeCondicao, Descritor][]).map(([se, dd]) => (
            <option key={se} value={se}>{dd.rotulo}</option>
          ))}
        </select>
      </label>
      {d?.campos.map((c) => (
        <CampoSimples
          key={c.chave}
          c={c}
          valor={obj[c.chave] ?? (c.opcional ? undefined : c.padrao)}
          aoMudar={(v) => aoMudar(comCampo(obj, c, v) as unknown as Condicao)}
          cartas={cartas}
        />
      ))}
    </div>
  )
}

// ----------------------------------------------------------------- efeitos

/**
 * A carta inteira: uma lista de BLOCOS, cada um com seu gatilho e sua
 * condição. É o formato de `ActionCard.efeitos`, desenhado como ele é — dois
 * blocos excludentes por `jaJogadaHoje` (a Reunião) viram duas fileiras com
 * "só se" diferentes, sem formulário próprio para ela.
 */
export function EditorDeEfeitos({ efeitos, aoMudar, padrao }: {
  efeitos: Efeito[]
  aoMudar: (e: Efeito[]) => void
  /** O gatilho que vale quando ninguém escolheu: `aoJogar` na carta, `aoRevelar` no evento. */
  padrao: Quando
}) {
  function trocar(i: number, e: Efeito) {
    aoMudar(efeitos.map((x, j) => (j === i ? e : x)))
  }

  return (
    <div className={styles.efeitos}>
      {efeitos.map((ef, i) => (
        <fieldset key={i} className={styles.efeito}>
          <legend className={styles.legenda}>
            Bloco {i + 1}
            {efeitos.length > 1 ? (
              <button
                type="button"
                className={`${styles.iconeBotao} ${styles.tirar}`}
                onClick={() => aoMudar(efeitos.filter((_, j) => j !== i))}
                aria-label={`Remover o bloco ${i + 1}`}
              >
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </legend>

          <div className={styles.gatilho}>
            <label className={styles.campo}>
              <span className={styles.rotulo}>Quando</span>
              <select
                className={styles.seletor}
                value={ef.quando ?? padrao}
                onChange={(e) => {
                  const q = e.target.value as Quando
                  trocar(i, q === padrao ? { ...ef, quando: undefined } : { ...ef, quando: q })
                }}
              >
                {QUANDOS.map((q) => (
                  <option key={q.valor} value={q.valor}>{q.rotulo}</option>
                ))}
              </select>
            </label>
            <EditorDeCondicao cond={ef.se} aoMudar={(se) => trocar(i, { ...ef, se })} />
          </div>

          <ListaDeAcoes acoes={ef.acoes} aoMudar={(acoes) => trocar(i, { ...ef, acoes })} />
        </fieldset>
      ))}

      <button
        type="button"
        className={styles.novoBloco}
        onClick={() => aoMudar([...efeitos, { acoes: [] }])}
      >
        + outro bloco (outro gatilho, ou outra condição)
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- escolhas

/**
 * As duas escolhas de um evento ambíguo. Cada uma carrega as próprias ações,
 * então isto é a mesma lista de novo — o evento que pergunta é dois efeitos
 * que o jogador desempata, não um `if` no motor.
 */
export function EditorDeEscolhas({ escolhas, aoMudar }: {
  escolhas: [EventChoice, EventChoice] | null
  aoMudar: (e: [EventChoice, EventChoice] | null) => void
}) {
  if (!escolhas) {
    return (
      <button
        type="button"
        className={styles.novoBloco}
        onClick={() => aoMudar([
          { label: 'Aceitar', text: '', acoes: [] },
          { label: 'Recusar', text: '', acoes: [] },
        ])}
      >
        + fazer este evento perguntar
      </button>
    )
  }

  function trocar(i: 0 | 1, e: EventChoice) {
    const par: [EventChoice, EventChoice] = [escolhas![0], escolhas![1]]
    par[i] = e
    aoMudar(par)
  }

  return (
    <div className={styles.efeitos}>
      {escolhas.map((esc, i) => (
        <fieldset key={i} className={styles.efeito}>
          <legend className={styles.legenda}>Escolha {i + 1}</legend>
          <div className={styles.gatilho}>
            <label className={styles.campo}>
              <span className={styles.rotulo}>Botão</span>
              <input
                className={styles.texto}
                value={esc.label}
                onChange={(e) => trocar(i as 0 | 1, { ...esc, label: e.target.value })}
              />
            </label>
            <label className={`${styles.campo} ${styles.cresce}`}>
              <span className={styles.rotulo}>O que ela diz</span>
              <input
                className={styles.texto}
                value={esc.text}
                onChange={(e) => trocar(i as 0 | 1, { ...esc, text: e.target.value })}
              />
            </label>
          </div>
          <ListaDeAcoes acoes={esc.acoes} aoMudar={(acoes) => trocar(i as 0 | 1, { ...esc, acoes })} />
        </fieldset>
      ))}
      <button type="button" className={`${styles.novoBloco} ${styles.tirar}`} onClick={() => aoMudar(null)}>
        Deixar de perguntar
      </button>
    </div>
  )
}

// -------------------------------------------------------------------- JSON

/**
 * O JSON não sumiu — ficou recolhido.
 *
 * Ele continua sendo a saída para o caso raro (colar uma carta inteira de
 * fora, conferir o que o editor produziu, mexer em algo que o editor ainda
 * não desenha). O que mudou é deixar de ser o ÚNICO caminho: era ele que
 * obrigava a saber a forma de `Acao` de cor para mudar um número.
 *
 * Enquanto o texto não for um JSON válido, nada é aplicado: o editor de cima
 * segue com o último estado bom, em vez de esvaziar a carta no meio de uma
 * digitação.
 */
export function EscapeJson({ rotulo, valor, aoMudar }: {
  rotulo: string
  valor: unknown
  aoMudar: (v: unknown) => void
}) {
  const [rascunho, setRascunho] = useState<string | null>(null)
  const texto = rascunho ?? JSON.stringify(valor, null, 2)
  let valido = true
  try {
    JSON.parse(texto)
  } catch {
    valido = false
  }

  return (
    <details
      className={styles.json}
      onToggle={(e) => {
        // ao fechar, o rascunho é descartado: quem manda é o editor visual
        if (!(e.currentTarget as HTMLDetailsElement).open) setRascunho(null)
      }}
    >
      <summary className={styles.resumo}>{rotulo}</summary>
      <textarea
        className={`${styles.cru} ${valido ? '' : styles.invalido}`}
        rows={8}
        spellCheck={false}
        value={texto}
        onChange={(e) => {
          setRascunho(e.target.value)
          try {
            aoMudar(JSON.parse(e.target.value))
          } catch {
            // texto pela metade: o editor de cima fica com o último válido
          }
        }}
      />
      <span className={styles.dica}>
        {valido
          ? 'Serve para conferir e para colar de fora. O editor acima é quem manda.'
          : 'JSON inválido — nada foi aplicado ainda.'}
      </span>
    </details>
  )
}
