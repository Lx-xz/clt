'use client'

/**
 * Volume, e só. Dois números de 0 a 1 no localStorage: o geral, que vale para
 * tudo que tocar, e o da música, que multiplica o geral. Efeitos sonoros ainda
 * não existem — quando existirem, entram aqui como mais um multiplicador.
 */
export interface Volumes {
  geral: number
  musica: number
}

const CHAVE = 'clt:som:v1'

export const VOLUMES_PADRAO: Volumes = { geral: 0.7, musica: 0.5 }

function limitar(n: unknown, padrao: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : padrao
}

export function lerVolumes(): Volumes {
  if (typeof window === 'undefined') return VOLUMES_PADRAO
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    if (!bruto) return VOLUMES_PADRAO
    const v = JSON.parse(bruto) as Partial<Volumes>
    return { geral: limitar(v.geral, VOLUMES_PADRAO.geral), musica: limitar(v.musica, VOLUMES_PADRAO.musica) }
  } catch {
    return VOLUMES_PADRAO
  }
}

export function gravarVolumes(v: Volumes) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(v))
  } catch {
    // sem storage o volume só não é lembrado na próxima visita
  }
  window.dispatchEvent(new CustomEvent(EVENTO_VOLUME, { detail: v }))
}

/** A música escuta isto para mudar de volume enquanto o jogador arrasta. */
export const EVENTO_VOLUME = 'clt:volumes'

export function volumeDaMusica(v: Volumes): number {
  return v.geral * v.musica
}
