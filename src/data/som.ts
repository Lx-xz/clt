'use client'

/**
 * Volume, e só. Dois números de 0 a 1 no localStorage: o geral, que vale para
 * tudo que tocar, e o da música, que multiplica o geral. Efeitos sonoros ainda
 * não existem — quando existirem, entram aqui como mais um multiplicador.
 */
export interface Volumes {
  geral: number
  musica: number
  mudo: boolean
  /** Fora da mesa a trilha toca baixinho, para não competir com a leitura. */
  baixaFora: boolean
}

const CHAVE = 'clt:som:v1'

export const VOLUMES_PADRAO: Volumes = { geral: 0.7, musica: 0.5, mudo: false, baixaFora: true }

/** Quanto do volume normal sobra fora da mesa. */
export const FATOR_FORA = 0.3

function limitar(n: unknown, padrao: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : padrao
}

export function lerVolumes(): Volumes {
  if (typeof window === 'undefined') return VOLUMES_PADRAO
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    if (!bruto) return VOLUMES_PADRAO
    const v = JSON.parse(bruto) as Partial<Volumes>
    return {
      geral: limitar(v.geral, VOLUMES_PADRAO.geral),
      musica: limitar(v.musica, VOLUMES_PADRAO.musica),
      mudo: v.mudo === true,
      // ausente no save antigo: o padrão é abaixar, que é o comportamento
      // que a pessoa esperaria sem nunca ter mexido no ajuste
      baixaFora: v.baixaFora !== false,
    }
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

/**
 * A trilha agora toca no site inteiro, e não só na mesa. Fora dela ela cai
 * para uma fração do volume: música em cima de texto atrapalha a leitura, e
 * quem está lendo o ranking não pediu trilha sonora — mas cortar de vez fazia
 * o som entrar e sair a cada clique, o que é pior que os dois.
 */
export function volumeDaMusica(v: Volumes, naMesa: boolean): number {
  if (v.mudo) return 0
  const base = v.geral * v.musica
  return naMesa || !v.baixaFora ? base : base * FATOR_FORA
}
