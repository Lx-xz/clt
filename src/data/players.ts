import { supabase } from './supabase'
import { normalizarNick } from './nick'

/**
 * Procura o jogador pelo nick. As duas funções passam por RPC em vez de ler
 * a tabela: assim o site não precisa de acesso de leitura a players, e
 * ninguém consegue baixar a lista de nicks de todo mundo.
 */
export async function acharJogador(nick: string): Promise<string | null> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('find_player', { p_nick: normalizarNick(nick) })
  if (error) throw new Error(error.message)
  return (data as string | null) ?? null
}

export async function criarJogador(nick: string): Promise<string> {
  if (!supabase) throw new Error('Banco não configurado.')
  const { data, error } = await supabase.rpc('create_player', { p_nick: normalizarNick(nick) })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Não foi possível criar o jogador.')
  return data as string
}
