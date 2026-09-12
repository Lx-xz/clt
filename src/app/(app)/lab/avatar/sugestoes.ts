/**
 * As cores sugeridas do laboratório.
 *
 * Cada slot lista as cores que **já estão no jogo** (marcadas `noJogo`) e um
 * punhado de sugestões para experimentar. Elas são um atalho, não um limite:
 * o campo de hex continua ali ao lado, e clicar numa sugestão só preenche o
 * hex — é o hex que manda.
 *
 * Nada daqui entra no jogo sozinho. Promover uma cor é acrescentar o hex na
 * tabela de `Avatar.tsx` e o rótulo na lista de `src/data/avatar.ts`, e é
 * isso que o popup de confirmação explica.
 */

export interface CorSugerida {
  nome: string
  hex: string
  /** Já é uma das cores que o jogador pode escolher hoje. */
  noJogo?: boolean
}

export interface SlotDeCor {
  chave: 'pele' | 'cabelo' | 'roupa' | 'acessorio' | 'fundo' | 'olho'
  rotulo: string
  /** Onde a cor moraria se fosse promovida — o popup mostra isto. */
  onde: string
  cores: CorSugerida[]
}

export const SLOTS_DE_COR: SlotDeCor[] = [
  {
    chave: 'pele',
    rotulo: 'Pele',
    onde: 'PELES em Avatar.tsx (com os dois tons de sombra) e PELES em src/data/avatar.ts',
    cores: [
      { nome: 'Clara', hex: '#f3d5b8', noJogo: true },
      { nome: 'Média', hex: '#c98d5d', noJogo: true },
      { nome: 'Escura', hex: '#7d4c2e', noJogo: true },
      { nome: 'Porcelana', hex: '#f7e2ce' },
      { nome: 'Areia', hex: '#edcaa4' },
      { nome: 'Mel', hex: '#d9a066' },
      { nome: 'Canela', hex: '#a9713f' },
      { nome: 'Cacau', hex: '#5e3620' },
      { nome: 'Ébano', hex: '#40251a' },
    ],
  },
  {
    chave: 'cabelo',
    rotulo: 'Cabelo',
    onde: 'CABELOS em Avatar.tsx e CORES em src/data/avatar.ts',
    cores: [
      { nome: 'Preto', hex: '#2b2622', noJogo: true },
      { nome: 'Castanho', hex: '#6b4326', noJogo: true },
      { nome: 'Loiro', hex: '#d5a743', noJogo: true },
      { nome: 'Ruivo', hex: '#b0501f', noJogo: true },
      { nome: 'Branco', hex: '#e8e3d8', noJogo: true },
      { nome: 'Grisalho', hex: '#9a948a' },
      { nome: 'Castanho claro', hex: '#a3733f' },
      { nome: 'Platinado', hex: '#efe6cf' },
      { nome: 'Azulado', hex: '#3b4a66' },
      { nome: 'Rosa', hex: '#b8657f' },
      { nome: 'Musgo', hex: '#5d6b45' },
    ],
  },
  {
    chave: 'roupa',
    rotulo: 'Roupa',
    onde: 'ROUPAS em Avatar.tsx e ROUPAS em src/data/avatar.ts',
    cores: [
      { nome: 'Azul', hex: '#6f7f8c', noJogo: true },
      { nome: 'Oliva', hex: '#7d8558', noJogo: true },
      { nome: 'Vinho', hex: '#8c5a58', noJogo: true },
      { nome: 'Areia', hex: '#c2ab86', noJogo: true },
      { nome: 'Grafite', hex: '#4f4d48', noJogo: true },
      { nome: 'Terracota', hex: '#b06a44' },
      { nome: 'Petróleo', hex: '#3f5a60' },
      { nome: 'Mostarda', hex: '#c19a3e' },
      { nome: 'Lilás', hex: '#8a7d9b' },
      { nome: 'Camisa branca', hex: '#ded9cd' },
    ],
  },
  {
    chave: 'acessorio',
    rotulo: 'Acessório',
    onde: 'ainda não existe tabela: o acessório inteiro é de teste',
    cores: [
      { nome: 'Vinho', hex: '#8c5a58' },
      { nome: 'Grafite', hex: '#4f4d48' },
      { nome: 'Azul', hex: '#52708c' },
      { nome: 'Palha', hex: '#d8c48a' },
      { nome: 'Verde', hex: '#5f7a52' },
      { nome: 'Vermelho', hex: '#a3453a' },
      { nome: 'Preto', hex: '#2b2622' },
      { nome: 'Creme', hex: '#e3d9c2' },
    ],
  },
  {
    chave: 'fundo',
    rotulo: 'Fundo',
    onde: 'FUNDOS em Avatar.tsx e FUNDOS em src/data/avatar.ts',
    cores: [
      { nome: 'Papel', hex: '#d8cfba', noJogo: true },
      { nome: 'Kraft', hex: '#c9b596', noJogo: true },
      { nome: 'Menta', hex: '#b7c9bb', noJogo: true },
      { nome: 'Céu', hex: '#b3c3d1', noJogo: true },
      { nome: 'Poeira', hex: '#cbbfc4', noJogo: true },
      { nome: 'Musgo', hex: '#b6bfa4' },
      { nome: 'Pêssego', hex: '#dcc0a8' },
      { nome: 'Lavanda', hex: '#c1bcd1' },
      { nome: 'Carvão', hex: '#8e8a84' },
      { nome: 'Manteiga', hex: '#ddd2a6' },
    ],
  },
  {
    chave: 'olho',
    rotulo: 'Íris',
    onde: 'só o olho detalhado usa esta cor, e ele é de teste',
    cores: [
      { nome: 'Castanho', hex: '#4a3524' },
      { nome: 'Mel', hex: '#8a6330' },
      { nome: 'Verde', hex: '#4d6b4a' },
      { nome: 'Azul', hex: '#4a6a86' },
      { nome: 'Cinza', hex: '#6b6b66' },
      { nome: 'Preto', hex: '#241f1b' },
    ],
  },
]
