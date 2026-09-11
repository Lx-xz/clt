'use client'

/**
 * Quem está jogando agora.
 *
 * Há dois jeitos de chegar aqui: com conta (Supabase Auth — e-mail e senha ou
 * Google), quando o perfil vem do banco, ou como convidado, quando ele mora
 * só neste navegador. `convidado` é a diferença que o jogo inteiro consulta:
 * convidado joga tudo, mas não relata bug e perde o progresso ao sair.
 */
export interface Sessao {
  id: string
  nick: string
  nome: string | null
  email: string | null
  convidado: boolean
  admin: boolean
  pontos: number
}

/** O convidado não tem conta no Auth: a identidade dele é esta linha aqui. */
const CHAVE_CONVIDADO = 'clt:convidado:v1'
/**
 * Espelho do perfil de quem tem conta. Não é a verdade — a verdade é o
 * `meu_perfil()` — mas deixa a barra lateral e a mesa abrirem com o nick já
 * na tela em vez de piscar "carregando" a cada navegação.
 */
const CHAVE_PERFIL = 'clt:perfil:v1'

function ler(chave: string): Sessao | null {
  if (typeof window === 'undefined') return null
  try {
    const bruto = window.localStorage.getItem(chave)
    if (!bruto) return null
    const s = JSON.parse(bruto) as Partial<Sessao>
    if (!s.id || !s.nick) return null
    return {
      id: s.id,
      nick: s.nick,
      nome: s.nome ?? null,
      email: s.email ?? null,
      convidado: s.convidado === true,
      admin: s.admin === true,
      pontos: typeof s.pontos === 'number' ? s.pontos : 0,
    }
  } catch {
    return null
  }
}

function gravar(chave: string, sessao: Sessao) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(chave, JSON.stringify(sessao))
  } catch {
    // sem storage o jogador simplesmente entra de novo na próxima visita
  }
}

function apagar(chave: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(chave)
  } catch {
    // ignorado
  }
}

export const lerConvidado = () => ler(CHAVE_CONVIDADO)
export const gravarConvidado = (s: Sessao) => gravar(CHAVE_CONVIDADO, s)
export const limparConvidado = () => apagar(CHAVE_CONVIDADO)

export const lerPerfilLocal = () => ler(CHAVE_PERFIL)
export const gravarPerfilLocal = (s: Sessao) => gravar(CHAVE_PERFIL, s)
export const limparPerfilLocal = () => apagar(CHAVE_PERFIL)

/** Qualquer sessão conhecida neste navegador, conta ou convidado. */
export function lerSessao(): Sessao | null {
  return lerPerfilLocal() ?? lerConvidado()
}

export function limparSessao() {
  limparPerfilLocal()
  limparConvidado()
}
