import { clearRun, loadCollection, loadRun, runUsavel, saveCollection, saveRun } from '@/game/storage'
import type { Collection, GameState } from '@/game/types'
import {
  enviarRun,
  montarRun,
  subirSave,
  baixarSave,
  type DesfechoRegistrado,
  type RunRegistravel,
} from './saves'

export type StatusSync = 'ocioso' | 'salvando' | 'salvo' | 'erro'

/** Espera antes de subir, para jogar carta não virar uma escrita por clique. */
const ESPERA_MS = 900

let timer: ReturnType<typeof setTimeout> | null = null

/** Cancela uma subida ainda pendente — ao trocar de conta, por exemplo. */
export function cancelarSync() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

/**
 * O banco é a fonte da verdade. O localStorage fica como espelho para a mesa
 * abrir instantânea e o jogo não morrer se a conexão cair no meio do dia.
 */
export async function carregarDoBanco(
  playerId: string,
): Promise<{ run: GameState | null; collection: Collection }> {
  const remoto = await baixarSave(playerId)

  const runRemota = runUsavel(remoto.run) ? (remoto.run as GameState) : null
  const run = runRemota ?? loadRun<GameState>()
  const collection = remoto.collection ?? loadCollection()

  // espelha o que veio do banco
  if (run) saveRun(run)
  else clearRun()
  saveCollection(collection)

  // primeiro acesso deste jogador: sobe o que já existia no espelho local
  if (!runRemota && (run || remoto.collection === null)) {
    await subirSave(playerId, run, collection).catch(() => {})
  }

  return { run, collection }
}

export function sincronizar(
  playerId: string,
  run: GameState | null,
  collection: Collection,
  onStatus: (s: StatusSync) => void,
) {
  // espelho local é imediato; a subida espera o jogador parar de clicar
  if (run) saveRun(run)
  saveCollection(collection)

  onStatus('salvando')
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    timer = null
    try {
      await subirSave(playerId, run, collection)
      onStatus('salvo')
    } catch {
      onStatus('erro')
    }
  }, ESPERA_MS)
}

// ------------------------------------------------------- runs terminadas
//
// O registro da run terminada NÃO pode viver no timer acima. Ele já viveu, e
// era um bug: começar uma run nova (ou trocar de página) dentro dos 900ms
// cancelava o timer, e a run que tinha acabado de terminar nunca chegava ao
// banco. Some sem erro nenhum na tela. Agora vai na hora, e o que falhar
// espera numa fila no localStorage até a próxima abertura do jogo.

const FILA_KEY = 'clt:runs-pendentes:v1'

function lerFila(): RunRegistravel[] {
  if (typeof window === 'undefined') return []
  try {
    const bruto = window.localStorage.getItem(FILA_KEY)
    const lista: unknown = bruto ? JSON.parse(bruto) : []
    return Array.isArray(lista) ? (lista as RunRegistravel[]) : []
  } catch {
    return []
  }
}

function escreverFila(lista: RunRegistravel[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FILA_KEY, JSON.stringify(lista))
  } catch {
    // storage cheio ou indisponível — sem fila, mas o jogo segue
  }
}

function enfileirar(linha: RunRegistravel) {
  const fila = lerFila().filter((l) => l.run_id !== linha.run_id)
  fila.push(linha)
  escreverFila(fila)
}

/**
 * Grava a run terminada agora. Se falhar (offline, banco fora, esquema
 * desatualizado), ela entra na fila e sobe depois — nunca se perde em
 * silêncio.
 */
export async function registrarRunAgora(
  playerId: string,
  run: GameState,
  outcome: DesfechoRegistrado,
  visivel = true,
): Promise<string | null> {
  const linha = montarRun(playerId, run, outcome, visivel)
  try {
    await enviarRun(linha)
    return null
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e)
    // engolir o erro aqui já custou caro: a run sumia e ninguém — nem o
    // jogador, nem o console — sabia por quê. O banco recusar a linha (coluna
    // que falta, política de RLS, esquema desatualizado) tem que aparecer.
    console.error('CLT: o banco recusou o registro da run —', motivo, linha)
    enfileirar(linha)
    return motivo
  }
}

/** Tenta subir o que ficou para trás. Chamado ao abrir a mesa. */
export async function enviarRunsPendentes(): Promise<number> {
  const fila = lerFila()
  if (fila.length === 0) return 0
  const sobraram: RunRegistravel[] = []
  for (const linha of fila) {
    try {
      await enviarRun(linha)
    } catch (e) {
      console.error('CLT: run da fila continua sem subir —', e, linha)
      sobraram.push(linha)
    }
  }
  escreverFila(sobraram)
  return fila.length - sobraram.length
}

/** Quantas runs terminadas ainda não chegaram ao banco. */
export function runsPendentes(): number {
  return lerFila().length
}
