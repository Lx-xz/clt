'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import { ACTION_CARDS, getCard } from '@/game/cards'
import { defaultCollection, loadCollection, lockedCards, saveCollection } from '@/game/storage'
import type { CardId, Collection } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './baralho.module.sass'

export default function BaralhoPage() {
  const [collection, setCollection] = useState<Collection | null>(null)

  useEffect(() => {
    setCollection(loadCollection())
  }, [])

  function update(next: Collection) {
    saveCollection(next)
    setCollection(next)
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
        <h1 className={styles.title}>Baralho</h1>
        <div className={styles.tools}>
          <button
            type="button"
            className={`${buttons.button} ${buttons.ghost}`}
            onClick={() => update({ equipped: ACTION_CARDS.map((c) => c.id), unequipped: [] })}
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
          <Link className={buttons.button} href="/">
            Início
          </Link>
        </div>
      </div>
      <p className={styles.hint}>
        Clique numa carta para tirá-la ou colocá-la no baralho. A montagem vale para a próxima run.
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
                <Card
                  key={id}
                  card={card}
                  count={card.starter ? (card.copies ?? 1) : 1}
                  onClick={() => unequip(id)}
                />
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
              <Card key={id} card={getCard(id)} onClick={() => equip(id)} />
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
              <Card key={id} card={getCard(id)} locked />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
