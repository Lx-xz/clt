'use client'

import { supabase } from './supabase'

/**
 * Feedbacks: bugs, sugestões e dúvidas. Tudo passa por função `security
 * definer` no banco — a tabela não tem grant nenhum para o site. Quem pode o
 * quê está decidido lá, não aqui; esta camada só chama e traduz o erro.
 */

export type TipoFeedback = 'bug' | 'sugestao' | 'duvida' | 'outro'
export type StatusFeedback = 'novo' | 'triado' | 'em_andamento' | 'feito' | 'recusado' | 'duplicado'
export type Urgencia = 'baixa' | 'media' | 'alta' | 'critica'

export const TIPOS: { valor: TipoFeedback; rotulo: string }[] = [
  { valor: 'bug', rotulo: 'Bug' },
  { valor: 'sugestao', rotulo: 'Sugestão' },
  { valor: 'duvida', rotulo: 'Dúvida' },
  { valor: 'outro', rotulo: 'Outro' },
]

/** O rótulo e o que ele promete — o mesmo texto serve para os dois lados. */
export const STATUS: { valor: StatusFeedback; rotulo: string; explica: string }[] = [
  { valor: 'novo', rotulo: 'Novo', explica: 'Chegou e ainda não foi lido com calma.' },
  { valor: 'triado', rotulo: 'Na fila', explica: 'Foi lido, faz sentido, e está esperando a vez.' },
  { valor: 'em_andamento', rotulo: 'Fazendo', explica: 'Alguém está mexendo nisto agora.' },
  { valor: 'feito', rotulo: 'Feito', explica: 'Está no ar. Vale conferir e dizer se resolveu.' },
  { valor: 'recusado', rotulo: 'Não vai rolar', explica: 'Decidiu-se não fazer — o comentário diz por quê.' },
  { valor: 'duplicado', rotulo: 'Repetido', explica: 'Já existe outro relato sobre isto.' },
]

export const URGENCIAS: { valor: Urgencia; rotulo: string }[] = [
  { valor: 'baixa', rotulo: 'Baixa' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'alta', rotulo: 'Alta' },
  { valor: 'critica', rotulo: 'Crítica' },
]

export function rotuloDe<T extends string>(lista: { valor: T; rotulo: string }[], valor: T): string {
  return lista.find((i) => i.valor === valor)?.rotulo ?? valor
}

export interface Feedback {
  id: number
  tipo: TipoFeedback
  titulo: string
  corpo: string
  status: StatusFeedback
  urgencia: Urgencia
  nota: number | null
  pagina: string | null
  criado_em: string
  atualizado_em: string
  autor_nick: string
  comentarios: number
  meu: boolean
}

export interface Comentario {
  id: number
  corpo: string
  de_admin: boolean
  criado_em: string
  autor_nick: string
  meu: boolean
}

export interface Parecido {
  id: number
  tipo: TipoFeedback
  titulo: string
  status: StatusFeedback
  criado_em: string
  autor_nick: string
  semelhanca: number
}

function exigirBanco() {
  if (!supabase) throw new Error('O banco não está configurado neste site.')
  return supabase
}

async function chamar<T>(nome: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await exigirBanco().rpc(nome, args)
  if (error) {
    // a mensagem das funções já vem escrita para o jogador ler ("Crie uma
    // conta para relatar…"); o resto do pacote do PostgREST só atrapalharia
    throw new Error(error.message)
  }
  return data as T
}

export const listarFeedbacks = (status?: StatusFeedback, tipo?: TipoFeedback) =>
  chamar<Feedback[]>('listar_feedbacks', { p_status: status ?? null, p_tipo: tipo ?? null })

export const comentariosDoFeedback = (id: number) =>
  chamar<Comentario[]>('comentarios_do_feedback', { p_id: id })

export const feedbacksParecidos = (titulo: string, corpo: string) =>
  chamar<Parecido[]>('feedbacks_parecidos', { p_titulo: titulo, p_corpo: corpo })

export const criarFeedback = (tipo: TipoFeedback, titulo: string, corpo: string, pagina?: string) =>
  chamar<number>('criar_feedback', {
    p_tipo: tipo,
    p_titulo: titulo,
    p_corpo: corpo,
    p_pagina: pagina ?? null,
  })

export const editarFeedback = (id: number, tipo: TipoFeedback, titulo: string, corpo: string) =>
  chamar<void>('editar_feedback', { p_id: id, p_tipo: tipo, p_titulo: titulo, p_corpo: corpo })

export const excluirFeedback = (id: number) => chamar<void>('excluir_feedback', { p_id: id })

export const comentarFeedback = (id: number, corpo: string) =>
  chamar<number>('comentar_feedback', { p_id: id, p_corpo: corpo })

/** Passar `null` num campo quer dizer "não mexa nele". Só o admin consegue. */
export const adminAtualizarFeedback = (
  id: number,
  mudanca: { status?: StatusFeedback; urgencia?: Urgencia; nota?: number },
) =>
  chamar<void>('admin_atualizar_feedback', {
    p_id: id,
    p_status: mudanca.status ?? null,
    p_urgencia: mudanca.urgencia ?? null,
    p_nota: mudanca.nota ?? null,
  })
