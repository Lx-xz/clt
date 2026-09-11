'use client'

import { supabase } from './supabase'

/**
 * O avatar não é uma imagem, é uma receita: seis escolhas que o `Avatar.tsx`
 * desenha em SVG na hora. O que vai para o banco são estas seis palavras,
 * não um arquivo — trocar de avatar é um `update` numa linha, não um upload,
 * e não existe imagem imprópria para moderar porque ninguém sobe imagem.
 */
export type Corpo = 'manequim' | 'homem' | 'mulher'
export type Corte = 'curto' | 'longo'
export type Pele = 'clara' | 'media' | 'escura'
export type CorCabelo = 'preto' | 'branco' | 'castanho' | 'loiro' | 'ruivo'
export type CorRoupa = 'azul' | 'oliva' | 'vinho' | 'areia' | 'grafite'
export type CorFundo = 'papel' | 'kraft' | 'menta' | 'ceu' | 'poeira'

export interface Avatar {
  corpo: Corpo
  cabelo: Corte
  pele: Pele
  cor: CorCabelo
  roupa: CorRoupa
  fundo: CorFundo
}

/**
 * O manequim é o avatar de quem ainda não escolheu: aquela figura de madeira
 * articulada de ateliê. Ele é claramente um espaço em branco — ninguém acha
 * que "é assim que o jogo me vê" — e é o que o convidado usa, já que ele não
 * responde nada no cadastro por não ter cadastro.
 */
export const AVATAR_PADRAO: Avatar = {
  corpo: 'manequim',
  cabelo: 'curto',
  pele: 'media',
  cor: 'castanho',
  roupa: 'azul',
  fundo: 'papel',
}

export const CORPOS: { valor: Corpo; rotulo: string }[] = [
  { valor: 'homem', rotulo: 'Homem' },
  { valor: 'mulher', rotulo: 'Mulher' },
  { valor: 'manequim', rotulo: 'Manequim' },
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

export const ROUPAS: { valor: CorRoupa; rotulo: string }[] = [
  { valor: 'azul', rotulo: 'Azul' },
  { valor: 'oliva', rotulo: 'Oliva' },
  { valor: 'vinho', rotulo: 'Vinho' },
  { valor: 'areia', rotulo: 'Areia' },
  { valor: 'grafite', rotulo: 'Grafite' },
]

export const FUNDOS: { valor: CorFundo; rotulo: string }[] = [
  { valor: 'papel', rotulo: 'Papel' },
  { valor: 'kraft', rotulo: 'Kraft' },
  { valor: 'menta', rotulo: 'Menta' },
  { valor: 'ceu', rotulo: 'Céu' },
  { valor: 'poeira', rotulo: 'Poeira' },
]

function um<T extends string>(lista: { valor: T }[], bruto: unknown, padrao: T): T {
  return lista.some((i) => i.valor === bruto) ? (bruto as T) : padrao
}

/**
 * Toda leitura passa por aqui. O avatar vem de `jsonb` no banco e de
 * localStorage no convidado: nos dois casos pode ser nulo, pode ser lixo, e
 * pode ser de uma versão que tinha opções que não existem mais. Peça
 * desconhecida cai no padrão em vez de derrubar a página — é por isso que o
 * banco não valida nada na gravação.
 */
export function lerAvatar(bruto: unknown): Avatar {
  const a = (bruto ?? {}) as Partial<Record<keyof Avatar, unknown>>
  return {
    corpo: um(CORPOS, a.corpo, AVATAR_PADRAO.corpo),
    cabelo: um(CORTES, a.cabelo, AVATAR_PADRAO.cabelo),
    pele: um(PELES, a.pele, AVATAR_PADRAO.pele),
    cor: um(CORES, a.cor, AVATAR_PADRAO.cor),
    roupa: um(ROUPAS, a.roupa, AVATAR_PADRAO.roupa),
    fundo: um(FUNDOS, a.fundo, AVATAR_PADRAO.fundo),
  }
}

function sorteio<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]
}

/**
 * O avatar de boas-vindas de quem respondeu o gênero no cadastro. O corpo sai
 * da resposta; o resto é sorteado, para o primeiro ranking não parecer um
 * batalhão de clones — e é tudo trocável no editor depois.
 */
export function avatarAleatorio(corpo: Corpo): Avatar {
  return {
    corpo,
    cabelo: sorteio(CORTES).valor,
    pele: sorteio(PELES).valor,
    cor: sorteio(CORES).valor,
    roupa: sorteio(ROUPAS).valor,
    fundo: sorteio(FUNDOS).valor,
  }
}

/** Grava no banco. O convidado não tem conta, então não chega aqui. */
export async function salvarAvatar(avatar: Avatar) {
  if (!supabase) throw new Error('O banco não está configurado neste site.')
  const { error } = await supabase.rpc('salvar_avatar', { p_avatar: avatar })
  if (error) throw new Error(error.message)
}
