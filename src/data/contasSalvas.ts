'use client'

import type { Session } from '@supabase/supabase-js'
import { lerAvatar, type Avatar } from './avatar'
import { supabase } from './supabase'
import { descarregarSync, enviarRunsPendentes, runsPendentes } from './sync'
import { limparLocalDoJogo } from '@/game/storage'
import { limparSessao, type Sessao } from '@/game/session'

/**
 * As contas que já entraram NESTE aparelho, para trocar de uma para outra sem
 * sair (como no YouTube).
 *
 * O Supabase guarda uma sessão só. Para guardar várias, cada conta que entra
 * deixa aqui a própria sessão (o par de tokens), e trocar é devolver ao
 * Supabase a sessão guardada da outra (`setSession`) — sem `signOut`, que
 * REVOGARIA a sessão de quem está saindo e a deixaria impossível de reabrir.
 *
 * O token de renovação muda a cada renovação (o Supabase gira o token), então
 * a da conta EM USO é regravada a cada mudança de sessão (o ouvinte no fim do
 * arquivo); a de quem está guardado só muda quando ela volta a ser usada.
 *
 * A chave é `clt-contas`, e não `clt:`, DE PROPÓSITO: `limparLocalDoJogo`
 * apaga tudo que começa com `clt:` a cada troca, e a lista tem que sobreviver
 * a ela. O que mora aqui é o que o próprio Supabase já guarda no aparelho
 * (a sessão), mais o nick, o avatar e o e-mail de cada conta — e só aparece
 * para quem abre este navegador. Convidado não entra: ele não tem sessão.
 */
const CHAVE = 'clt-contas:v1'

export interface ContaSalva {
  id: string
  nick: string
  avatar: Avatar
  email: string | null
  /** Nulo quando a sessão guardada não vale mais: a conta aparece, mas pede
   *  a senha de novo. */
  acesso: string | null
  renovacao: string | null
  /** Quando foi usada pela última vez, para a mais recente vir primeiro. */
  usadaEm: number
}

function ler(): ContaSalva[] {
  if (typeof window === 'undefined') return []
  try {
    const lista: unknown = JSON.parse(window.localStorage.getItem(CHAVE) ?? '[]')
    if (!Array.isArray(lista)) return []
    return lista
      .filter((c): c is ContaSalva => typeof c?.id === 'string' && typeof c?.nick === 'string')
      .map((c) => ({ ...c, avatar: lerAvatar(c.avatar) }))
  } catch {
    return []
  }
}

function escrever(lista: ContaSalva[]) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista))
  } catch {
    // sem storage, sem lista: entrar continua funcionando como antes
  }
}

/** As contas deste aparelho, a usada por último primeiro. */
export function contasSalvas(): ContaSalva[] {
  return ler().sort((a, b) => b.usadaEm - a.usadaEm)
}

/**
 * Lembra a conta em uso, com a sessão de agora. Chamado por `lerConta`
 * sempre que uma conta completa (com nick) está logada: é assim que ela
 * entra na lista e que o nick e o avatar ficam em dia.
 */
export async function lembrarConta(perfil: Sessao) {
  if (!supabase || perfil.convidado) return
  const { data } = await supabase.auth.getSession()
  const sessao = data.session
  if (!sessao || sessao.user.id !== perfil.id) return
  const lista = ler().filter((c) => c.id !== perfil.id)
  lista.push({
    id: perfil.id,
    nick: perfil.nick,
    avatar: perfil.avatar,
    email: perfil.email,
    acesso: sessao.access_token,
    renovacao: sessao.refresh_token,
    usadaEm: Date.now(),
  })
  escrever(lista)
}

/** Troca só o desenho guardado: o avatar mudou e a lista não pode mostrar o velho. */
export function atualizarAvatarSalvo(id: string, avatar: Avatar) {
  const lista = ler()
  const conta = lista.find((c) => c.id === id)
  if (!conta) return
  conta.avatar = avatar
  escrever(lista)
}

/** Tira a conta deste aparelho. Não mexe na conta em si, nem a desloga em
 *  outro lugar: só esquece a sessão guardada aqui. */
export function esquecerConta(id: string) {
  escrever(ler().filter((c) => c.id !== id))
}

function guardarTokens(sessao: Session) {
  const lista = ler()
  const conta = lista.find((c) => c.id === sessao.user.id)
  if (!conta) return
  conta.acesso = sessao.access_token
  conta.renovacao = sessao.refresh_token
  escrever(lista)
}

/**
 * Antes de outra conta entrar: sobe o que a de agora ainda não subiu e
 * guarda a sessão dela. Recusa (com o motivo) se uma partida terminada não
 * conseguiu subir: a fila de partidas por gravar é do aparelho, e limpá-la
 * para a próxima conta perderia aquela partida.
 */
export async function prepararTroca(): Promise<string | null> {
  await descarregarSync().catch(() => {})
  if (runsPendentes() > 0) await enviarRunsPendentes().catch(() => 0)
  if (runsPendentes() > 0) {
    return 'Uma partida terminada ainda não foi salva. Confira a conexão e tente de novo.'
  }
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    if (data.session) guardarTokens(data.session)
  }
  return null
}

/** Depois de a outra conta entrar: o espelho local era da conta anterior. */
export function concluirTroca() {
  limparLocalDoJogo()
  limparSessao()
}

/** A raiz do site, com o `/clt` do Pages. Trocar de conta é recarregar
 *  tudo, como sair: catálogo, sessão e o que estiver em memória. */
export function recomecarSite(rota = '') {
  window.location.replace(`${process.env.__NEXT_ROUTER_BASEPATH ?? ''}/${rota}`)
}

/**
 * Passa a usar a conta guardada. Devolve o motivo quando não deu: aí a
 * sessão guardada não vale mais (senha trocada, sessão revogada) e a conta
 * pede para entrar de novo.
 */
export async function trocarDeConta(id: string): Promise<{ ok: true } | { ok: false; motivo: string; precisaEntrar: boolean }> {
  const alvo = ler().find((c) => c.id === id)
  if (!supabase) return { ok: false, motivo: 'O banco não está configurado.', precisaEntrar: false }
  if (!alvo?.acesso || !alvo.renovacao) {
    return { ok: false, motivo: 'Esta conta precisa entrar de novo.', precisaEntrar: true }
  }
  const problema = await prepararTroca()
  if (problema) return { ok: false, motivo: problema, precisaEntrar: false }

  const { data, error } = await supabase.auth.setSession({ access_token: alvo.acesso, refresh_token: alvo.renovacao })
  if (error || !data.session) {
    // a sessão guardada morreu: esquece os tokens, mas a conta continua na
    // lista, para entrar de novo com um toque
    const lista = ler()
    const conta = lista.find((c) => c.id === id)
    if (conta) {
      conta.acesso = null
      conta.renovacao = null
      escrever(lista)
    }
    return { ok: false, motivo: 'A sessão desta conta expirou. Entre de novo.', precisaEntrar: true }
  }
  guardarTokens(data.session)
  concluirTroca()
  return { ok: true }
}

// a conta em uso renova o token sozinha; sem isto, a lista guardaria um
// token de renovação já gasto, e voltar para ela pediria a senha
if (typeof window !== 'undefined' && supabase) {
  supabase.auth.onAuthStateChange((_evento, sessao) => {
    if (sessao) guardarTokens(sessao)
  })
}
