import { ACTION_CARDS, STARTER_CARDS } from './cards'
import type { CardId, Collection } from './types'

const COLLECTION_KEY = 'clt:collection:v1'
// v6: as cartas viraram lista de ações. O estado perdeu `meetingsToday` e
// `usedPuxarOSaco`, ganhou `usadasNaRun`, `maoDoDia` e o retrato do baralho
// (`baralho`) — uma run da v5 não tem nenhum dos três e quebraria a mesa.
const RUN_KEY = 'clt:run:v6'
const RUN_KEYS_ANTIGAS = ['clt:run:v1', 'clt:run:v2', 'clt:run:v3', 'clt:run:v4', 'clt:run:v5']

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

/** Campos que a mesa lê direto; sem qualquer um deles a run é velha demais. */
const CAMPOS_DA_RUN = [
  'runId', 'baralho', 'usadasNaRun', 'maoDoDia', 'startedAt', 'maxCombo', 'cardsPlayed', 'daysNoRest', 'maxDaysNoRest',
  'day', 'phase', 'energy', 'stress', 'productivity', 'money',
  'deck', 'hand', 'discard', 'playedToday', 'eventRevealed', 'outcome', 'history',
] as const

/**
 * Um estado de versão antiga não tem os campos que a mesa lê e derruba a
 * página. Vale para o save local e para o que vier do banco.
 */
export function runUsavel(bruta: unknown): boolean {
  if (!bruta || typeof bruta !== 'object') return false
  const obj = bruta as Record<string, unknown>
  return CAMPOS_DA_RUN.every((campo) => obj[campo] !== undefined)
}

/**
 * Devolve a run salva só quando ela tem o formato desta versão. Um estado de
 * versão antiga é descartado em vez de derrubar a página.
 */
export function loadRun<T>(): T | null {
  descartarRunsAntigas()
  const bruta = read<Record<string, unknown>>(RUN_KEY)
  if (!runUsavel(bruta)) {
    clearRun()
    return null
  }
  return bruta as T
}

function descartarRunsAntigas() {
  if (typeof window === 'undefined') return
  for (const chave of RUN_KEYS_ANTIGAS) {
    try {
      window.localStorage.removeItem(chave)
    } catch {
      // ignorado
    }
  }
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

/**
 * Apaga todo o espelho local do jogo (run, coleção, sessão e chaves de versões
 * antigas). Usado ao trocar de conta: sem isso o save de um nick poderia ser
 * enviado para o próximo jogador que entrasse neste navegador.
 */
export function limparLocalDoJogo() {
  if (typeof window === 'undefined') return
  try {
    const alvos = Object.keys(window.localStorage).filter((c) => c.startsWith('clt:'))
    for (const chave of alvos) window.localStorage.removeItem(chave)
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
