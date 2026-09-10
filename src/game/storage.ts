import { ACTION_CARDS, STARTER_CARDS } from './cards'
import type { CardId, Collection } from './types'

const COLLECTION_KEY = 'clt:collection:v1'
const RUN_KEY = 'clt:run:v1'

export function defaultCollection(): Collection {
  return { equipped: STARTER_CARDS.map((c) => c.id), unequipped: [] }
}

/** Cartas que ainda não foram desbloqueadas por nenhuma recompensa. */
export function lockedCards(collection: Collection): CardId[] {
  const owned = new Set([...collection.equipped, ...collection.unequipped])
  return ACTION_CARDS.filter((c) => !owned.has(c.id)).map((c) => c.id)
}

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage indisponível (aba anônima, cota cheia) — o jogo segue sem salvar
  }
}

export function loadCollection(): Collection {
  const stored = read<Partial<Collection>>(COLLECTION_KEY)
  if (!stored || !Array.isArray(stored.equipped)) return defaultCollection()
  const known = new Set(ACTION_CARDS.map((c) => c.id))
  const equipped = stored.equipped.filter((id) => known.has(id))
  const unequipped = (stored.unequipped ?? []).filter((id) => known.has(id) && !equipped.includes(id))
  return { equipped, unequipped }
}

export function saveCollection(collection: Collection) {
  write(COLLECTION_KEY, collection)
}

export function loadRun<T>(): T | null {
  return read<T>(RUN_KEY)
}

export function saveRun(run: unknown) {
  write(RUN_KEY, run)
}

export function clearRun() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(RUN_KEY)
  } catch {
    // ignorado
  }
}

/** Desbloqueia uma carta ganha como recompensa (entra fora do baralho). */
export function unlockCard(cardId: CardId) {
  const collection = loadCollection()
  if (collection.equipped.includes(cardId) || collection.unequipped.includes(cardId)) return
  collection.unequipped.push(cardId)
  saveCollection(collection)
}
