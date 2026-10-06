'use client'

import { supabase } from './supabase'

/**
 * O avatar não é uma imagem, é uma receita: um punhado de palavras que o
 * `Avatar.tsx` desenha em SVG na hora. O que vai para o banco são estas
 * palavras, não um arquivo — trocar de avatar é um `update` numa linha, não um
 * upload, e não existe imagem imprópria para moderar porque ninguém sobe
 * imagem.
 *
 * **A receita não tem gênero.** Até a v0.12 o primeiro campo era `corpo:
 * homem | mulher`, e ele decidia o formato do rosto E a gola da roupa. O
 * cadastro já tinha parado de perguntar gênero na v0.8, por ser dado pessoal,
 * e o editor continuava perguntando. Hoje o primeiro campo é o FORMATO do
 * rosto, e o que lê como masculino ou feminino vem do cabelo e da barba,
 * escolhidos livremente — como no Duolingo.
 *
 * **Acrescentar uma peça não exige banco:** `salvar_avatar()` não valida o
 * conteúdo, e `lerAvatar()` valida na leitura — é ela que traduz a receita
 * antiga (com `corpo`) para a de hoje.
 */
export type Rosto = 'manequim' | 'quadrado' | 'redondo' | 'oval'
export type Corte =
  | 'curto'
  | 'longo'
  | 'quadrado'
  | 'careca'
  | 'degrade'
  | 'espetado'
  | 'topete'
  | 'cacheado'
  | 'chanel'
  | 'coque'
  | 'blackPower'
  | 'trancas'
  | 'puff'
export type Pele = 'clara' | 'areia' | 'mel' | 'media' | 'canela' | 'escura' | 'ebano'
export type CorCabelo = 'preto' | 'branco' | 'castanho' | 'loiro' | 'ruivo' | 'grisalho' | 'mel'
export type CorRoupa =
  | 'azul'
  | 'oliva'
  | 'vinho'
  | 'areia'
  | 'grafite'
  | 'terracota'
  | 'petroleo'
  | 'mostarda'
export type CorFundo = 'papel' | 'kraft' | 'menta' | 'ceu' | 'poeira' | 'lavanda' | 'pessego'
export type Olhos =
  | 'amendoa'
  | 'desenho'
  | 'emPe'
  | 'deitado'
  | 'surpreso'
  | 'esperto'
  | 'feliz'
  | 'simples'
export type Barba = 'nenhuma' | 'rala' | 'bigode' | 'cavanhaque' | 'cheia'
export type Tronco =
  | 'colado'
  | 'golaV'
  | 'decote'
  | 'camiseta'
  | 'golaAlta'
  | 'social'
  | 'gravata'
  | 'colete'
  | 'jaleco'
/** Óculos e chapéu são campos SEPARADOS: um é do rosto e o outro da cabeça, e
 *  quem quer os dois não deveria ter que escolher. */
export type Oculos = 'nenhum' | 'redondo' | 'quadrado'
export type Acessorio = 'nenhum' | 'bone' | 'chapeu' | 'headset'
/** A cor da barba: a do cabelo (o padrão), ou outra — barba grisalha com o
 *  cabelo ainda escuro é a combinação mais comum que a receita não deixava. */
export type CorDaBarba = 'cabelo' | CorCabelo

export interface Avatar {
  rosto: Rosto
  pele: Pele
  cabelo: Corte
  /** A cor do cabelo — e da barba, que é da mesma pessoa. */
  cor: CorCabelo
  olhos: Olhos
  barba: Barba
  corBarba: CorDaBarba
  tronco: Tronco
  /** A cor da roupa — e do chapéu, que herda dela: uma sétima escolha de cor
   *  só para o chapéu seria um controle a mais para quase ninguém. */
  roupa: CorRoupa
  oculos: Oculos
  acessorio: Acessorio
  /** O crachá no cordão: a peça que mais diz "CLT" e que não ocupa a cabeça,
   *  então combina com chapéu, boné e headset. */
  cracha: boolean
  fundo: CorFundo
}

