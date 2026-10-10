'use client'

import { Minus, Pencil, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import BotaoConfirmar from '@/components/BotaoConfirmar'
import Card from '@/components/Card'
import CardDetail from '@/components/CardDetail'
import { MudancasDaCarta } from '@/components/HistoricoDaCarta'
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
import type { CardId, Collection, GameState } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './baralho.module.sass'

/**
 * A montagem do baralho, por CÓPIA.
 *
 * Clicar numa carta tirava todas as cópias dela de uma vez — quatro Tarefas
 * Simples saíam juntas, quando a pessoa queria tirar duas. Hoje:
 *  - clique duplo, ou arrastar até a outra coluna, move UMA cópia;
 *  - o clique simples abre o detalhe, com o seletor de cópias e o histórico
 *    da carta (que era um link embaixo de cada carta — uma segunda porta
 *    para a mesma carta).
 *
 * O arraste é o mesmo da mesa (`onPlay` + `dropRef` do `Card`): soltar sobre a
 * outra coluna é "jogar" a carta para lá.
 */
export default function BaralhoPage() {
  const [colecao, setColecao] = useState<Collection | null>(null)
  const [status, setStatus] = useState<StatusSync>('ocioso')
  const [aberta, setAberta] = useState<CardId | null>(null)
  const [sobre, setSobre] = useState<'dentro' | 'fora' | null>(null)
  const [renomeando, setRenomeando] = useState<string | null>(null)
  const dentroRef = useRef<HTMLElement>(null)
  const foraRef = useRef<HTMLElement>(null)
  const sessao = useSessao()

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
        <p className={styles.empty}>Carregando o baralho…</p>
      </main>
    )
  }

  const baralho = baralhoAtivo(colecao)
  const r = regras()
  const conta = contarBaralho(baralho)
  const problemas = problemasDoBaralho(baralho, r)
  const dentro = Object.keys(baralho.cartas)
  const fora = Object.keys(colecao.tenho).filter((id) => foraDoBaralho(colecao, baralho, id) > 0)
  const bloqueadas = cartasBloqueadas(colecao)

  function mover(id: CardId, delta: number) {
    if (!colecao) return
    update(moverCopias(colecao, baralho.id, id, delta))
  }

  const cartaAberta = aberta ? getCard(aberta) : null

  return (
    <main className="page">
      <div className={styles.top}>
        <div className={styles.tituloLinha}>
          <h1 className={styles.title}>Baralho</h1>
          <span className={styles.versao}>v{versaoDoBaralho()}</span>
        </div>
      </div>
      <p className={styles.hint}>
        Clique duplo ou arraste para a outra coluna move uma cópia; o clique abre a carta, com as
        cópias e o histórico dela. O baralho equipado é o da próxima run.
        {status === 'salvando' ? ' Salvando…' : status === 'salvo' ? ' Salvo.' : status === 'erro' ? ' Sem conexão — guardado local.' : ''}
      </p>

      {/* os baralhos montados: até três, um equipado */}
      <div className={styles.baralhos}>
        <Segmentado
          rotulo="Baralho equipado"
          valor={baralho.id}
          onChange={(id) => update(ativarBaralho(colecao, id))}
          opcoes={colecao.baralhos.map((b) => ({ valor: b.id, rotulo: b.nome }))}
        />
        <div className={styles.acoesBaralho}>
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
            <button type="button" className={buttons.button} onClick={() => setRenomeando(baralho.nome)}>
              <Pencil size={14} aria-hidden /> Renomear
            </button>
          )}
          {colecao.baralhos.length < MAXIMO_DE_BARALHOS ? (
            <button type="button" className={buttons.button} onClick={() => update(novoBaralho(colecao))}>
              <Plus size={14} aria-hidden /> Novo (cópia deste)
            </button>
          ) : null}
          {colecao.baralhos.length > 1 ? (
            <BotaoConfirmar
              className={buttons.button}
              armado="Confirmar: apagar"
              onConfirmar={() => update(apagarBaralho(colecao, baralho.id))}
            >
              Apagar
            </BotaoConfirmar>
          ) : null}
        </div>
      </div>

      {/* a conta sempre à vista: o total contra os limites, e cada naipe
          contra o mínimo. É ela que diz por que a mesa não aceita */}
      <div className={styles.conta}>
        <span className={`${styles.total} ${conta.total < r.baralhoMinimo || conta.total > r.baralhoMaximo ? styles.ruim : ''}`}>
          <b>{conta.total}</b> cartas · {r.baralhoMinimo}–{r.baralhoMaximo}
        </span>
        {NAIPES.map((n) => (
          <span key={n} className={`${styles.naipe} ${conta.porNaipe[n] < r.minimoPorNaipe ? styles.ruim : ''}`}>
            {n} <b>{conta.porNaipe[n]}</b>/{r.minimoPorNaipe}
          </span>
        ))}
        {conta.semNaipe > 0 ? (
          <span className={styles.naipe}>
            sem naipe <b>{conta.semNaipe}</b>
          </span>
        ) : null}
      </div>
      {problemas.length > 0 ? (
        <div className={styles.problemas} role="status">
          <b>A mesa não começa com este baralho:</b>
          <ul>
            {problemas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.colunas}>
        <section
          ref={dentroRef}
          className={`${styles.section} ${sobre === 'dentro' ? styles.alvo : ''}`}
          aria-label="No baralho"
        >
          <div className={styles.head}>
            <h2>No baralho</h2>
            <span className={styles.count}>{conta.total}</span>
          </div>
          {dentro.length === 0 ? (
            <p className={styles.empty}>Nenhuma carta no baralho. Arraste da coluna ao lado.</p>
          ) : (
            <div className={styles.grid}>
              {dentro.map((id) => (
                <Card
                  key={id}
                  card={getCard(id)}
                  copies={baralho.cartas[id]}
                  onOpen={() => setAberta(id)}
                  onPlay={() => mover(id, -1)}
                  dropRef={foraRef}
                  onDragOver={(s) => setSobre(s ? 'fora' : null)}
                />
              ))}
            </div>
          )}
        </section>

        <section
          ref={foraRef}
          className={`${styles.section} ${sobre === 'fora' ? styles.alvo : ''}`}
          aria-label="Fora do baralho"
        >
          <div className={styles.head}>
            <h2>Fora</h2>
            <span className={styles.count}>{fora.reduce((t, id) => t + foraDoBaralho(colecao, baralho, id), 0)}</span>
          </div>
          {fora.length === 0 ? (
            <p className={styles.empty}>Tudo que você tem está no baralho.</p>
          ) : (
            <div className={styles.grid}>
              {fora.map((id) => (
                <Card
                  key={id}
                  card={getCard(id)}
                  copies={foraDoBaralho(colecao, baralho, id)}
                  onOpen={() => setAberta(id)}
                  onPlay={() => mover(id, +1)}
                  dropRef={dentroRef}
                  onDragOver={(s) => setSobre(s ? 'dentro' : null)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Bloqueadas</h2>
          <span className={styles.count}>{bloqueadas.length}</span>
        </div>
        {bloqueadas.length === 0 ? (
          <p className={styles.empty}>Você já tem pelo menos uma cópia de cada carta.</p>
        ) : (
          <div className={styles.grid}>
            {bloqueadas.map((c) => (
              <Card key={c.id} card={c} locked onOpen={() => setAberta(c.id)} />
            ))}
          </div>
        )}
      </section>

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
                  disabled={foraDoBaralho(colecao, baralho, cartaAberta.id) === 0}
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
            <p className={styles.copiasDica}>
              Ainda bloqueada: sai como recompensa no fim de uma run.
            </p>
          )}
          <MudancasDaCarta id={cartaAberta.id} />
        </CardDetail>
      ) : null}
    </main>
  )
}
