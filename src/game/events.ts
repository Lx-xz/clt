import { HAND_SIZE } from './cards'
import type { EventCard } from './types'

/**
 * Os 20 eventos. Como as cartas, o que eles fazem é lista de ação — e por
 * isso `revealEvent` não tem mais um `switch` com um `case` por evento.
 *
 * Dois deles dependem de QUANDO o efeito roda, e é só por isso que `quando`
 * existe: a Fofoca descarta depois de a mão chegar, e a Cobrança no Zap só
 * pesa no fim do dia, se a cota não tiver sido batida.
 */
export const EVENT_CARDS: EventCard[] = [
  // negativas
  {
    id: 'sistema-fora-do-ar', name: 'Sistema Fora do Ar', tone: 'negativo',
    text: 'Você não pode jogar cartas de Tarefa hoje',
    efeitos: [{ acoes: [{ faz: 'bloquearClasse', classe: 'tarefa' }] }],
  },
  {
    id: 'reuniao-de-alinhamento', name: 'Reunião de Alinhamento', tone: 'negativo',
    text: '−3 energia',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: -3 }] }],
  },
  {
    id: 'chefe-de-mau-humor', name: 'Chefe de Mau Humor', tone: 'negativo',
    text: '+2 estresse',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: 2 }] }],
  },
  {
    id: 'relatorio-de-ultima-hora', name: 'Relatório de Última Hora', tone: 'negativo',
    text: 'Sua cota do dia aumenta em +2',
    efeitos: [{ acoes: [{ faz: 'cota', quanto: 2 }] }],
  },
  {
    id: 'transito', name: 'Trânsito', tone: 'negativo', text: '−2 energia',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: -2 }] }],
  },
  {
    id: 'colega-faltou', name: 'Colega Faltou', tone: 'negativo',
    text: 'Cota do dia +1, mas +R$ 20',
    efeitos: [{ acoes: [
      { faz: 'cota', quanto: 1 },
      { faz: 'recurso', qual: 'dinheiro', quanto: 20 },
    ] }],
  },
  {
    id: 'ar-condicionado-quebrado', name: 'Ar-Condicionado Quebrado', tone: 'negativo',
    text: 'Todas as cartas custam +1 energia hoje',
    efeitos: [{ acoes: [{ faz: 'custo', quanto: 1 }] }],
  },
  {
    id: 'fofoca-de-corredor', name: 'Fofoca de Corredor', tone: 'negativo',
    text: 'Descarte 1 carta da sua mão ao acaso',
    // depois de comprar, senão não haveria mão para descartar
    efeitos: [{ quando: 'aposComprar', acoes: [{ faz: 'descartar', quantas: 1, aleatorio: true, porque: 'Fofoca de Corredor' }] }],
  },
  {
    id: 'internet-caiu', name: 'Internet Caiu', tone: 'negativo',
    text: 'Descarte a mão e compre 3 cartas novas',
    efeitos: [{ acoes: [{ faz: 'maoDoDia', quantas: 3 }] }],
  },
  {
    id: 'cobranca-no-zap', name: 'Cobrança no Grupo do Zap', tone: 'negativo',
    text: '+1 estresse. Se você não bater a cota hoje: +2 estresse extra.',
    efeitos: [
      { acoes: [{ faz: 'recurso', qual: 'estresse', quanto: 1 }] },
      {
        quando: 'fimDoDia',
        se: { se: 'cotaBatida', valor: false },
        acoes: [
          { faz: 'recurso', qual: 'estresse', quanto: 2 },
          { faz: 'aviso', texto: 'A cobrança no grupo do zap piorou: +2 estresse extra.' },
        ],
      },
    ],
  },

  // positivas
  {
    id: 'dormiu-bem', name: 'Dormiu Bem', tone: 'positivo', text: '+3 energia',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: 3 }] }],
  },
  {
    id: 'bolo-na-copa', name: 'Bolo na Copa', tone: 'positivo', text: '−2 estresse',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -2 }] }],
  },
  {
    id: 'sexta-de-folga', name: 'Sexta de Folga', tone: 'positivo', text: 'Nenhuma cota hoje',
    efeitos: [{ acoes: [{ faz: 'cota', quanto: 0, absoluto: true }] }],
  },
  {
    id: 'elogio-do-chefe', name: 'Elogio do Chefe', tone: 'positivo',
    text: '−1 estresse, +1 produtividade',
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -1 },
      { faz: 'recurso', qual: 'produtividade', quanto: 1 },
    ] }],
  },
  {
    id: 'reembolso-atrasado', name: 'Reembolso Atrasado', tone: 'positivo', text: '+R$ 40',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'dinheiro', quanto: 40 }] }],
  },
  {
    id: 'dia-tranquilo', name: 'Dia Tranquilo', tone: 'positivo', text: 'Compre 2 cartas a mais hoje',
    efeitos: [{ acoes: [{ faz: 'maoDoDia', quantas: HAND_SIZE + 2 }] }],
  },

  // ambíguas
  {
    id: 'hora-extra-nao-solicitada',
    name: 'Hora Extra Não Solicitada',
    tone: 'ambiguo',
    text: 'O chefe pergunta se você pode ficar mais um pouco.',
    choices: [
      {
        label: 'Aceitar', text: '+R$ 40 e +3 estresse',
        acoes: [
          { faz: 'recurso', qual: 'dinheiro', quanto: 40 },
          { faz: 'recurso', qual: 'estresse', quanto: 3 },
        ],
      },
      {
        label: 'Recusar', text: '+1 advertência informal (2 informais = 1 advertência real)',
        acoes: [{ faz: 'advertencia', quanto: 1, informal: true }],
      },
    ],
  },
  {
    id: 'convite-happy-hour',
    name: 'Convite pro Happy Hour',
    tone: 'ambiguo',
    text: 'O time vai sair depois do expediente.',
    choices: [
      {
        label: 'Ir', text: '−3 estresse e −3 energia amanhã',
        acoes: [
          { faz: 'recurso', qual: 'estresse', quanto: -3 },
          { faz: 'amanha', qual: 'energia', quanto: -3 },
        ],
      },
      { label: 'Não ir', text: '+1 estresse', acoes: [{ faz: 'recurso', qual: 'estresse', quanto: 1 }] },
    ],
  },
  {
    id: 'freela-de-um-amigo',
    name: 'Freela de Um Amigo',
    tone: 'ambiguo',
    text: 'Um amigo te chama para um bico rápido.',
    choices: [
      {
        label: 'Aceitar', text: '+R$ 60, mas sua cota de amanhã aumenta em +2',
        acoes: [
          { faz: 'recurso', qual: 'dinheiro', quanto: 60 },
          { faz: 'amanha', qual: 'cota', quanto: 2 },
        ],
      },
      { label: 'Recusar', text: 'Nada acontece', acoes: [] },
    ],
  },
  {
    id: 'chamado-de-madrugada',
    name: 'Chamado de Madrugada',
    tone: 'ambiguo',
    text: 'O celular toca às 3h da manhã.',
    choices: [
      {
        label: 'Atender', text: '+R$ 25 e energia de amanhã −4',
        acoes: [
          { faz: 'recurso', qual: 'dinheiro', quanto: 25 },
          { faz: 'amanha', qual: 'energia', quanto: -4 },
        ],
      },
      { label: 'Ignorar', text: '+2 estresse', acoes: [{ faz: 'recurso', qual: 'estresse', quanto: 2 }] },
    ],
  },
]

export const EVENTS_BY_ID: Record<string, EventCard> = Object.fromEntries(
  EVENT_CARDS.map((e) => [e.id, e]),
)

export function getEvent(id: string): EventCard {
  const event = EVENTS_BY_ID[id]
  if (!event) throw new Error(`Evento desconhecido: ${id}`)
  return event
}
