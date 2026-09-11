'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import HistoricoDaCarta from '@/components/HistoricoDaCarta'
import { versaoDoBaralho } from '@/data/balanceamento'
import { cartasDoJogo, getCard } from '@/game/catalogo'
import { carregarDoBanco, sincronizar, type StatusSync } from '@/data/sync'
import { useSessao } from '@/components/SessaoGuard'
import { defaultCollection, loadCollection, loadRun, lockedCards, saveCollection } from '@/game/storage'
import type { GameState } from '@/game/types'
import type { CardId, Collection } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './baralho.module.sass'

export default function BaralhoPage() {
  const [collection, setCollection] = useState<Collection | null>(null)
  const [status, setStatus] = useState<StatusSync>('ocioso')
  const [historico, setHistorico] = useState<CardId | null>(null)
  const sessao = useSessao()

  useEffect(() => {
    let vivo = true
    carregarDoBanco(sessao.id)
      .then((dados) => {
        if (vivo) setCollection(dados.collection)
      })
      .catch(() => {
        // sem banco o baralho ainda abre pelo espelho local
        if (vivo) setCollection(loadCollection())
      })
    return () => {
      vivo = false
    }
  }, [sessao.id])

  function update(next: Collection) {
    saveCollection(next)
    setCollection(next)
    sincronizar(sessao.id, loadRun<GameState>(), next, setStatus)
  }

  function unequip(id: CardId) {
    if (!collection) return
    update({
      equipped: collection.equipped.filter((c) => c !== id),
      unequipped: [...collection.unequipped, id],
    })
  }

  function equip(id: CardId) {
    if (!collection) return
    update({
      equipped: [...collection.equipped, id],
      unequipped: collection.unequipped.filter((c) => c !== id),
    })
  }

  if (!collection) {
    return (
      <main className="page">
        <p className={styles.empty}>Carregando o baralho…</p>
      </main>
    )
  }

  const locked = lockedCards(collection)
  const deckSize = collection.equipped.reduce((total, id) => {
    const card = getCard(id)
    return total + (card.starter ? (card.copies ?? 1) : 1)
  }, 0)

  return (
    <main className="page">
      <div className={styles.top}>
        <div className={styles.tituloLinha}>
          <h1 className={styles.title}>Baralho</h1>
          <span className={styles.versao}>v{versaoDoBaralho()}</span>
        </div>
        <div className={styles.tools}>
          <button
            type="button"
            className={`${buttons.button} ${buttons.ghost}`}
            onClick={() => update({ equipped: cartasDoJogo().map((c) => c.id), unequipped: [] })}
          >
            Desbloquear tudo (teste)
          </button>
          <button
            type="button"
            className={`${buttons.button} ${buttons.ghost}`}
            onClick={() => update(defaultCollection())}
          >
            Resetar
          </button>
        </div>
      </div>
      <p className={styles.hint}>
        Clique numa carta para tirá-la ou colocá-la no baralho; em <b>histórico</b> para ver o que
        já mudou nela. A montagem vale para a próxima run.
        {status === 'salvando' ? ' Salvando…' : status === 'salvo' ? ' Salvo.' : status === 'erro' ? ' Sem conexão — guardado local.' : ''}
      </p>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Equipadas</h2>
          <span className={styles.count}>
            {collection.equipped.length} tipos · {deckSize} cartas
          </span>
        </div>
        {collection.equipped.length === 0 ? (
          <p className={styles.empty}>Nenhuma carta no baralho — você não vai longe assim.</p>
        ) : (
          <div className={styles.grid}>
            {collection.equipped.map((id) => {
              const card = getCard(id)
              return (
                <div key={id} className={styles.celula}>
                  <Card
                    card={card}
                    copies={card.starter ? (card.copies ?? 1) : 1}
                    onOpen={() => unequip(id)}
                  />
                  <button type="button" className={styles.historico} onClick={() => setHistorico(id)}>
                    histórico
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Não equipadas</h2>
          <span className={styles.count}>{collection.unequipped.length}</span>
        </div>
        {collection.unequipped.length === 0 ? (
          <p className={styles.empty}>Tudo que você tem está no baralho.</p>
        ) : (
          <div className={styles.grid}>
            {collection.unequipped.map((id) => (
              <div key={id} className={styles.celula}>
                <Card card={getCard(id)} onOpen={() => equip(id)} />
                <button type="button" className={styles.historico} onClick={() => setHistorico(id)}>
                  histórico
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.head}>
          <h2>Bloqueadas</h2>
          <span className={styles.count}>{locked.length}</span>
        </div>
        {locked.length === 0 ? (
          <p className={styles.empty}>Você já desbloqueou tudo.</p>
        ) : (
          <div className={styles.grid}>
            {locked.map((id) => (
              <div key={id} className={styles.celula}>
                <Card card={getCard(id)} locked />
                <button type="button" className={styles.historico} onClick={() => setHistorico(id)}>
                  histórico
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {historico ? <HistoricoDaCarta id={historico} onFechar={() => setHistorico(null)} /> : null}
    </main>
  )
}
