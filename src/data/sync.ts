import { clearRun, loadCollection, loadRun, runUsavel, saveCollection, saveRun } from '@/game/storage'
import type { Collection, GameState } from '@/game/types'
import { baixarSave, registrarRun, subirSave } from './saves'

export type StatusSync = 'ocioso' | 'salvando' | 'salvo' | 'erro'

/** Espera antes de subir, para jogar carta não virar uma escrita por clique. */
const ESPERA_MS = 900

let timer: ReturnType<typeof setTimeout> | null = null

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
      if (run && run.outcome !== 'jogando') await registrarRun(playerId, run)
      onStatus('salvo')
    } catch {
      onStatus('erro')
    }
  }, ESPERA_MS)
}