/**
 * O manequim é o avatar de quem ainda não escolheu: aquela figura de madeira
 * articulada de ateliê. Ele é claramente um espaço em branco — ninguém acha
 * que "é assim que o jogo me vê" — e é o que o convidado usa, já que ele não
 * responde nada no cadastro por não ter cadastro.
 */
export const AVATAR_PADRAO: Avatar = {
  rosto: 'manequim',
  pele: 'media',
  cabelo: 'curto',
  cor: 'castanho',
  olhos: 'amendoa',
  barba: 'nenhuma',
  corBarba: 'cabelo',
  // o tronco sem pescoço é o padrão de quem escolhe agora; quem já tinha
  // avatar mantém a gola de antes, pela tradução em `lerAvatar`
  tronco: 'colado',
  roupa: 'azul',
  oculos: 'nenhum',
  acessorio: 'nenhum',
  cracha: false,
  fundo: 'papel',
}

export interface Opcao<T> {
  valor: T
  rotulo: string
}

export const ROSTOS: Opcao<Rosto>[] = [
  { valor: 'quadrado', rotulo: 'Quadrado' },
  { valor: 'redondo', rotulo: 'Redondo' },
  { valor: 'oval', rotulo: 'Oval' },
  { valor: 'manequim', rotulo: 'Manequim' },
]

export const CORTES: Opcao<Corte>[] = [
  { valor: 'careca', rotulo: 'Careca' },
  { valor: 'degrade', rotulo: 'Degradê' },
  { valor: 'quadrado', rotulo: 'Quadrado' },
  { valor: 'espetado', rotulo: 'Espetado' },
  { valor: 'topete', rotulo: 'Topete' },
  { valor: 'curto', rotulo: 'Curto' },
  { valor: 'cacheado', rotulo: 'Cacheado' },
  { valor: 'chanel', rotulo: 'Chanel' },
  { valor: 'coque', rotulo: 'Coque' },
  { valor: 'puff', rotulo: 'Puff' },
  { valor: 'blackPower', rotulo: 'Black power' },
  { valor: 'longo', rotulo: 'Longo' },
  { valor: 'trancas', rotulo: 'Tranças' },
]

export const PELES: Opcao<Pele>[] = [
  { valor: 'clara', rotulo: 'Clara' },
  { valor: 'areia', rotulo: 'Areia' },
  { valor: 'mel', rotulo: 'Mel' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'canela', rotulo: 'Canela' },
  { valor: 'escura', rotulo: 'Escura' },
  { valor: 'ebano', rotulo: 'Ébano' },
]

export const CORES: Opcao<CorCabelo>[] = [
  { valor: 'preto', rotulo: 'Preto' },
  { valor: 'castanho', rotulo: 'Castanho' },
  { valor: 'mel', rotulo: 'Mel' },
  { valor: 'loiro', rotulo: 'Loiro' },
  { valor: 'ruivo', rotulo: 'Ruivo' },
  { valor: 'grisalho', rotulo: 'Grisalho' },
  { valor: 'branco', rotulo: 'Branco' },
]

// "Desenho" e "Deitado" saíram da lista: em 40px ou menos eles eram a mesma
// amêndoa, e quatro opções que não se distinguem são uma escolha só. Os dois
// continuam desenhados (o lab ainda os experimenta), e quem os tinha cai na
// amêndoa pela leitura — que era, na prática, o que já se via
export const OLHOS: Opcao<Olhos>[] = [
  { valor: 'amendoa', rotulo: 'Amêndoa' },
  { valor: 'emPe', rotulo: 'Em pé' },
  { valor: 'surpreso', rotulo: 'Surpreso' },
  { valor: 'esperto', rotulo: 'De lado' },
  { valor: 'feliz', rotulo: 'Feliz' },
  { valor: 'simples', rotulo: 'Ponto' },
]

export const BARBAS: Opcao<Barba>[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'rala', rotulo: 'Por fazer' },
  { valor: 'bigode', rotulo: 'Bigode' },
  { valor: 'cavanhaque', rotulo: 'Cavanhaque' },
  { valor: 'cheia', rotulo: 'Cheia' },
]

