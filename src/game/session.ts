'use client'

/** Quem está jogando agora. Só o nick e o id — nada de credencial. */
export interface Sessao {
  id: string
  nick: string
}

const CHAVE = 'clt:sessao:v1'

export function lerSessao(): Sessao | null {
  if (typeof window === 'undefined') return null
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    if (!bruto) return null
    const s = JSON.parse(bruto) as Partial<Sessao>
    return s.id && s.nick ? { id: s.id, nick: s.nick } : null
  } catch {
    return null
  }
}

export function gravarSessao(sessao: Sessao) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(sessao))
  } catch {
    // sem storage o jogador simplesmente entra de novo na próxima visita
  }
}

export function limparSessao() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CHAVE)
  } catch {
    // ignorado
  }
}
