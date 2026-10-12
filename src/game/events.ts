import type { EventCard } from './types'

/**
 * Os 20 eventos de referência — a semente e a rede, como em `cards.ts`.
 * A fonte da verdade é a tabela `cartas_evento`; quem serve é `catalogo.ts`.
 *
 * Como as cartas, o que eles fazem é lista de ação — e por
 * isso `revealEvent` não tem mais um `switch` com um `case` por evento.
 *
 * Dois deles dependem de QUANDO o efeito roda, e é só por isso que `quando`
 * existe: a Fofoca descarta depois de a mão chegar, e a Cobrança no Zap só
 * pesa no fim do dia, se a cota não tiver sido batida.
 */
export const EVENTOS_BASE: EventCard[] = [
  // negativas
  {
    id: '540d7c81-046e-5924-b9b3-4d019b16d50f', name: 'Sistema Fora do Ar', tone: 'negativo',
    text: 'Você não pode jogar cartas de Tarefa hoje',
    efeitos: [{ acoes: [{ faz: 'bloquearClasse', classe: 'tarefa' }] }],
  },
  {
    id: '0c3214af-7625-5024-acd7-678c269efa16', name: 'Reunião de Alinhamento', tone: 'negativo',
    text: '−3 energia',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: -3 }] }],
  },
  {
    id: 'fe92514c-a55e-5017-9826-d5d8662d4423', name: 'Chefe de Mau Humor', tone: 'negativo',
    text: '+2 estresse',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: 2 }] }],
  },
  {
    id: 'e93bd273-46b1-5fa5-94bc-c85c1b135573', name: 'Relatório de Última Hora', tone: 'negativo',
    text: 'Sua cota do dia aumenta em +2',
    efeitos: [{ acoes: [{ faz: 'cota', quanto: 2 }] }],
  },
  {
    id: '5c5445ab-5081-58c3-8a4a-b41dd75ef504', name: 'Trânsito', tone: 'negativo', text: '−2 energia',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: -2 }] }],
  },
  {
    id: '620244e4-7a3c-5b0a-a302-26d3197095ca', name: 'Colega Faltou', tone: 'negativo',
    text: 'Cota do dia +1, mas +R$ 20',
    efeitos: [{ acoes: [
      { faz: 'cota', quanto: 1 },
      { faz: 'recurso', qual: 'dinheiro', quanto: 20 },
    ] }],
  },
  {
    id: 'e1e8c912-72f8-5c14-8e7b-47cbd263a897', name: 'Ar-Condicionado Quebrado', tone: 'negativo',
    text: 'Todas as cartas custam +1 energia hoje',
    efeitos: [{ acoes: [{ faz: 'custo', quanto: 1 }] }],
  },
  // v0.20: eventos que mexem nos custos novos (dinheiro, estresse). O
  // Ar-Condicionado mexia só na energia; com cartas que se pagam em outra
  // coisa, o dia também pode mudar o preço delas
  {
    id: '3329ebd7-3563-5966-9f50-d7d913888275', name: 'Black Friday', tone: 'positivo',
    text: 'Cartas que custam dinheiro custam R$ 20 a menos hoje',
    efeitos: [{ acoes: [{ faz: 'custo', qual: 'dinheiro', quanto: -20 }] }],
  },
  {
    id: '78b694c1-5c12-5fe9-8f49-a64646343f28', name: 'Inflação', tone: 'negativo',
    text: 'Cartas que custam dinheiro custam R$ 15 a mais hoje',
    efeitos: [{ acoes: [{ faz: 'custo', qual: 'dinheiro', quanto: 15 }] }],
  },
  {
    id: 'ce999b9d-fa95-5001-a053-f6c86be98797', name: 'Chefe de Folga', tone: 'positivo',
    text: 'Cartas que custam estresse custam 1 a menos hoje',
    efeitos: [{ acoes: [{ faz: 'custo', qual: 'estresse', quanto: -1 }] }],
  },
  {
    id: 'a8125c87-8fa0-511b-ab28-76be4c57ae57', name: 'Pressão por Resultado', tone: 'negativo',
    text: 'Cartas que custam estresse custam 1 a mais hoje',
    efeitos: [{ acoes: [{ faz: 'custo', qual: 'estresse', quanto: 1 }] }],
  },
  {
    id: '6912e771-28f2-56df-ab1c-e7c2c1295130', name: 'Dia de Entrega', tone: 'negativo',
    text: 'Cartas que custam produtividade custam 1 a mais hoje, e a cota sobe 1',
    efeitos: [{ acoes: [{ faz: 'custo', qual: 'produtividade', quanto: 1 }, { faz: 'cota', quanto: 1 }] }],
  },
  {
    id: '42b9a922-0ec0-5ae2-89de-30d90ca896f7', name: 'Fofoca de Corredor', tone: 'negativo',
    text: 'Descarte 1 carta da sua mão ao acaso',
    // depois de comprar, senão não haveria mão para descartar
    efeitos: [{ quando: 'aposComprar', acoes: [{ faz: 'descartar', quantas: 1, aleatorio: true, porque: 'Fofoca de Corredor' }] }],
  },
  {
    id: '902ea8dc-76a0-59ca-97a1-fbf871f6aaed', name: 'Limpeza de Mesa', tone: 'negativo',
    text: 'O chefe mandou "organizar": descarte 2 cartas à sua escolha',
    // depois de comprar, senão não haveria mão para escolher
    efeitos: [{ quando: 'aposComprar', acoes: [
      { faz: 'escolherDescarte', quantas: 2, porque: 'Limpeza de Mesa' },
    ] }],
  },
  {
    id: '317fb236-1dec-5a6e-87b8-ba2a5aaa3ab6', name: 'Internet Caiu', tone: 'negativo',
    text: 'Descarte a mão e compre 3 cartas novas',
    efeitos: [{ acoes: [{ faz: 'maoDoDia', quantas: 3 }] }],
  },
  {
    id: '72f9933c-75be-5fa8-a21a-c0ba966534ec', name: 'Cobrança no Grupo do Zap', tone: 'negativo',
    text: '+1 estresse. Se você não bater a cota hoje: +2 estresse extra.',
    efeitos: [
      { acoes: [{ faz: 'recurso', qual: 'estresse', quanto: 1 }] },
      {
        quando: 'fimDoDia',
        se: { se: 'cotaBatida', valor: false },
        acoes: [
          { faz: 'recurso', qual: 'estresse', quanto: 2 },
          { faz: 'mensagem', texto: 'A cobrança no grupo do zap piorou: +2 estresse extra.' },
        ],
      },
    ],
  },

  // positivas
  {
    id: '73b723b8-3dcf-555f-bb53-aba393d84ce5', name: 'Dormiu Bem', tone: 'positivo', text: '+3 energia',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: 3 }] }],
  },
  {
    id: '93d76337-cb02-5a03-8a82-cfa40029545c', name: 'Bolo na Copa', tone: 'positivo', text: '−2 estresse',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -2 }] }],
  },
  {
    id: '1d5c9c9f-75d4-59fe-96b8-92ec5bf937e3', name: 'Sexta de Folga', tone: 'positivo', text: 'Nenhuma cota hoje',
    efeitos: [{ acoes: [{ faz: 'cota', quanto: 0, absoluto: true }] }],
  },
  {
    id: '97a168f0-d090-5753-9186-733ed9300efd', name: 'Elogio do Chefe', tone: 'positivo',
    text: '−1 estresse, +1 produtividade',
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -1 },
      { faz: 'recurso', qual: 'produtividade', quanto: 1 },
    ] }],
  },
  {
    id: 'fe4cce8c-25fe-5dd6-a9bf-4c6f02b3d8a3', name: 'Reembolso Atrasado', tone: 'positivo', text: '+R$ 40',
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'dinheiro', quanto: 40 }] }],
  },
  {
    id: '8fbb9914-04c0-5c0c-84ef-34d775ce128b', name: 'Dia Tranquilo', tone: 'positivo', text: 'Compre 2 cartas a mais hoje',
    efeitos: [{ acoes: [{ faz: 'maoDoDia', quantas: 2, relativo: true }] }],
  },

  // ambíguas
  {
    id: '18942650-6db3-576e-a27e-4d49ad00925d',
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
    id: 'c82b74c9-2b17-5525-9b06-d991bfd22f9c',
    name: 'Convite pro Happy Hour',
    tone: 'ambiguo',
    text: 'O time vai sair depois do expediente.',
    choices: [
      {
        label: 'Ir', text: '−3 estresse e −3 energia amanhã',
        acoes: [
          { faz: 'recurso', qual: 'estresse', quanto: -3 },
          { faz: 'amanha', acoes: [{ faz: 'recurso', qual: 'energia', quanto: -3 }] },
        ],
      },
      { label: 'Não ir', text: '+1 estresse', acoes: [{ faz: 'recurso', qual: 'estresse', quanto: 1 }] },
    ],
  },
  {
    id: '0a5a91fc-36e0-5618-8e79-1b9d16eca945',
    name: 'Freela de Um Amigo',
    tone: 'ambiguo',
    text: 'Um amigo te chama para um bico rápido.',
    choices: [
      {
        label: 'Aceitar', text: '+R$ 60, mas sua cota de amanhã aumenta em +2',
        acoes: [
          { faz: 'recurso', qual: 'dinheiro', quanto: 60 },
          { faz: 'amanha', acoes: [{ faz: 'cota', quanto: 2 }] },
        ],
      },
      { label: 'Recusar', text: 'Nada acontece', acoes: [] },
    ],
  },
  {
    id: 'ee88ab97-f4dc-55bb-8662-1eff0373f34d',
    name: 'Chamado de Madrugada',
    tone: 'ambiguo',
    text: 'O celular toca às 3h da manhã.',
    choices: [
      {
        label: 'Atender', text: '+R$ 25 e energia de amanhã −4',
        acoes: [
          { faz: 'recurso', qual: 'dinheiro', quanto: 25 },
          { faz: 'amanha', acoes: [{ faz: 'recurso', qual: 'energia', quanto: -4 }] },
        ],
      },
      { label: 'Ignorar', text: '+2 estresse', acoes: [{ faz: 'recurso', qual: 'estresse', quanto: 2 }] },
    ],
  },
]

/** O porquê dos eventos que o código mudou ou criou, para o "Trazer do
 *  código" do /lab/eventos — o mesmo papel de `MOTIVOS_DO_CODIGO` nas cartas. */
export const MOTIVOS_DOS_EVENTOS: Record<string, string> = {
  '3329ebd7-3563-5966-9f50-d7d913888275': 'Com cartas pagas em dinheiro, o dia também pode baratear o preço delas.', // Black Friday
  '78b694c1-5c12-5fe9-8f49-a64646343f28': 'O outro lado da Black Friday: o dia em que tudo que se paga em dinheiro encarece.', // Inflação
  'ce999b9d-fa95-5001-a053-f6c86be98797': 'Um alívio para as cartas pagas em estresse.', // Chefe de Folga
  'a8125c87-8fa0-511b-ab28-76be4c57ae57': 'O dia em que as cartas pagas em estresse pesam mais.', // Pressão por Resultado
  '6912e771-28f2-56df-ab1c-e7c2c1295130': 'O primeiro evento que mexe no custo em produtividade.', // Dia de Entrega
}
