'use client'

import { Check, Cloud, CloudOff, Layers, Loader2, Lock, Minus, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import BotaoConfirmar from '@/components/BotaoConfirmar'
import Card from '@/components/Card'
import CardDetail from '@/components/CardDetail'
import { MudancasDaCarta } from '@/components/HistoricoDaCarta'
import { iconeDaClasse } from '@/components/icons'
import Segmentado from '@/components/Segmentado'
import { useSessao } from '@/components/SessaoGuard'
import { versaoDoBaralho } from '@/data/balanceamento'
import { carregarDoBanco, sincronizar, type StatusSync } from '@/data/sync'
import { NAIPES, contarBaralho, problemasDoBaralho } from '@/game/baralho'
import { getCard } from '@/game/catalogo'
import {
  MAXIMO_DE_BARALHOS,
  apagarBaralho,
  ativarBaralho,
  baralhoAtivo,
  cartasBloqueadas,
  copiasMaximas,
  foraDoBaralho,
  moverCopias,
  novoBaralho,
  renomearBaralho,
  NOMES_DE_RARIDADE,
} from '@/game/colecao'
import { regras } from '@/game/regras'
import { loadCollection, loadRun, saveCollection } from '@/game/storage'
import type { ActionCard, CardId, CardKind, Collection, GameState, Raridade } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './baralho.module.sass'

type Ordem = 'custo' | 'nome' | 'raridade' | 'naipe'

interface Filtro {
  busca: string
  naipe: CardKind | 'livre' | 'todos'
  raridade: Raridade | 'todas'
  ordem: Ordem
}

const FILTRO_INICIAL: Filtro = { busca: '', naipe: 'todos', raridade: 'todas', ordem: 'custo' }
const RARIDADES: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']

/** Sem acento e em minúsculas: "reuniao" acha a Reunião. */
function normal(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Filtra e ordena uma coluna. Desempate sempre pelo nome, senão a ordem de
 * duas cartas do mesmo custo mudaria a cada cópia movida.
 */
function arrumar(cartas: ActionCard[], f: Filtro): ActionCard[] {
  const busca = normal(f.busca.trim())
  const nome = (a: ActionCard, b: ActionCard) => a.name.localeCompare(b.name, 'pt-BR')
  const por: Record<Ordem, (a: ActionCard, b: ActionCard) => number> = {
    custo: (a, b) => a.cost - b.cost || nome(a, b),
    nome,
    raridade: (a, b) => RARIDADES.indexOf(b.raridade ?? 'comum') - RARIDADES.indexOf(a.raridade ?? 'comum') || nome(a, b),
    naipe: (a, b) => (a.kind ?? 'zz').localeCompare(b.kind ?? 'zz') || nome(a, b),
  }
  return cartas
    .filter((c) => !busca || normal(`${c.name} ${c.text}`).includes(busca))
    .filter((c) => f.naipe === 'todos' || (f.naipe === 'livre' ? !c.kind : c.kind === f.naipe))
    .filter((c) => f.raridade === 'todas' || (c.raridade ?? 'comum') === f.raridade)
    .sort(por[f.ordem])
}

/**
 * A montagem do baralho, por CÓPIA (v0.33, refeita a pedido do autor).
 *
 * Em cima, o PAINEL do baralho equipado: as abas dos baralhos montados, o
 * nome, a conta contra os limites numa barra (o mínimo é uma marca nela) e
 * os quatro naipes como selos, cada um dizendo se já tem o mínimo. Era uma
 * linha de texto mono com "tarefa 8/3", e ninguém lia.
 *
 * Embaixo, as cartas. No desktop, duas colunas lado a lado — no baralho e
 * na coleção —, porque é entre elas que se arrasta; no celular elas viram
 * abas, que três listas empilhadas eram rolagem sem fim. Toda carta tem o
 * seu contador (− n +), que é o jeito de mover uma cópia sem precisar de
 * gesto nenhum; o clique duplo e o arraste continuam movendo uma, e o clique
 * simples abre o detalhe, com o histórico da carta.
 */
type Aba = 'dentro' | 'fora' | 'bloqueadas'

export default function BaralhoPage() {
  const [colecao, setColecao] = useState<Collection | null>(null)
  const [status, setStatus] = useState<StatusSync>('ocioso')
  const [aberta, setAberta] = useState<CardId | null>(null)
  const [sobre, setSobre] = useState<'dentro' | 'fora' | null>(null)
  const [renomeando, setRenomeando] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_INICIAL)
  const [aba, setAba] = useState<Aba>('dentro')
  const dentroRef = useRef<HTMLElement>(null)
  const foraRef = useRef<HTMLElement>(null)
  const sessao = useSessao()
  // no celular as colunas viram abas: não há para onde arrastar, e o dedo
  // na carta tem que rolar a página. O clique duplo e o contador seguem
  const [estreito, setEstreito] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 760px)')
    const ver = () => setEstreito(m.matches)
    ver()
    m.addEventListener('change', ver)
    return () => m.removeEventListener('change', ver)
  }, [])

  useEffect(() => {
    let vivo = true
    carregarDoBanco(sessao.id)
      .then((dados) => {
        if (vivo) setColecao(dados.collection)
      })
      .catch(() => {
        // sem banco o baralho ainda abre pelo espelho local
        if (vivo) setColecao(loadCollection())
      })
    return () => {
      vivo = false
    }
  }, [sessao.id])

  function update(next: Collection) {
    saveCollection(next)
    setColecao(next)
    sincronizar(sessao.id, loadRun<GameState>(), next, setStatus)
  }

  if (!colecao) {
    return (
      <main className="page">
        <p className={styles.vazio}>Carregando o baralho…</p>
      </main>
    )
  }

  const baralho = baralhoAtivo(colecao)
  const r = regras()
  const conta = contarBaralho(baralho)
  const problemas = problemasDoBaralho(baralho, r)
  // o filtro e a ordem valem para as três listas: a pergunta "que social
  // eu tenho?" é a mesma no baralho, fora dele e no que falta
  const dentro = arrumar(Object.keys(baralho.cartas).map(getCard), filtro).map((c) => c.id)
  const fora = arrumar(
    Object.keys(colecao.tenho)
      .filter((id) => foraDoBaralho(colecao, baralho, id) > 0)
      .map(getCard),
    filtro,
  ).map((c) => c.id)
  const bloqueadas = arrumar(cartasBloqueadas(colecao), filtro)
  const filtrando = filtro.busca.trim() !== '' || filtro.naipe !== 'todos' || filtro.raridade !== 'todas'
  const totalFora = fora.reduce((t, id) => t + foraDoBaralho(colecao, baralho, id), 0)
  const cheio = conta.total >= r.baralhoMaximo

  function mover(id: CardId, delta: number) {
    // cheio, pôr mais uma só deixaria a mesa recusando o baralho
    if (!colecao || (delta > 0 && cheio)) return
    update(moverCopias(colecao, baralho.id, id, delta))
  }

  /** O contador embaixo de cada carta: quantas cópias estão no baralho. */
  function contador(id: CardId) {
    const no = baralho.cartas[id] ?? 0
    const livres = foraDoBaralho(colecao!, baralho, id)
    const nome = getCard(id).name
    return (
      <div className={styles.contador}>
        <button type="button" aria-label={`Tirar uma ${nome} do baralho`} disabled={no === 0} onClick={() => mover(id, -1)}>
          <Minus size={14} aria-hidden />
        </button>
        <span className={styles.contadorNumero} aria-label={`${no} no baralho, ${livres} fora`}>
          <b>{no}</b>/{no + livres}
        </span>
        <button
          type="button"
          aria-label={`Pôr uma ${nome} no baralho`}
          disabled={livres === 0 || cheio}
          onClick={() => mover(id, +1)}
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>
    )
  }

  const cartaAberta = aberta ? getCard(aberta) : null
  const fracao = Math.min(1, conta.total / r.baralhoMaximo)
  const totalRuim = conta.total < r.baralhoMinimo || conta.total > r.baralhoMaximo

  return (
    <main className={`page ${styles.pagina}`}>
      <header className={styles.cabeca}>
        <h1 className={styles.titulo}>Baralho</h1>
        <span className={styles.versao} title="Versão do balanceamento das cartas">v{versaoDoBaralho()}</span>
        <span className={styles.sync} aria-live="polite">
          {status === 'salvando' ? (
            <><Loader2 size={14} className={styles.girando} aria-hidden /> salvando</>
          ) : status === 'salvo' ? (
            <><Cloud size={14} aria-hidden /> salvo</>
          ) : status === 'erro' ? (
            <><CloudOff size={14} aria-hidden /> guardado aqui</>
          ) : null}
        </span>
      </header>

      {/* o painel do baralho equipado */}
      <section className={styles.painel} aria-label="Baralho equipado">
        <div className={styles.abasBaralhos} role="tablist" aria-label="Seus baralhos">
          {colecao.baralhos.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={b.id === baralho.id}
              className={`${styles.abaBaralho} ${b.id === baralho.id ? styles.abaAtiva : ''}`}
              onClick={() => update(ativarBaralho(colecao, b.id))}
            >
              <Layers size={14} aria-hidden />
              {b.nome}
            </button>
          ))}
          {colecao.baralhos.length < MAXIMO_DE_BARALHOS ? (
            <button
              type="button"
              className={styles.abaNova}
              onClick={() => update(novoBaralho(colecao))}
              aria-label="Novo baralho, copiando este"
              title="Novo baralho (cópia deste)"
            >
              <Plus size={16} aria-hidden />
            </button>
          ) : null}
        </div>

        <div className={styles.painelCorpo}>
          <div className={styles.nomeLinha}>
            {renomeando !== null ? (
              <form
                className={styles.renomear}
                onSubmit={(e) => {
                  e.preventDefault()
                  update(renomearBaralho(colecao, baralho.id, renomeando))
                  setRenomeando(null)
                }}
              >
                <input
                  className={styles.campo}
                  value={renomeando}
                  maxLength={24}
                  autoFocus
                  aria-label="Nome do baralho"
                  onChange={(e) => setRenomeando(e.target.value)}
                  onBlur={() => setRenomeando(null)}
                />
              </form>
            ) : (
              <>
                <h2 className={styles.nome}>{baralho.nome}</h2>
                <button type="button" className={styles.icone} onClick={() => setRenomeando(baralho.nome)} aria-label="Renomear o baralho">
                  <Pencil size={15} aria-hidden />
                </button>
              </>
            )}
            {colecao.baralhos.length > 1 ? (
              <BotaoConfirmar
                className={styles.icone}
                armado="Apagar?"
                onConfirmar={() => update(apagarBaralho(colecao, baralho.id))}
              >
                <Trash2 size={15} aria-label="Apagar o baralho" />
              </BotaoConfirmar>
            ) : null}
            <span className={styles.equipado}>
              <Check size={13} aria-hidden /> equipado
            </span>
          </div>

          {/* a conta contra os limites: a barra vai até o máximo, e o mínimo
              é uma marca nela */}
          <div className={styles.medidor}>
            <div className={`${styles.total} ${totalRuim ? styles.ruim : ''}`}>
              <b>{conta.total}</b>
              <span>cartas · de {r.baralhoMinimo} a {r.baralhoMaximo}</span>
            </div>
            <div className={styles.barra} aria-hidden>
              <span className={`${styles.enchimento} ${totalRuim ? styles.enchimentoRuim : ''}`} style={{ width: `${fracao * 100}%` }} />
              <span className={styles.marca} style={{ left: `${(r.baralhoMinimo / r.baralhoMaximo) * 100}%` }} />
            </div>
          </div>

          <ul className={styles.naipes}>
            {NAIPES.map((n) => {
              const Icone = iconeDaClasse(n)
              const ok = conta.porNaipe[n] >= r.minimoPorNaipe
              return (
                <li key={n} className={`${styles.naipe} ${ok ? '' : styles.ruim}`} title={`Mínimo de ${r.minimoPorNaipe} por naipe`}>
                  <Icone size={16} aria-hidden />
                  <span className={styles.naipeNome}>{n}</span>
                  <b>{conta.porNaipe[n]}</b>
                </li>
              )
            })}
            {conta.semNaipe > 0 ? (
              <li className={styles.naipe}>
                {(() => {
                  const Icone = iconeDaClasse(null)
                  return <Icone size={16} aria-hidden />
                })()}
                <span className={styles.naipeNome}>sem naipe</span>
                <b>{conta.semNaipe}</b>
              </li>
            ) : null}
          </ul>

          {problemas.length > 0 ? (
            <ul className={styles.problemas} role="status" aria-label="A mesa não começa com este baralho">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* buscar, filtrar e ordenar */}
      <div className={styles.ferramentas} role="search">
        <label className={styles.busca}>
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Buscar carta"
            aria-label="Buscar carta pelo nome ou pelo texto"
            value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          />
        </label>
        <div className={styles.chipsNaipe} role="group" aria-label="Naipe">
          {(['todos', ...NAIPES, 'livre'] as Filtro['naipe'][]).map((n) => {
            const Icone = n === 'todos' ? null : iconeDaClasse(n === 'livre' ? null : n)
            const rotulo = n === 'todos' ? 'Todos' : n === 'livre' ? 'Sem naipe' : n
            return (
              <button
                key={n}
                type="button"
                className={`${styles.chip} ${filtro.naipe === n ? styles.chipAtivo : ''}`}
                aria-pressed={filtro.naipe === n}
                aria-label={rotulo}
                title={rotulo}
                onClick={() => setFiltro({ ...filtro, naipe: n })}
              >
                {Icone ? <Icone size={16} aria-hidden /> : 'Todos'}
              </button>
            )
          })}
        </div>
        <select
          className={styles.select}
          value={filtro.raridade}
          aria-label="Raridade"
          onChange={(e) => setFiltro({ ...filtro, raridade: e.target.value as Filtro['raridade'] })}
        >
          <option value="todas">Toda raridade</option>
          {RARIDADES.map((x) => (
            <option key={x} value={x}>
              {NOMES_DE_RARIDADE[x]}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={filtro.ordem}
          aria-label="Ordem"
          onChange={(e) => setFiltro({ ...filtro, ordem: e.target.value as Ordem })}
        >
          <option value="custo">Por custo</option>
          <option value="nome">Por nome</option>
          <option value="raridade">Por raridade</option>
          <option value="naipe">Por naipe</option>
        </select>
        {filtrando ? (
          <button type="button" className={styles.limpar} onClick={() => setFiltro({ ...FILTRO_INICIAL, ordem: filtro.ordem })}>
            Limpar
          </button>
        ) : null}
      </div>

      {/* no celular as listas são abas; no desktop, colunas */}
      <div className={styles.abasListas}>
        <Segmentado
          rotulo="Que cartas mostrar"
          valor={aba}
          onChange={(v) => setAba(v as Aba)}
          opcoes={[
            { valor: 'dentro', rotulo: `No baralho ${conta.total}` },
            { valor: 'fora', rotulo: `Coleção ${totalFora}` },
            { valor: 'bloqueadas', rotulo: `Faltam ${bloqueadas.length}` },
          ]}
        />
      </div>

      <div className={styles.colunas} data-aba={aba}>
        <section
          ref={dentroRef}
          className={`${styles.coluna} ${styles.colunaDentro} ${sobre === 'dentro' ? styles.alvo : ''}`}
          aria-label="No baralho"
        >
          <div className={styles.colunaCabeca}>
            <h2>No baralho</h2>
            <span className={styles.qtd}>{conta.total}</span>
          </div>
          {dentro.length === 0 ? (
            <p className={styles.vazio}>
              {filtrando ? 'Nenhuma carta do baralho com esse filtro.' : 'Nenhuma carta no baralho ainda.'}
            </p>
          ) : (
            <div className={styles.grade}>
              {dentro.map((id) => (
                <div key={id} className={styles.celula}>
                  <Card
                    card={getCard(id)}
                    onOpen={() => setAberta(id)}
                    onPlay={() => mover(id, -1)}
                    semArraste={estreito}
                    dropRef={foraRef}
                    onDragOver={(v) => setSobre(v ? 'fora' : null)}
                  />
                  {contador(id)}
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          ref={foraRef}
          className={`${styles.coluna} ${styles.colunaFora} ${sobre === 'fora' ? styles.alvo : ''}`}
          aria-label="Na coleção, fora do baralho"
        >
          <div className={styles.colunaCabeca}>
            <h2>Coleção</h2>
            <span className={styles.qtd}>{totalFora}</span>
          </div>
          {fora.length === 0 ? (
            <p className={styles.vazio}>{filtrando ? 'Nada fora do baralho com esse filtro.' : 'Tudo que você tem está no baralho.'}</p>
          ) : (
            <div className={styles.grade}>
              {fora.map((id) => (
                <div key={id} className={styles.celula}>
                  <Card
                    card={getCard(id)}
                    onOpen={() => setAberta(id)}
                    onPlay={() => mover(id, +1)}
                    semArraste={estreito}
                    dropRef={dentroRef}
                    onDragOver={(v) => setSobre(v ? 'dentro' : null)}
                  />
                  {contador(id)}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${styles.coluna} ${styles.colunaBloqueadas}`} aria-label="Cartas que faltam">
          <div className={styles.colunaCabeca}>
            <h2>
              <Lock size={15} aria-hidden /> Faltam
            </h2>
            <span className={styles.qtd}>{bloqueadas.length}</span>
          </div>
          {bloqueadas.length === 0 ? (
            <p className={styles.vazio}>
              {filtrando ? 'Nenhuma com esse filtro.' : 'Você já tem pelo menos uma cópia de cada carta.'}
            </p>
          ) : (
            <div className={`${styles.grade} ${styles.gradeBloqueadas}`}>
              {bloqueadas.map((c) => (
                <div key={c.id} className={styles.celula}>
                  <Card card={c} locked onOpen={() => setAberta(c.id)} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {cartaAberta ? (
        <CardDetail card={cartaAberta} onClose={() => setAberta(null)}>
          {(colecao.tenho[cartaAberta.id] ?? 0) > 0 ? (
            <div className={styles.copias}>
              <span className={styles.copiasRotulo}>No baralho</span>
              <div className={styles.seletor}>
                <button
                  type="button"
                  className={buttons.button}
                  aria-label="Tirar uma cópia"
                  disabled={(baralho.cartas[cartaAberta.id] ?? 0) === 0}
                  onClick={() => mover(cartaAberta.id, -1)}
                >
                  <Minus size={14} aria-hidden />
                </button>
                <b className={styles.copiasNumero}>{baralho.cartas[cartaAberta.id] ?? 0}</b>
                <button
                  type="button"
                  className={buttons.button}
                  aria-label="Pôr uma cópia"
                  disabled={foraDoBaralho(colecao, baralho, cartaAberta.id) === 0 || cheio}
                  onClick={() => mover(cartaAberta.id, +1)}
                >
                  <Plus size={14} aria-hidden />
                </button>
              </div>
              <span className={styles.copiasDica}>
                Você tem {colecao.tenho[cartaAberta.id]} de {copiasMaximas(cartaAberta)} possíveis
                {cartaAberta.raridade && cartaAberta.raridade !== 'comum' ? ` · ${NOMES_DE_RARIDADE[cartaAberta.raridade]}` : ''}.
              </span>
            </div>
          ) : (
            <p className={styles.copiasDica}>Ainda não é sua: sai das recompensas e da máquina.</p>
          )}
          <MudancasDaCarta id={cartaAberta.id} />
        </CardDetail>
      ) : null}
    </main>
  )
}
