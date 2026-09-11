'use client'

import { lerAvatar, type Avatar } from './avatar'
import { supabase } from './supabase'

/**
 * O perfil de OUTRA pessoa, aberto ao clicar num nick do ranking.
 *
 * Ele mostra só o que já era público: nick, avatar, vitórias, derrotas e o
 * histórico de partidas. E-mail, nome e pontos não passam por aqui — quem
 * devolve esses é `meu_perfil()`, filtrado por `auth.uid()`. Se um dia
 * alguém quiser mostrar mais no perfil alheio, o lugar de decidir isso é a
 * função no banco, não esta camada.
 */
export interface PerfilPublico {
  nick: string
  avatar: Avatar
  desde: string
  vitorias: number
  derrotas: number
  total_runs: number
  melhor_dinheiro: number | null
  ultima_partida: string | null
}

export interface JogoResumo {
  id: number
  ended_at: string
  outcome: string
  day: number
  money: number
  week_reached: number
}

export async function perfilPublico(nick: string): Promise<PerfilPublico | null> {
  if (!supabase) throw new Error('O banco não está configurado neste site.')
  const { data, error } = await supabase.rpc('perfil_publico', { p_nick: nick })
  if (error) throw new Error(error.message)
  const linha = (data as (Omit<PerfilPublico, 'avatar'> & { avatar: unknown })[] | null)?.[0]
  if (!linha) return null
  return { ...linha, avatar: lerAvatar(linha.avatar) }
}

export async function jogosDoJogador(nick: string): Promise<JogoResumo[]> {
  if (!supabase) throw new Error('O banco não está configurado neste site.')
  const { data, error } = await supabase.rpc('jogos_do_jogador', { p_nick: nick })
  if (error) throw new Error(error.message)
  return (data as JogoResumo[]) ?? []
}
