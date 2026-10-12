import type { ActionCard } from './types'

/**
 * O baralho de referência: as cartas como o código as conhece.
 *
 * **Isto não é mais a fonte da verdade.** Desde a v0.10 as cartas moram no
 * banco, e quem as serve para o jogo é `catalogo.ts`. O que sobrou aqui é a
 * SEMENTE (é esta lista que `admin_semear_catalogo` leva para o banco na
 * estreia) e a REDE: sem banco configurado, ou com a rede fora do ar, o jogo
 * abre com estas cartas em vez de não abrir.
 *
 * O que cada uma FAZ continua sendo uma lista de ações (`acoes.ts`), e é por
 * isso que a mudança de casa foi barata: uma carta já era só dado.
 */
export const CARTAS_BASE: ActionCard[] = [
  // --- baralho inicial (15 cartas) ---
  {
    id: 'ced5bff1-3c5e-5aaa-ac5c-5783d18e3d43', name: 'Tarefa Simples', cost: 3, kind: 'tarefa',
    text: '+2 produtividade', starter: true, copies: 3,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 2 }] }],
  },
  {
    id: 'b938f087-c33b-5f04-a740-bfe49bc31d1c', name: 'Planilha Infinita', cost: 1, kind: 'tarefa',
    text: '+1 produtividade', starter: true, copies: 2,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }] }],
  },
  {
    id: 'b05b7d05-8692-537c-a71c-e112526547ff', name: 'Reunião', cost: 2, kind: 'social',
    text: '+1 produtividade. Se for a 2ª reunião do dia: +1 estresse e nenhuma produtividade.',
    especial: true, starter: true, copies: 3,
    // a carta que muda de poder ao se repetir: duas linhas excludentes,
    // separadas pela quantidade de vezes que ELA já saiu hoje
    efeitos: [
      { se: { se: 'jaJogadaHoje', noMaximo: 0 }, acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }] },
      {
        se: { se: 'jaJogadaHoje', aoMenos: 1 },
        acoes: [
          { faz: 'recurso', qual: 'estresse', quanto: 1 },
          { faz: 'mensagem', texto: 'Segunda reunião do dia: só estresse, nenhuma produtividade.' },
        ],
      },
    ],
  },
  {
    id: '49efebc8-f8b2-5495-ad28-472e360fc73b', name: 'Café', cost: 0, kind: 'descanso',
    text: '+3 energia, +1 estresse', starter: true, copies: 2,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'energia', quanto: 3 },
      { faz: 'recurso', qual: 'estresse', quanto: 1 },
    ] }],
  },
  {
    id: 'bea0a018-64c8-57a7-a8df-c33aa2248983', name: 'Hora Extra', cost: 3, kind: 'grana',
    text: '+R$ 40, +2 estresse', starter: true, copies: 2,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 40 },
      { faz: 'recurso', qual: 'estresse', quanto: 2 },
    ] }],
  },
  {
    id: 'aad041c3-ef31-591a-9aa8-2214e0baa736', name: 'Freela', cost: 5, kind: 'grana',
    text: '+R$ 50', starter: true, copies: 1,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'dinheiro', quanto: 50 }] }],
  },
  {
    id: 'd31dcfa9-ae07-50fc-b210-1f0f45a25899', name: 'Enrolar no Corredor', cost: 1, kind: 'descanso',
    text: '−1 estresse', starter: true, copies: 1,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -1 }] }],
  },
  {
    id: 'fd3c3df7-073a-5639-bf61-d033f8359634', name: 'Almoço Decente', cost: 1, kind: 'descanso',
    text: '+2 energia', starter: true, copies: 1,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: 2 }] }],
  },

  // --- desbloqueáveis (recompensa do fim da run) ---
  {
    id: '5d43b8e0-7e90-5ee3-9e3c-f75a05625326', name: 'Atalho no Sistema', cost: 3, kind: 'tarefa',
    text: '+3 produtividade, +1 estresse', starter: false,
    // o +1 de estresse é o que a separa da Tarefa Simples: sem ele, ela era
    // a Tarefa melhor em tudo, pelo mesmo custo
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 3 },
      { faz: 'recurso', qual: 'estresse', quanto: 1 },
    ] }],
  },
  {
    id: '25c1914f-66d7-5e71-986c-967bdf25c08e', name: 'Delegar', cost: 1, kind: 'social',
    text: '+2 produtividade, +1 estresse (alguém vai reclamar)', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 2 },
      { faz: 'recurso', qual: 'estresse', quanto: 1 },
    ] }],
  },
  {
    id: '3c966c34-0f22-508a-8978-42171eb8cac8', raridade: 'rara', name: 'Café Duplo', cost: 0, kind: 'descanso',
    text: '+5 energia, +2 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'energia', quanto: 5 },
      { faz: 'recurso', qual: 'estresse', quanto: 2 },
    ] }],
  },
  {
    id: '94f7cd08-7416-5cca-a1f3-e8df57c40061', raridade: 'incomum', name: 'Terapia', cost: 0, custos: [{ qual: 'dinheiro', quanto: 80 }], kind: 'descanso',
    text: '−3 estresse', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -3 }] }],
  },
  {
    id: '811d6edc-f1bc-515a-8b09-a929d346fb81', name: 'Vale-Refeição', cost: 0, kind: 'grana',
    text: '+R$ 20, compre 1', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 20 },
      { faz: 'comprar', quantas: 1 },
    ] }],
  },
  {
    id: '2e88b97b-d2c4-5742-a32f-b712b7aec5c7', raridade: 'incomum', name: 'Home Office', cost: 3, kind: 'tarefa',
    text: '+2 produtividade, −1 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 2 },
      { faz: 'recurso', qual: 'estresse', quanto: -1 },
    ] }],
  },
  {
    id: '7b7f3c60-882b-5899-835b-29de2a7bb457', raridade: 'incomum', name: 'Foco Total', cost: 4, kind: 'tarefa',
    text: '+4 produtividade, mas descarta o resto da mão', especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 4 },
      { faz: 'descartar', quantas: 'tudo' },
      { faz: 'mensagem', texto: 'Foco Total: o resto da mão foi descartado.' },
    ] }],
  },
  {
    id: 'f0f3db8e-8f86-5c39-842f-2884b12dab52', raridade: 'rara', name: 'Puxar o Saco', cost: 2, kind: 'social',
    text: 'Cancela 1 advertência (uma vez por run)', especial: true, starter: false,
    // o "uma vez por run" e o "só serve se houver advertência" são RESTRIÇÃO,
    // não efeito: eles decidem se dá para jogar, não o que acontece depois
    restricao: { umaVezPorRun: true, exige: { se: 'advertencias', aoMenos: 1 } },
    efeitos: [{ acoes: [{ faz: 'advertencia', quanto: -1 }] }],
  },
  {
    id: 'db6b48c6-b27d-5d23-8c40-c00afc977d5e', raridade: 'incomum', name: 'Freela Grande', cost: 6, kind: 'grana',
    text: '+R$ 90, +2 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 90 },
      { faz: 'recurso', qual: 'estresse', quanto: 2 },
    ] }],
  },
  {
    id: '3f71cf94-a451-5caa-bc25-ba5611625604', name: 'Soneca no Banheiro', cost: 1, kind: 'descanso',
    text: '+2 energia, −1 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'energia', quanto: 2 },
      { faz: 'recurso', qual: 'estresse', quanto: -1 },
    ] }],
  },
  {
    id: '8b0bba55-009c-599c-98e2-fef03ebe7e79', raridade: 'lendaria', name: 'Automatizar', cost: 5, kind: 'tarefa',
    text: '+2 produtividade agora e +1 produtividade em todos os dias seguintes',
    especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 2 },
      { faz: 'recorrente', qual: 'produtividade', quanto: 1, cada: 'dia' },
    ] }],
  },
  {
    id: 'e3a9ee66-ff4f-56ad-bcf8-a29379cded17', name: 'Reorganizar a Mesa', cost: 1,
    // A primeira carta NEUTRA: sem classe. Ela não entra em embalo nenhum e
    // quebra o que estiver em pé — é o preço de servir para tudo.
    kind: null,
    text: 'Descarte 1 carta à sua escolha e compre 1.',
    especial: true, starter: false,
    // e a primeira que PERGUNTA: `escolherDescarte` para o dia até o jogador
    // apontar a carta, e só então roda o `entao`. "Descarte 1 à sua escolha"
    // é uma decisão, e decisão precisa de mão à mostra — diferente do
    // descarte ao acaso da Fofoca de Corredor
    efeitos: [{ acoes: [{
      faz: 'escolherDescarte', quantas: 1, porque: 'Reorganizar a Mesa',
      entao: [{ faz: 'comprar', quantas: 1 }],
    }] }],
  },
  {
    id: '0edbd54b-3f72-588d-accf-3b20bdf9251b', raridade: 'lendaria', name: 'Pedir Aumento', cost: 3, kind: 'social',
    text: '50%: salário +R$ 100 pelo resto da run. 50%: +3 estresse.',
    especial: true, starter: false,
    efeitos: [{ acoes: [{
      faz: 'sorteio', chance: 0.5,
      entao: [
        { faz: 'recorrente', qual: 'dinheiro', quanto: 100, cada: 'semana' },
        { faz: 'mensagem', texto: 'Pedir Aumento: deu certo! Salário +R$ 100 pelo resto da run.' },
      ],
      senao: [
        { faz: 'recurso', qual: 'estresse', quanto: 3 },
        { faz: 'mensagem', texto: 'Pedir Aumento: "vamos ver no próximo ciclo". +3 estresse.' },
      ],
    }] }],
  },

  // --- v0.15: as que se pagam em R$, e as que faltavam ---
  // As pagas ligam grana a descanso: até aqui o dinheiro só virava pontuação.
  {
    id: 'c3353052-22f6-5670-87e4-ef4f9c18ef33', name: 'Delivery', cost: 0, custos: [{ qual: 'dinheiro', quanto: 25 }], kind: 'descanso',
    text: '+2 energia', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: 2 }] }],
  },
  {
    id: 'e0ccc0c9-852a-5507-a778-26d094bf1d52', raridade: 'incomum', name: 'Academia no Almoço', cost: 1, custos: [{ qual: 'dinheiro', quanto: 40 }],
    kind: 'descanso', text: '−2 estresse. Amanhã: +1 energia', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -2 },
      { faz: 'amanha', acoes: [{ faz: 'recurso', qual: 'energia', quanto: 1 }] },
    ] }],
  },
  {
    id: '1321a648-d8e0-57ab-b98d-4af9c01aa2b3', name: 'Uber pra Casa', cost: 0, custos: [{ qual: 'dinheiro', quanto: 30 }], kind: 'descanso',
    text: 'Amanhã: +2 energia', starter: false,
    efeitos: [{ acoes: [{ faz: 'amanha', acoes: [{ faz: 'recurso', qual: 'energia', quanto: 2 }] }] }],
  },
  {
    id: '1727fc63-e17d-5253-8cc8-f1c5d0dfcce6', name: 'Checklist', cost: 1, kind: 'tarefa',
    text: '+1 produtividade, compre 1', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 1 },
      { faz: 'comprar', quantas: 1 },
    ] }],
  },
  {
    id: '62b2450e-ecdd-53f5-9354-d4c34cce3e09', raridade: 'incomum', name: 'Prazo Apertado', cost: 2, kind: 'tarefa',
    text: '1ª do dia: +4 produtividade. Senão: +2 e +1 estresse',
    especial: true, starter: false,
    efeitos: [{ acoes: [{
      faz: 'se', condicao: { se: 'cartasJogadasHoje', noMaximo: 0 },
      entao: [{ faz: 'recurso', qual: 'produtividade', quanto: 4 }],
      senao: [
        { faz: 'recurso', qual: 'produtividade', quanto: 2 },
        { faz: 'recurso', qual: 'estresse', quanto: 1 },
      ],
    }] }],
  },
  {
    id: '8eeef200-50fb-5448-aab8-e4c70ac129cb', raridade: 'epica', name: 'Café com o Chefe', cost: 1, kind: 'social',
    text: 'Com advertência: tira 1, +2 estresse. Sem: +1 produtividade',
    especial: true, starter: false,
    efeitos: [{ acoes: [{
      faz: 'se', condicao: { se: 'advertencias', aoMenos: 1 },
      entao: [
        { faz: 'advertencia', quanto: -1 },
        { faz: 'recurso', qual: 'estresse', quanto: 2 },
      ],
      senao: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }],
    }] }],
  },
  {
    id: 'e4aa88ea-adb1-5063-af2a-5dbe64e73d29', raridade: 'incomum', name: 'Mentoria', cost: 2, kind: 'social',
    text: 'Compre 2', starter: false,
    efeitos: [{ acoes: [{ faz: 'comprar', quantas: 2 }] }],
  },
  {
    id: 'a6b2c3a1-c9e9-516f-99b9-486997b80fb4', raridade: 'incomum', name: 'Happy Hour', cost: 0, custos: [{ qual: 'dinheiro', quanto: 50 }], kind: 'social',
    text: '−2 estresse. Amanhã: +1 carta na mão', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -2 },
      { faz: 'amanha', acoes: [{ faz: 'maoDoDia', quantas: 1, relativo: true }] },
    ] }],
  },
  {
    id: '11f0461b-4d0b-52dd-bdec-587010591fab', raridade: 'incomum', name: 'Vender as Férias', cost: 0, kind: 'grana',
    text: '+R$ 120, +3 estresse', starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'dinheiro', quanto: 120 },
      { faz: 'recurso', qual: 'estresse', quanto: 3 },
    ] }],
  },
  {
    id: 'b8735ccc-16ee-5041-810e-1fe15fbf10c5', raridade: 'epica', name: 'Investimento', cost: 0, custos: [{ qual: 'dinheiro', quanto: 100 }], kind: 'grana',
    text: '+R$ 40 toda sexta, pelo resto da run', especial: true, starter: false,
    efeitos: [{ acoes: [{ faz: 'recorrente', qual: 'dinheiro', quanto: 40, cada: 'semana' }] }],
  },
  {
    id: '2c17eadd-af86-5bbc-a6c7-a42068f18689', name: 'Bico de Fim de Semana', cost: 2, kind: 'grana',
    text: 'Nesta sexta: +R$ 60', starter: false,
    efeitos: [{ acoes: [{ faz: 'recorrente', qual: 'dinheiro', quanto: 60, cada: 'semana', duracao: 1 }] }],
  },
  {
    id: 'dc6b100e-dc59-53df-b0da-4443f51edcb3', raridade: 'incomum', name: 'Pausa Estratégica', cost: 0, kind: null,
    text: 'Descarte a mão e compre 3', especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'descartar', quantas: 'tudo', porque: 'Pausa Estratégica' },
      { faz: 'comprar', quantas: 3 },
    ] }],
  },

  // --- v0.18: o estresse como combustível ---
  // Só saem com o estresse ALTO, e jogar gasta esse estresse. É a primeira
  // saída da espiral que mata a run na semana 1: quanto pior o dia, mais
  // forte a mão. Não é um tipo de custo novo de propósito — "custo" que
  // baixa o estresse seria um custo que todo mundo quer pagar, e o foguinho
  // vermelho leria ao contrário. É a RESTRIÇÃO (precisa de N) mais o efeito
  // (−N), o mesmo par do Puxar o Saco.
  {
    id: '95a0467d-5668-579e-8b7c-dc47994b757a', raridade: 'incomum', name: 'Canalizar a Raiva', cost: 1, kind: 'tarefa',
    text: 'Só com 4+ de estresse. −3 estresse, +4 produtividade', especial: true, starter: false,
    restricao: { exige: { se: 'recurso', qual: 'estresse', aoMenos: 4 } },
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -3 },
      { faz: 'recurso', qual: 'produtividade', quanto: 4 },
    ] }],
  },
  {
    id: '6948051b-996a-5e9c-9771-2cede56948ab', name: 'Desabafo no Café', cost: 0, kind: 'social',
    text: 'Só com 6+ de estresse. −4 estresse, compre 1', especial: true, starter: false,
    restricao: { exige: { se: 'recurso', qual: 'estresse', aoMenos: 6 } },
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -4 },
      { faz: 'comprar', quantas: 1 },
    ] }],
  },
  {
    id: '022960ba-28d4-5955-9898-97f21898bb90', raridade: 'epica', name: 'Grito no Travesseiro', cost: 0, kind: 'descanso',
    text: 'Só com 8+ de estresse, uma vez por run. −5 estresse, +2 energia', especial: true, starter: false,
    restricao: { umaVezPorRun: true, exige: { se: 'recurso', qual: 'estresse', aoMenos: 8 } },
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -5 },
      { faz: 'recurso', qual: 'energia', quanto: 2 },
    ] }],
  },

  // --- v0.18: as que cobram outra coisa além de energia, e as que faltavam ---
  // A lista de custos (v0.17) abriu espaço para carta que se paga em estresse
  // ou em produtividade: trocar saúde por meta, ou parar de trabalhar para
  // respirar. Nenhuma pediu ação nova no motor.
  {
    id: '23d3c47e-db32-5a33-a380-06293840ab6c', raridade: 'incomum', name: 'Raiva', cost: 0, custos: [{ qual: 'estresse', quanto: 2 }], kind: 'tarefa',
    text: '+4 produtividade', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 4 }] }],
  },
  {
    id: '14197801-84be-5d44-a1e6-b154a280f46e', raridade: 'epica', name: 'Virar a Noite', cost: 0, custos: [{ qual: 'estresse', quanto: 4 }], kind: 'tarefa',
    text: '+6 produtividade. Amanhã: −2 energia', especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'produtividade', quanto: 6 },
      { faz: 'amanha', acoes: [{ faz: 'recurso', qual: 'energia', quanto: -2 }] },
    ] }],
  },
  {
    id: '0541daa3-5b00-5097-b5a9-5ca878ca2abe', name: 'Respirar Fundo', cost: 0, custos: [{ qual: 'produtividade', quanto: 2 }], kind: 'social',
    text: '−3 estresse', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -3 }] }],
  },
  {
    id: '9eec5854-d578-50c8-9681-9b44d0a5ebfa', raridade: 'incomum', name: 'Pedir Desculpas', cost: 1, custos: [{ qual: 'dinheiro', quanto: 30 }], kind: 'social',
    text: 'Cancela 1 advertência (uma vez por run)', especial: true, starter: false,
    // o mesmo par de restrições do Puxar o Saco: sem advertência, não há do
    // que se desculpar
    restricao: { umaVezPorRun: true, exige: { se: 'advertencias', aoMenos: 1 } },
    efeitos: [{ acoes: [{ faz: 'advertencia', quanto: -1 }] }],
  },
  {
    id: '3c7ded24-1c4d-5550-ba40-c0a3fc964ca3', name: 'Café Expresso', cost: 0, custos: [{ qual: 'dinheiro', quanto: 8 }], kind: 'descanso',
    text: '+2 energia', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'energia', quanto: 2 }] }],
  },
  {
    id: '25a631e8-4265-5091-b171-cfb0ef807894', raridade: 'incomum', name: 'Terceirizar', cost: 0, custos: [{ qual: 'dinheiro', quanto: 60 }], kind: 'grana',
    text: '+3 produtividade', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 3 }] }],
  },
  {
    id: '449ea672-72b3-5dd2-952e-2b1ddcd156c6', name: 'Engolir Sapo', cost: 0, custos: [{ qual: 'estresse', quanto: 1 }], kind: 'social',
    text: '+R$ 40', starter: false,
    efeitos: [{ acoes: [{ faz: 'recurso', qual: 'dinheiro', quanto: 40 }] }],
  },
  {
    id: '039b4cfa-c1d8-5114-bc4b-ac0be4746a83', name: 'Reunião que Podia Ser E-mail', cost: 2, kind: 'social',
    text: '+1 produtividade. Se já jogou outra social hoje: −2 estresse', especial: true, starter: false,
    // os efeitos rodam ANTES de a carta entrar em `playedToday`, então
    // "aoMenos: 1" conta só as sociais anteriores — ela mesma não se conta
    efeitos: [
      { acoes: [{ faz: 'recurso', qual: 'produtividade', quanto: 1 }] },
      {
        se: { se: 'classeJogadaHoje', classe: 'social', aoMenos: 1 },
        acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -2 }],
      },
    ],
  },
  {
    id: '18faf4b7-bd8c-571b-b872-9f4c961f33b8', name: 'Faxina na Caixa de Entrada', cost: 1, kind: 'tarefa',
    text: 'Descarte 1 carta à sua escolha e compre 2', especial: true, starter: false,
    efeitos: [{ acoes: [{
      faz: 'escolherDescarte', quantas: 1, porque: 'Faxina na Caixa de Entrada',
      entao: [{ faz: 'comprar', quantas: 2 }],
    }] }],
  },
  {
    id: 'bf70b1d6-612f-587a-bc2a-834c9fb090ca', raridade: 'incomum', name: 'Meditação no Banheiro', cost: 0,
    custos: [{ qual: 'produtividade', quanto: 1 }], kind: 'descanso',
    text: '−2 estresse. Com 6+ de estresse: −2 a mais', especial: true, starter: false,
    // o bloco condicional vem PRIMEIRO: ele pergunta o estresse de antes da
    // carta, e não o que sobrou depois do −2 de baixo
    efeitos: [
      {
        se: { se: 'recurso', qual: 'estresse', aoMenos: 6 },
        acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -2 }],
      },
      { acoes: [{ faz: 'recurso', qual: 'estresse', quanto: -2 }] },
    ],
  },
  {
    id: 'a166b323-c654-5f5f-b551-584b5d13a1b0', raridade: 'epica', name: 'Plantão', cost: 0, custos: [{ qual: 'estresse', quanto: 3 }], kind: 'grana',
    text: '+R$ 50 toda sexta, por 2 semanas', especial: true, starter: false,
    efeitos: [{ acoes: [{ faz: 'recorrente', qual: 'dinheiro', quanto: 50, cada: 'semana', duracao: 2 }] }],
  },
  {
    id: 'cca0dd64-0316-5517-84fb-687c114df081', name: 'Deixar pra Amanhã', cost: 0, kind: null,
    text: '−1 estresse. Amanhã: cota +2', especial: true, starter: false,
    efeitos: [{ acoes: [
      { faz: 'recurso', qual: 'estresse', quanto: -1 },
      { faz: 'amanha', acoes: [{ faz: 'cota', quanto: 2 }] },
    ] }],
  },
]

