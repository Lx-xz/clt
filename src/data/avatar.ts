'use client'

import { supabase } from './supabase'

/**
 * O avatar não é uma imagem, é uma receita: quatro escolhas que o
 * `Avatar.tsx` desenha em SVG na hora. O que vai para o banco são estas
 * quatro palavras, não um arquivo — trocar de avatar é um `update` numa
 * linha, não um upload, e não existe imagem imprópria para moderar porque
 * ninguém sobe imagem nenhuma.
 */
export type Corpo = 'homem' | 'mulher'
export type Corte = 'curto' | 'longo'
export type Pele = 'clara' | 'media' | 'escura'
export type CorCabelo = 'preto' | 'branco' | 'castanho' | 'loiro' | 'ruivo'

export interface Avatar {
  corpo: Corpo
  cabelo: Corte
  pele: Pele
  cor: CorCabelo
}

export const AVATAR_PADRAO: Avatar = {
  corpo: 'homem',
  cabelo: 'curto',
  pele: 'media',
  cor: 'castanho',
}

export const CORPOS: { valor: Corpo; rotulo: string }[] = [
  { valor: 'homem', rotulo: 'Homem' },
  { valor: 'mulher', rotulo: 'Mulher' },
]

export const CORTES: { valor: Corte; rotulo: string }[] = [
  { valor: 'curto', rotulo: 'Curto' },
  { valor: 'longo', rotulo: 'Longo' },
]

export const PELES: { valor: Pele; rotulo: string }[] = [
  { valor: 'clara', rotulo: 'Clara' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'escura', rotulo: 'Escura' },
]

export const CORES: { valor: CorCabelo; rotulo: string }[] = [
  { valor: 'preto', rotulo: 'Preto' },
  { valor: 'castanho', rotulo: 'Castanho' },
  { valor: 'loiro', rotulo: 'Loiro' },
  { valor: 'ruivo', rotulo: 'Ruivo' },
  { valor: 'branco', rotulo: 'Branco' },
]

function um<T extends string>(lista: { valor: T }[], bruto: unknown, padrao: T): T {
  return lista.some((i) => i.valor === bruto) ? (bruto as T) : padrao
}

/**
 * Toda leitura passa por aqui. O avatar vem de `jsonb` no banco e de
 * localStorage no convidado: nos dois casos pode ser nulo, pode ser lixo, e
 * pode ser de uma versão que tinha opções que não existem mais. Peça
 * desconhecida cai no padrão em vez de derrubar a página.
 */
export function lerAvatar(bruto: unknown): Avatar {
  const a = (bruto ?? {}) as Partial<Record<keyof Avatar, unknown>>
  return {
    corpo: um(CORPOS, a.corpo, AVATAR_PADRAO.corpo),
    cabelo: um(CORTES, a.cabelo, AVATAR_PADRAO.cabelo),
    pele: um(PELES, a.pele, AVATAR_PADRAO.pele),
    cor: um(CORES, a.cor, AVATAR_PADRAO.cor),
  }
}

/** Grava no banco. O convidado não tem conta, então não chega aqui. */
export async function salvarAvatar(avatar: Avatar) {
  if (!supabase) throw new Error('O banco não está configurado neste site.')
  const { error } = await supabase.rpc('salvar_avatar', { p_avatar: avatar })
  if (error) throw new Error(error.message)
}