export const TRONCOS: Opcao<Tronco>[] = [
  { valor: 'colado', rotulo: 'Sem pescoço' },
  { valor: 'camiseta', rotulo: 'Camiseta' },
  { valor: 'golaV', rotulo: 'Gola V' },
  { valor: 'decote', rotulo: 'Decote' },
  { valor: 'golaAlta', rotulo: 'Gola alta' },
  { valor: 'social', rotulo: 'Social' },
  { valor: 'gravata', rotulo: 'Gravata' },
  { valor: 'jaleco', rotulo: 'Jaleco' },
  { valor: 'colete', rotulo: 'Colete' },
]

export const ROUPAS: Opcao<CorRoupa>[] = [
  { valor: 'azul', rotulo: 'Azul' },
  { valor: 'petroleo', rotulo: 'Petróleo' },
  { valor: 'oliva', rotulo: 'Oliva' },
  { valor: 'mostarda', rotulo: 'Mostarda' },
  { valor: 'terracota', rotulo: 'Terracota' },
  { valor: 'vinho', rotulo: 'Vinho' },
  { valor: 'areia', rotulo: 'Areia' },
  { valor: 'grafite', rotulo: 'Grafite' },
]

export const OCULOS: Opcao<Oculos>[] = [
  { valor: 'nenhum', rotulo: 'Sem óculos' },
  { valor: 'redondo', rotulo: 'Redondo' },
  { valor: 'quadrado', rotulo: 'Quadrado' },
]

export const ACESSORIOS: Opcao<Acessorio>[] = [
  { valor: 'nenhum', rotulo: 'Nada' },
  { valor: 'bone', rotulo: 'Boné' },
  { valor: 'chapeu', rotulo: 'Chapéu' },
  { valor: 'headset', rotulo: 'Headset' },
]

export const CORES_DA_BARRA: Opcao<CorDaBarba>[] = [
  { valor: 'cabelo', rotulo: 'A do cabelo' },
  ...CORES,
]

export const CRACHAS: Opcao<boolean>[] = [
  { valor: false, rotulo: 'Sem crachá' },
  { valor: true, rotulo: 'Com crachá' },
]

export const FUNDOS: Opcao<CorFundo>[] = [
  { valor: 'papel', rotulo: 'Papel' },
  { valor: 'kraft', rotulo: 'Kraft' },
  { valor: 'menta', rotulo: 'Menta' },
  { valor: 'ceu', rotulo: 'Céu' },
  { valor: 'lavanda', rotulo: 'Lavanda' },
  { valor: 'pessego', rotulo: 'Pêssego' },
  { valor: 'poeira', rotulo: 'Poeira' },
]

function um<T extends string>(lista: Opcao<T>[], bruto: unknown, padrao: T): T {
  return lista.some((i) => i.valor === bruto) ? (bruto as T) : padrao
}

/** A receita antiga dizia `corpo: homem | mulher`, e o corpo decidia o rosto
 *  E a gola. A tradução preserva as duas coisas: quem escolheu "homem" abre
 *  com o rosto e a gola que já tinha, só que agora os dois são escolhas. */
const ROSTO_DO_CORPO: Record<string, Rosto> = {
  homem: 'quadrado',
  mulher: 'oval',
  manequim: 'manequim',
}
const TRONCO_DO_CORPO: Record<string, Tronco> = {
  homem: 'golaV',
  mulher: 'golaAlta',
}

/**
 * Toda leitura passa por aqui. O avatar vem de `jsonb` no banco e de
 * localStorage no convidado: nos dois casos pode ser nulo, pode ser lixo, e
 * pode ser de uma versão que tinha opções que não existem mais. Peça
 * desconhecida cai no padrão em vez de derrubar a página — é por isso que o
 * banco não valida nada na gravação.
 *
 * É também onde a receita ANTIGA vira a de hoje, sem migração no banco: ela
 * é traduzida toda vez que é lida, e na primeira vez que a pessoa salvar no
 * editor, o banco passa a guardar a nova. O olho que faltava vira `amendoa` —
 * é assim que o estilo novo chega a todo mundo de uma vez, de propósito.
 */
