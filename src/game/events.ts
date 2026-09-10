import type { EventCard } from './types'

export const EVENT_CARDS: EventCard[] = [
  // negativas
  { id: 'sistema-fora-do-ar', name: 'Sistema Fora do Ar', tone: 'negativo', text: 'Você não pode jogar cartas de Tarefa hoje' },
  { id: 'reuniao-de-alinhamento', name: 'Reunião de Alinhamento', tone: 'negativo', text: '−3 energia' },
  { id: 'chefe-de-mau-humor', name: 'Chefe de Mau Humor', tone: 'negativo', text: '+2 estresse' },
  { id: 'relatorio-de-ultima-hora', name: 'Relatório de Última Hora', tone: 'negativo', text: 'Sua cota do dia aumenta em +2' },
  { id: 'transito', name: 'Trânsito', tone: 'negativo', text: '−2 energia' },
  { id: 'colega-faltou', name: 'Colega Faltou', tone: 'negativo', text: 'Cota do dia +1, mas +R$ 20' },
  { id: 'ar-condicionado-quebrado', name: 'Ar-Condicionado Quebrado', tone: 'negativo', text: 'Todas as cartas custam +1 energia hoje' },
  { id: 'fofoca-de-corredor', name: 'Fofoca de Corredor', tone: 'negativo', text: 'Descarte 1 carta da sua mão ao acaso' },
  { id: 'internet-caiu', name: 'Internet Caiu', tone: 'negativo', text: 'Descarte a mão e compre 3 cartas novas' },
  { id: 'cobranca-no-zap', name: 'Cobrança no Grupo do Zap', tone: 'negativo', text: '+1 estresse. Se você não bater a cota hoje: +2 estresse extra.' },

  // positivas
  { id: 'dormiu-bem', name: 'Dormiu Bem', tone: 'positivo', text: '+3 energia' },
  { id: 'bolo-na-copa', name: 'Bolo na Copa', tone: 'positivo', text: '−2 estresse' },
  { id: 'sexta-de-folga', name: 'Sexta de Folga', tone: 'positivo', text: 'Nenhuma cota hoje' },
  { id: 'elogio-do-chefe', name: 'Elogio do Chefe', tone: 'positivo', text: '−1 estresse, +1 produtividade' },
  { id: 'reembolso-atrasado', name: 'Reembolso Atrasado', tone: 'positivo', text: '+R$ 40' },
  { id: 'dia-tranquilo', name: 'Dia Tranquilo', tone: 'positivo', text: 'Compre 2 cartas a mais hoje' },

  // ambíguas
  {
    id: 'hora-extra-nao-solicitada',
    name: 'Hora Extra Não Solicitada',
    tone: 'ambiguo',
    text: 'O chefe pergunta se você pode ficar mais um pouco.',
    choices: [
      { label: 'Aceitar', text: '+R$ 40 e +3 estresse' },
      { label: 'Recusar', text: '+1 advertência informal (2 informais = 1 advertência real)' },
    ],
  },
  {
    id: 'convite-happy-hour',
    name: 'Convite pro Happy Hour',
    tone: 'ambiguo',
    text: 'O time vai sair depois do expediente.',
    choices: [
      { label: 'Ir', text: '−3 estresse e −3 energia amanhã' },
      { label: 'Não ir', text: '+1 estresse' },
    ],
  },
  {
    id: 'freela-de-um-amigo',
    name: 'Freela de Um Amigo',
    tone: 'ambiguo',
    text: 'Um amigo te chama para um bico rápido.',
    choices: [
      { label: 'Aceitar', text: '+R$ 60, mas sua cota de amanhã aumenta em +2' },
      { label: 'Recusar', text: 'Nada acontece' },
    ],
  },
  {
    id: 'chamado-de-madrugada',
    name: 'Chamado de Madrugada',
    tone: 'ambiguo',
    text: 'O celular toca às 3h da manhã.',
    choices: [
      { label: 'Atender', text: '+R$ 25 e energia de amanhã −4' },
      { label: 'Ignorar', text: '+2 estresse' },
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
