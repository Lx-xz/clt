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
/** Cada fundo tem a sua versão escura (`…Escuro`), para quem quer o avatar
 *  num fundo de contraste alto. */
export type CorFundo =
  | 'papel'
  | 'kraft'
  | 'menta'
  | 'ceu'
  | 'poeira'
  | 'lavanda'
  | 'pessego'
  | 'papelEscuro'
  | 'kraftEscuro'
  | 'mentaEscuro'
  | 'ceuEscuro'
  | 'poeiraEscuro'
  | 'lavandaEscuro'
  | 'pessegoEscuro'
export type Olhos =
  | 'amendoa'
  | 'desenho'
  | 'emPe'
  | 'deitado'
  | 'surpreso'
  | 'esperto'
  | 'feliz'
  | 'simples'
  // as caras do estresse, que a mesa usa, também podem ficar no perfil
  | 'cansado'
  | 'suando'
  | 'chorando'
  | 'burnout'
  | 'vitoria'
export type Barba =
  | 'nenhuma'
  | 'rala'
  | 'bigode'
  | 'bigodao'
  | 'cavanhaque'
  | 'cheia'
  | 'bigodaoRala'
  | 'bigodaoCheia'
/** Como a barba encontra o cabelo: pela costeleta (`conecta`), pela
 *  costeleta esmaecendo para cima (`degrade`), ou não encontra (`solta`).
 *  Só vale para as barbas que cobrem a mandíbula — bigode não tem lado. */
export type LadoDaBarba = 'conecta' | 'degrade' | 'solta'
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
/** A cor do boné e do chapéu: a da roupa (o padrão, e o que valia antes de a
 *  escolha existir), ou uma das cores de boné — mais vivas que as de roupa,
 *  porque boné roxo é boné e camisa roxa é fantasia. */
export type CorDoChapeu = 'roupa' | 'roxo' | 'vermelho' | 'azul' | 'verde' | 'amarelo' | 'preto' | 'branco'
/** A armação dos óculos: escura (o padrão de sempre) ou uma cor. */
export type CorDosOculos = 'escuro' | 'roxo' | 'azul' | 'verde' | 'laranja' | 'vermelho' | 'rosa' | 'creme'
/** O headset é equipamento: preto ou branco, e só. */
export type CorDoHeadset = 'preto' | 'branco'
/** Brinco: uma argola na orelha — em nenhuma, numa só ou nas duas — e o metal. */
export type Brinco = 'nenhum' | 'um' | 'dois'
export type CorDoBrinco = 'dourado' | 'prateado'