export function lerAvatar(bruto: unknown): Avatar {
  const a = (bruto ?? {}) as Partial<Record<keyof Avatar | 'corpo', unknown>>
  const corpoAntigo = typeof a.corpo === 'string' ? a.corpo : ''
  return {
    rosto: um(ROSTOS, a.rosto, ROSTO_DO_CORPO[corpoAntigo] ?? AVATAR_PADRAO.rosto),
    pele: um(PELES, a.pele, AVATAR_PADRAO.pele),
    cabelo: um(CORTES, a.cabelo, AVATAR_PADRAO.cabelo),
    cor: um(CORES, a.cor, AVATAR_PADRAO.cor),
    olhos: um(OLHOS, a.olhos, AVATAR_PADRAO.olhos),
    barba: um(BARBAS, a.barba, AVATAR_PADRAO.barba),
    corBarba: um(CORES_DA_BARRA, a.corBarba, AVATAR_PADRAO.corBarba),
    tronco: um(TRONCOS, a.tronco, TRONCO_DO_CORPO[corpoAntigo] ?? AVATAR_PADRAO.tronco),
    roupa: um(ROUPAS, a.roupa, AVATAR_PADRAO.roupa),
    oculos: um(OCULOS, a.oculos, AVATAR_PADRAO.oculos),
    acessorio: um(ACESSORIOS, a.acessorio, AVATAR_PADRAO.acessorio),
    cracha: a.cracha === true,
    fundo: um(FUNDOS, a.fundo, AVATAR_PADRAO.fundo),
  }
}

function sorteio<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]
}

/** Uma das opções que NÃO é "nenhum", com a chance dada — o resto é nada. */
function talvez<T>(lista: Opcao<T>[], nada: T, chance: number): T {
  if (Math.random() >= chance) return nada
  return sorteio(lista.filter((o) => o.valor !== nada)).valor
}

/**
 * O botão Sortear do editor.
 *
 * Um dos três rostos de gente (nunca o manequim, que é justamente "ainda não
 * escolhi") e o resto sorteado. Barba, óculos e chapéu vêm em MINORIA: com
 * peso igual para "nenhum" e para cada peça, dois terços dos sorteios sairiam
 * de chapéu, e o sorteio pareceria uma fantasia em vez de uma pessoa.
 */
export function avatarAleatorio(): Avatar {
  return {
    rosto: sorteio(ROSTOS.filter((r) => r.valor !== 'manequim')).valor,
    pele: sorteio(PELES).valor,
    cabelo: sorteio(CORTES).valor,
    cor: sorteio(CORES).valor,
    // o olho de ponto é o do avatar antigo; ele fica disponível para quem
    // quiser, mas não entra no sorteio de quem está conhecendo o editor
    olhos: sorteio(OLHOS.filter((o) => o.valor !== 'simples')).valor,
    barba: talvez(BARBAS, 'nenhuma', 0.35),
    // quase sempre a do cabelo; às vezes grisalha, que é o caso comum
    corBarba: Math.random() < 0.15 ? 'grisalho' : 'cabelo',
    tronco: sorteio(TRONCOS).valor,
    roupa: sorteio(ROUPAS).valor,
    oculos: talvez(OCULOS, 'nenhum', 0.25),
    acessorio: talvez(ACESSORIOS, 'nenhum', 0.15),
    cracha: Math.random() < 0.3,
    fundo: sorteio(FUNDOS).valor,
  }
}

/** Grava no banco. O convidado não tem conta, então não chega aqui. */
export async function salvarAvatar(avatar: Avatar) {
  if (!supabase) throw new Error('O banco não está configurado neste site.')
  const { error } = await supabase.rpc('salvar_avatar', { p_avatar: avatar })
  if (error) throw new Error(error.message)
}
