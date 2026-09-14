import type { Acessorio, FormaDeCabelo, Medidas, Olhos, Tronco } from '@/components/Avatar'
import type { Corpo } from '@/data/avatar'

/**
 * Estilos: combinações inteiras, com nome.
 *
 * Elas existem porque peça sozinha engana. Um cabelo espetado com o pescoço
 * comprido de hoje fica estranho, e o mesmo cabelo com o tronco colado fica
 * bom — então avaliar peça por peça leva a decisões erradas. Cada estilo aqui
 * é uma resposta inteira à pergunta "e se o avatar fosse assim?", em um
 * clique.
 *
 * **Nada disto está no jogo.** É tudo peça de teste; o estilo só arruma as
 * peças de teste juntas.
 */
export interface Estilo {
  nome: string
  dica: string
  corpo: Corpo
  /** O que difere das medidas do corpo escolhido. */
  medidas: Partial<Medidas>
  teste: { cabelo: FormaDeCabelo; acessorio: Acessorio; olhos: Olhos; tronco: Tronco }
}

export const ESTILOS: Estilo[] = [
  {
    nome: 'Jogo hoje',
    dica: 'O avatar como ele é no ar agora: sem orelha, com o pescoço comprido e o olho de ponto.',
    corpo: 'homem',
    medidas: { orelha: 0 },
    teste: { cabelo: 'curto', acessorio: 'nenhum', olhos: 'simples', tronco: 'padrao' },
  },
  {
    nome: 'Rapaz',
    dica: 'A resposta ao "os masculinos não estão bons": cabelo que abraça a cabeça, queixo mais reto, orelha e nenhum pescoço.',
    corpo: 'homem',
    medidas: { orelha: 4.4, cantoY: 10, cantoX: 9, sobrancelha: 2.8 },
    teste: { cabelo: 'espetado', acessorio: 'nenhum', olhos: 'amendoa', tronco: 'colado' },
  },
  {
    nome: 'Chefe',
    dica: 'Degradê de máquina, sobrancelha grossa e terno. O degradê pinta a PELE — é o único corte que faz isso.',
    corpo: 'homem',
    medidas: { orelha: 4, sobrancelha: 3.2, escalaCabeca: 0.97 },
    teste: { cabelo: 'degrade', acessorio: 'nenhum', olhos: 'deitado', tronco: 'social' },
  },
  {
    nome: 'Estagiário',
    dica: 'Boné por cima do topete: é o teste de encaixe do chapéu, porque o que aparece embaixo da aba muda com o corte.',
    corpo: 'homem',
    medidas: { orelha: 4.4 },
    teste: { cabelo: 'topete', acessorio: 'bone', olhos: 'emPe', tronco: 'camiseta' },
  },
  {
    nome: 'Moça',
    dica: 'Chanel com franja reta: o corte mais feminino do conjunto, e o que mais se distingue do comprido de hoje.',
    corpo: 'mulher',
    medidas: { orelha: 3.6, olho: 1.05 },
    teste: { cabelo: 'chanel', acessorio: 'nenhum', olhos: 'emPe', tronco: 'camiseta' },
  },
  {
    nome: 'Colega',
    dica: 'Cacheado e gola alta. O cacho é a única forma do conjunto que não é lisa — e some primeiro nos tamanhos pequenos.',
    corpo: 'mulher',
    medidas: { orelha: 3.8 },
    teste: { cabelo: 'cacheado', acessorio: 'nenhum', olhos: 'desenho', tronco: 'golaAlta' },
  },
  {
    nome: 'Chapéu',
    dica: 'Coque embaixo do chapéu de aba larga, e o olho feliz para ver se ele aguenta um rosto com acessório.',
    corpo: 'mulher',
    medidas: { orelha: 3.6 },
    teste: { cabelo: 'coque', acessorio: 'chapeu', olhos: 'feliz', tronco: 'colado' },
  },
]