export interface Avatar {
  rosto: Rosto
  pele: Pele
  cabelo: Corte
  /** A cor do cabelo — e da barba, que é da mesma pessoa. */
  cor: CorCabelo
  olhos: Olhos
  barba: Barba
  corBarba: CorDaBarba
  ladoBarba: LadoDaBarba
  tronco: Tronco
  roupa: CorRoupa
  oculos: Oculos
  corOculos: CorDosOculos
  acessorio: Acessorio
  corChapeu: CorDoChapeu
  corHeadset: CorDoHeadset
  brinco: Brinco
  corBrinco: CorDoBrinco
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
  ladoBarba: 'conecta',
  // o tronco sem pescoço é o padrão de quem escolhe agora; quem já tinha
  // avatar mantém a gola de antes, pela tradução em `lerAvatar`
  tronco: 'colado',
  roupa: 'azul',
  oculos: 'nenhum',
  corOculos: 'escuro',
  acessorio: 'nenhum',
  corChapeu: 'roupa',
  corHeadset: 'preto',
  brinco: 'nenhum',
  corBrinco: 'dourado',
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

// O campo se chama `olhos` por história, mas a escolha é de EXPRESSÃO: o olho
// é sempre a amêndoa, e o que muda é a pálpebra, a abertura e a sobrancelha.
// As chaves antigas (`emPe`, `surpreso`) continuam para os avatares gravados
// valerem. "Ponto", "Desenho" e "Deitado" saíram: quem os tinha cai na
// amêndoa pela leitura
export const OLHOS: Opcao<Olhos>[] = [
  { valor: 'amendoa', rotulo: 'Neutra' },
  { valor: 'esperto', rotulo: 'De lado' },
  { valor: 'emPe', rotulo: 'Decidida' },
  { valor: 'surpreso', rotulo: 'Surpresa' },
  { valor: 'feliz', rotulo: 'Feliz' },
  // as caras do estresse, para quem quer o perfil cansado. Na mesa elas não
  // valem: lá a cara é a do estresse da hora, e a run começa tranquila
  { valor: 'cansado', rotulo: 'Cansada' },
  { valor: 'suando', rotulo: 'Suando' },
  { valor: 'chorando', rotulo: 'Chorando' },
  { valor: 'burnout', rotulo: 'Burnout' },
  { valor: 'vitoria', rotulo: 'Vitória' },
]

/** As expressões que são caras do estresse: o avatar as mostra no perfil, e
 *  a mesa as ignora. */
export const EXPRESSOES_DE_HUMOR: readonly Olhos[] = ['cansado', 'suando', 'chorando', 'burnout', 'vitoria']

export const BARBAS: Opcao<Barba>[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma' },
  { valor: 'rala', rotulo: 'Por fazer' },
  { valor: 'cheia', rotulo: 'Cheia' },
  { valor: 'bigode', rotulo: 'Bigode' },
  { valor: 'bigodao', rotulo: 'Bigodão' },
  { valor: 'bigodaoRala', rotulo: 'Bigodão e barba por fazer' },
  { valor: 'bigodaoCheia', rotulo: 'Bigodão e barba cheia' },
  { valor: 'cavanhaque', rotulo: 'Cavanhaque' },
]

/** As barbas que cobrem a mandíbula: só elas têm lado para encontrar o cabelo. */
export const BARBAS_COM_LADO: readonly Barba[] = ['rala', 'cheia', 'bigodaoRala', 'bigodaoCheia']

export const LADOS_DA_BARBA: Opcao<LadoDaBarba>[] = [
  { valor: 'conecta', rotulo: 'Chega no cabelo' },
  { valor: 'degrade', rotulo: 'Some subindo' },
  { valor: 'solta', rotulo: 'Não chega' },
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

export const CORES_DO_CHAPEU: Opcao<CorDoChapeu>[] = [
  { valor: 'roupa', rotulo: 'A da roupa' },
  { valor: 'roxo', rotulo: 'Roxo' },
  { valor: 'vermelho', rotulo: 'Vermelho' },
  { valor: 'azul', rotulo: 'Azul' },
  { valor: 'verde', rotulo: 'Verde' },
  { valor: 'amarelo', rotulo: 'Amarelo' },
  { valor: 'preto', rotulo: 'Preto' },
  { valor: 'branco', rotulo: 'Branco' },
]

export const CORES_DOS_OCULOS: Opcao<CorDosOculos>[] = [
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'roxo', rotulo: 'Roxo' },
  { valor: 'azul', rotulo: 'Azul' },
  { valor: 'verde', rotulo: 'Verde' },
  { valor: 'laranja', rotulo: 'Laranja' },
  { valor: 'vermelho', rotulo: 'Vermelho' },
  { valor: 'rosa', rotulo: 'Rosa' },
  { valor: 'creme', rotulo: 'Creme' },
]

export const BRINCOS: Opcao<Brinco>[] = [
  { valor: 'nenhum', rotulo: 'Sem brinco' },
  { valor: 'um', rotulo: 'Numa orelha' },
  { valor: 'dois', rotulo: 'Nas duas orelhas' },
]

export const CORES_DO_BRINCO: Opcao<CorDoBrinco>[] = [
  { valor: 'dourado', rotulo: 'Dourado' },
  { valor: 'prateado', rotulo: 'Prateado' },
]

export const CORES_DO_HEADSET: Opcao<CorDoHeadset>[] = [
  { valor: 'preto', rotulo: 'Preto' },
  { valor: 'branco', rotulo: 'Branco' },
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
  { valor: 'papelEscuro', rotulo: 'Papel escuro' },
  { valor: 'kraftEscuro', rotulo: 'Kraft escuro' },
  { valor: 'mentaEscuro', rotulo: 'Menta escuro' },
  { valor: 'ceuEscuro', rotulo: 'Céu escuro' },
  { valor: 'lavandaEscuro', rotulo: 'Lavanda escuro' },
  { valor: 'pessegoEscuro', rotulo: 'Pêssego escuro' },
  { valor: 'poeiraEscuro', rotulo: 'Poeira escuro' },
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
    // antes desta escolha existir, só a barba cheia tinha costeleta: quem
    // gravou a por fazer abre com ela solta, como já era
    ladoBarba: um(LADOS_DA_BARBA, a.ladoBarba, a.barba === 'rala' ? 'solta' : AVATAR_PADRAO.ladoBarba),
    tronco: um(TRONCOS, a.tronco, TRONCO_DO_CORPO[corpoAntigo] ?? AVATAR_PADRAO.tronco),
    roupa: um(ROUPAS, a.roupa, AVATAR_PADRAO.roupa),
    oculos: um(OCULOS, a.oculos, AVATAR_PADRAO.oculos),
    corOculos: um(CORES_DOS_OCULOS, a.corOculos, AVATAR_PADRAO.corOculos),
    acessorio: um(ACESSORIOS, a.acessorio, AVATAR_PADRAO.acessorio),
    corChapeu: um(CORES_DO_CHAPEU, a.corChapeu, AVATAR_PADRAO.corChapeu),
    corHeadset: um(CORES_DO_HEADSET, a.corHeadset, AVATAR_PADRAO.corHeadset),
    brinco: um(BRINCOS, a.brinco, AVATAR_PADRAO.brinco),
    corBrinco: um(CORES_DO_BRINCO, a.corBrinco, AVATAR_PADRAO.corBrinco),
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
    // as caras do estresse não entram no sorteio: ele é para conhecer o
    // editor, e um avatar chorando à toa assusta
    olhos: sorteio(OLHOS.filter((o) => !EXPRESSOES_DE_HUMOR.includes(o.valor))).valor,
    barba: talvez(BARBAS, 'nenhuma', 0.35),
    // quase sempre a do cabelo; às vezes grisalha, que é o caso comum
    corBarba: Math.random() < 0.15 ? 'grisalho' : 'cabelo',
    ladoBarba: sorteio(LADOS_DA_BARBA).valor,
    tronco: sorteio(TRONCOS).valor,
    roupa: sorteio(ROUPAS).valor,
    oculos: talvez(OCULOS, 'nenhum', 0.25),
    corOculos: Math.random() < 0.6 ? 'escuro' : sorteio(CORES_DOS_OCULOS).valor,
    acessorio: talvez(ACESSORIOS, 'nenhum', 0.15),
    corChapeu: sorteio(CORES_DO_CHAPEU).valor,
    corHeadset: sorteio(CORES_DO_HEADSET).valor,
    brinco: talvez(BRINCOS, 'nenhum', 0.2),
    corBrinco: sorteio(CORES_DO_BRINCO).valor,
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