/**
 * A versão do baralho de referência. Quando o catálogo vem do banco quem
 * manda é `public.baralho.versao`; este número é o que vale enquanto o jogo
 * estiver rodando só com o código.
 *
 * Não é a versão do site (`changelog.ts`): duas entregas seguidas que não
 * tocam em carta nenhuma mantêm o mesmo número aqui, e é isso que o deixa
 * comparável entre runs.
 */
export const VERSAO_BARALHO_BASE = 5

/**
 * O PORQUÊ de cada carta que o código mudou e o banco talvez ainda não tenha.
 *
 * O banco semeado não é sobrescrito pelo código (é a regra que protege o que
 * o admin editou no /lab), e por isso o baralho v3 escrito aqui não chegou
 * sozinho a produção. Quem leva é o "Trazer do código" do /lab/cartas, e
 * como todo salvamento de carta ele exige um motivo: é este. O que mudou (o
 * número) a bancada escreve sozinha; o porquê é o que um diff não sabe.
 */
export const MOTIVOS_DO_CODIGO: Record<string, string> = {
  // v0.19: as primeiras épicas e lendárias. Lendária é a carta que muda o
  // resto da run; épica, a que decide um dia inteiro
  '8b0bba55-009c-599c-98e2-fef03ebe7e79': 'Virou lendária: é a carta que muda o resto da run, e agora vem uma cópia só.', // Automatizar
  '0edbd54b-3f72-588d-accf-3b20bdf9251b': 'Virou lendária: um salário maior pelo resto da run é a maior virada do jogo.', // Pedir Aumento
  '8eeef200-50fb-5448-aab8-e4c70ac129cb': 'Virou épica: uma das cartas que decidem uma semana.', // Café com o Chefe
  'b8735ccc-16ee-5041-810e-1fe15fbf10c5': 'Virou épica: a renda de toda sexta é um prêmio de envelope bom.', // Investimento
  '23d3c47e-db32-5a33-a380-06293840ab6c': 'Primeira carta que se paga em estresse: troca saúde por meta, para quem tem energia de sobra e cota faltando.', // Raiva
  '14197801-84be-5d44-a1e6-b154a280f46e': 'O tudo ou nada: muita produtividade hoje, paga em estresse agora e em energia amanhã. Épica: decide um dia inteiro.', // Virar a Noite
  '0541daa3-5b00-5097-b5a9-5ca878ca2abe': 'Primeira carta que se paga em produtividade: parar de trabalhar para respirar.', // Respirar Fundo
  '9eec5854-d578-50c8-9681-9b44d0a5ebfa': 'Uma saída para a demissão que se paga em dinheiro, e não em puxar o saco.', // Pedir Desculpas
  '3c7ded24-1c4d-5550-ba40-c0a3fc964ca3': 'O café que custa dinheiro em vez de estresse: o de sempre cansa, este pesa no bolso.', // Café Expresso
  '25a631e8-4265-5091-b171-cfb0ef807894': 'Comprar produtividade: para quem tem dinheiro e não tem energia.', // Terceirizar
  '449ea672-72b3-5dd2-952e-2b1ddcd156c6': 'Dinheiro pago em estresse, sem gastar energia nenhuma.', // Engolir Sapo
  '039b4cfa-c1d8-5114-bc4b-ac0be4746a83': 'Recompensa quem monta o naipe social.', // Reunião que Podia Ser E-mail
  '18faf4b7-bd8c-571b-b872-9f4c961f33b8': 'Trocar carta da mão por mais cartas, que quase não existia no jogo.', // Faxina na Caixa de Entrada
  'bf70b1d6-612f-587a-bc2a-834c9fb090ca': 'Mais forte na hora do aperto, que é quando o estresse mata.', // Meditação no Banheiro
  'a166b323-c654-5f5f-b551-584b5d13a1b0': 'Uma renda que entra semana a semana, paga em estresse. Épica: é prêmio de envelope bom.', // Plantão
  'cca0dd64-0316-5517-84fb-687c114df081': 'Empurrar o problema para amanhã, que é o assunto do jogo.', // Deixar pra Amanhã
  '95a0467d-5668-579e-8b7c-dc47994b757a': 'O estresse como combustível: a carta fica mais forte justamente quando a espiral do estresse aperta.', // Canalizar a Raiva
  '6948051b-996a-5e9c-9771-2cede56948ab': 'Uma saída para o dia ruim que não custa energia: só sai quando o estresse já está alto.', // Desabafo no Café
  '022960ba-28d4-5955-9898-97f21898bb90': 'O último recurso perto do burnout, uma vez por run. Épica: tira a run do buraco.', // Grito no Travesseiro
  '5d43b8e0-7e90-5ee3-9e3c-f75a05625326': 'Era a Tarefa melhor em tudo: mais produtividade pelo mesmo custo e sem preço nenhum.', // Atalho no Sistema
  '2e88b97b-d2c4-5742-a32f-b712b7aec5c7': 'Rendia 1 de produtividade por energia e ainda tirava estresse; a régua (Tarefa Simples) é 0,67.', // Home Office
  'b938f087-c33b-5f04-a740-bfe49bc31d1c': 'A 0,5 de produtividade por energia só servia de enchimento.', // Planilha Infinita
  '94f7cd08-7416-5cca-a1f3-e8df57c40061': 'Ideia do autor: tira estresse de verdade, mas com custo de verdade, em dinheiro.', // Terapia
  '811d6edc-f1bc-515a-8b09-a929d346fb81': 'Era dinheiro de graça; agora também compra uma carta.', // Vale-Refeição
  'bea0a018-64c8-57a7-a8df-c33aa2248983': 'Era a pior troca do jogo: energia demais por pouco dinheiro.', // Hora Extra
  '3c966c34-0f22-508a-8978-42171eb8cac8': 'Armadilha consciente: energia agora, estresse depois. Rara para não aparecer toda hora.', // Café Duplo
  'b05b7d05-8692-537c-a71c-e112526547ff': 'O baralho inicial passou a ter pelo menos 3 cartas de cada naipe.', // Reunião
  'ced5bff1-3c5e-5aaa-ac5c-5783d18e3d43': 'Uma Tarefa Simples cedeu lugar à terceira Reunião (3 por naipe no inicial).', // Tarefa Simples
}

/**
 * Os números do jogo (aluguel, cota, salário, energia base) NÃO moram mais
 * aqui: viraram modo de jogo, em `regras.ts`, e vêm do banco como as cartas.
 * Mexer no aluguel deixou de ser mexer no código.
 */
