'use client'

import { faltaFuncao } from './jogadores'
import { lerAvatar, type Avatar } from './avatar'
import { supabase } from './supabase'

/**
 * Amizades. Tudo passa por função do banco, que confere `auth.uid()` por
 * dentro — a tabela não tem política nem grant, como `feedbacks`. O que sai
 * de lá sobre a outra pessoa é o mesmo que o ranking já mostra: nick e
 * avatar, e a última partida guardada.
 *
 * Convidado não tem amizade: ele não tem conta para receber o aviso, e o
 * perfil dele some quando ele sai.
 */

/** Como a amizade com uma pessoa está, vista de quem pergunta. */
export type EstadoDaAmizade = 'nenhuma' | 'enviado' | 'recebido' | 'amigos' | 'eu' | 'sem_conta'

export interface Amigo {
  nick: string
  avatar: Avatar
  ultima_id: number | null
  ultima_outcome: string | null
  ultima_money: number | null
  ultima_em: string | null
}

export interface Pedido {
  nick: string
  avatar: Avatar
  criada_em: string
}

function banco() {
  if (!supabase) throw new Error('O banco não está configurado neste site.')
  return supabase
}

/** Null quando o banco ainda não tem as amizades (schema antigo). */
export async function amizadeCom(nick: string): Promise<EstadoDaAmizade | null> {
  const { data, error } = await banco().rpc('amizade_com', { p_nick: nick })
  if (error) {
    if (faltaFuncao(error)) return null
    throw new Error(error.message)
  }
  return (data as EstadoDaAmizade | null) ?? 'nenhuma'
}

export async function pedirAmizade(nick: string): Promise<EstadoDaAmizade> {
  const { data, error } = await banco().rpc('pedir_amizade', { p_nick: nick })
  if (error) throw new Error(error.message)
  // o banco responde com o estado da LINHA; aqui ele vira o estado da tela
  return data === 'aceita' ? 'amigos' : 'enviado'
}

export async function responderAmizade(nick: string, aceitar: boolean) {
  const { error } = await banco().rpc('responder_amizade', { p_nick: nick, p_aceitar: aceitar })
  if (error) throw new Error(error.message)
}

export async function desfazerAmizade(nick: string) {
  const { error } = await banco().rpc('desfazer_amizade', { p_nick: nick })
  if (error) throw new Error(error.message)
}

export async function meusAmigos(): Promise<Amigo[]> {
  const { data, error } = await banco().rpc('meus_amigos')
  if (error) {
    if (faltaFuncao(error)) return []
    throw new Error(error.message)
  }
  return ((data as (Omit<Amigo, 'avatar'> & { avatar: unknown })[] | null) ?? []).map((a) => ({
    ...a,
    avatar: lerAvatar(a.avatar),
  }))
}

export async function pedidosDeAmizade(): Promise<Pedido[]> {
  const { data, error } = await banco().rpc('pedidos_de_amizade')
  if (error) {
    if (faltaFuncao(error)) return []
    throw new Error(error.message)
  }
  return ((data as (Omit<Pedido, 'avatar'> & { avatar: unknown })[] | null) ?? []).map((p) => ({
    ...p,
    avatar: lerAvatar(p.avatar),
  }))
}
