/**
 * O histórico do jogo, escrito à mão a partir dos commits. Não sai do git em
 * tempo de execução de propósito: o site é estático e não tem servidor para
 * consultar o GitHub, e além disso "Corrige a nota de deploy no README" não
 * interessa a ninguém que joga. Aqui entra o que muda a experiência.
 *
 * Ao entregar coisa nova, acrescente a versão no TOPO e mova para cá o que
 * saiu de `EM_ANDAMENTO`.
 */

export interface Versao {
  versao: string
  data: string
  titulo: string
  itens: { tipo: 'novo' | 'melhor' | 'correcao'; texto: string }[]
}

export const ROTULO_TIPO: Record<Versao['itens'][number]['tipo'], string> = {
  novo: 'Novo',
  melhor: 'Melhor',
  correcao: 'Corrigido',
}

/** O que está sendo feito agora, ou logo depois. Sem data, de propósito. */
export const EM_ANDAMENTO: string[] = [
  'Rebalancear: a medição com 1000 partidas simuladas mostrou 98% de burnout, quase sempre na primeira semana — o jogo está mais duro do que deveria.',
  'Efeitos sonoros: um som por carta jogada, cota batida, advertência, vitória e derrota.',
  'Recompensa para quem manda bom feedback — a nota que o admin dá já está virando pontos.',
  'Notificação de verdade (e-mail ou aviso no aparelho) quando o seu relato mudar de estado.',
  'Rebalancear o jogo depois do Embalo, em especial as cartas de grana — a medição já mostrou que o despejo quase não acontece e que o embalo de grana é caro demais para sair.',
  'Deixar clonar o repositório e jogar sem configurar banco nenhum.',
  'Animação das cartas voando do baralho para a mão, como no protótipo.',
]

export const VERSOES: Versao[] = [
  {
    versao: '0.17',
    data: '2026-10-10',
    titulo: 'Custos de qualquer recurso',
    itens: [
      { tipo: 'novo', texto: 'Uma carta pode custar mais do que energia: dinheiro, estresse ou produtividade, cada um com o seu carimbo, na cor do medidor. Tudo é pago antes do efeito; sem dinheiro ou produtividade suficiente, a carta não sai da mão.' },
      { tipo: 'melhor', texto: 'As cartas que tiravam dinheiro pelo efeito (o "−R$" do texto) passam a cobrar como custo: não dá mais para jogá-las sem saldo e descobrir o despejo só na sexta.' },
    ],
  },
  {
    versao: '0.16',
    data: '2026-10-10',
    titulo: 'Missões diárias e envelopes',
    itens: [
      { tipo: 'novo', texto: 'Missões diárias: terminar uma partida dá um envelope pardo, e vencer uma dá um envelope confidencial. Elas renovam à meia-noite e aparecem no início e no recibo de fim de run.' },
      { tipo: 'novo', texto: 'Carta agora vem de envelope: três cartas por envelope, uma incomum no pardo e uma rara no confidencial — direto para a coleção. A escolha de carta no fim da run saiu.' },
      { tipo: 'melhor', texto: 'As notas fiscais (a sexta-feira e o fim de run) sobem de baixo da tela, como papel saindo da maquininha, e saem por cima. Os outros popups somem devagar em vez de piscar.' },
      { tipo: 'correcao', texto: 'A conquista Colecionador não contava as cartas da coleção nova, com cópias.' },
    ],
  },
  {
    versao: '0.15',
    data: '2026-10-09',
    titulo: 'A coleção ganhou cópias',
    itens: [
      { tipo: 'novo', texto: 'A coleção conta CÓPIAS: dá para ter até 4 de uma carta comum, 3 de uma incomum e 2 de uma rara, e escolher quantas delas vão para o baralho.' },
      { tipo: 'novo', texto: 'Até três baralhos com nome, um equipado. "Novo" começa como cópia do atual.' },
      { tipo: 'novo', texto: 'O baralho tem limites: de 15 a 25 cartas, com pelo menos 3 de cada naipe (tarefa, descanso, grana e social). A contagem fica sempre à vista, e a mesa diz o que falta em vez de começar.' },
      { tipo: 'melhor', texto: 'Clique duplo ou arrastar para a outra coluna move UMA cópia — antes, tirar a Tarefa Simples tirava as quatro de uma vez. O clique abre a carta, com o seletor de cópias e o histórico dela.' },
      { tipo: 'novo', texto: 'A recompensa saiu da sexta e foi para o fim da run, ganhando ou perdendo: escolha uma carta para a coleção. Quanto mais longe a run foi, melhores as opções — a rara só aparece da semana 4 em diante, e quem vence escolhe entre quatro.' },
      { tipo: 'novo', texto: 'As cartas têm raridade: comum, incomum e rara.' },
      { tipo: 'novo', texto: 'Cartas que se pagam em dinheiro: o carimbo verde mostra o preço, e sem saldo a carta não sai da mão — antes, a Terapia de R$ deixava jogar no vermelho e o despejo vinha na sexta.' },
      { tipo: 'novo', texto: 'Doze cartas novas: Delivery, Academia no Almoço, Uber pra Casa, Checklist, Prazo Apertado, Café com o Chefe, Mentoria, Happy Hour, Vender as Férias, Investimento, Bico de Fim de Semana e Pausa Estratégica.' },
      { tipo: 'melhor', texto: 'Ajustes: Atalho no Sistema dá +1 estresse; Home Office custa 3; Planilha Infinita custa 1; Terapia custa R$ 80 e nenhuma energia; Vale-Refeição compra 1 carta; Hora Extra custa 3 e paga R$ 40; Café Duplo virou rara.' },
      { tipo: 'melhor', texto: 'O baralho inicial troca uma Tarefa Simples por uma Reunião, para já nascer com 3 de cada naipe.' },
      { tipo: 'correcao', texto: 'No celular, arrastar da borda em cima de uma carta bloqueada não abria o menu.' },
    ],
  },
  {
    versao: '0.14',
    data: '2026-10-09',
    titulo: 'Um início de verdade, amigos e conquistas',
    itens: [
      { tipo: 'novo', texto: 'Tela inicial nova: o seu avatar, um botão grande de continuar a partida (dizendo em que dia ela parou), a última partida e os atalhos — com a barra lateral desde o primeiro minuto. Entrar e criar conta ficaram na porta, em /auth.' },
      { tipo: 'novo', texto: 'Amigos: peça amizade no perfil de qualquer pessoa, aceite no seu perfil ou no início, e filtre o ranking só pelos amigos.' },
      { tipo: 'novo', texto: 'Oito conquistas, do "Sobreviveu à primeira semana" ao "Nem chegou a terça". As que faltam aparecem apagadas no seu perfil, e a partida que destrava uma avisa no recibo de fim.' },
      { tipo: 'novo', texto: 'Dá para abrir as partidas de outras pessoas e ver, dia a dia, as cartas que elas jogaram.' },
      { tipo: 'melhor', texto: 'O histórico da partida mostra as CARTAS — o evento, as jogadas numeradas na ordem e as que sobraram na mão —, e não mais só frases. O replay usa o mesmo desenho.' },
      { tipo: 'melhor', texto: 'A sexta, a recompensa e o fim da partida viraram notas fiscais; o resto dos popups, pranchetas.' },
      { tipo: 'melhor', texto: 'Sair e pedir demissão confirmam com um segundo clique, sem popup. "Reiniciar run" virou "Pedir demissão", dentro da mesa. Sair mora nas Configurações.' },
      { tipo: 'melhor', texto: 'O avatar da mesa virou um crachá no canto do tapete, grande o bastante para ver a cara mudar no celular.' },
      { tipo: 'melhor', texto: 'O avatar aparece no ranking e ao lado dos relatos.' },
      { tipo: 'melhor', texto: 'Editor do avatar: voltar, salvar, sortear e as abas ficam presos no topo; a barba ganhou cor própria; sair sem salvar avisa.' },
      { tipo: 'correcao', texto: 'O fim da partida travava a barra lateral: só dava para sair começando outra run.' },
    ],
  },
  {
    versao: '0.13',
    data: '2026-09-30',
    titulo: 'O avatar ganhou rosto, barba e humor',
    itens: [
      { tipo: 'novo', texto: 'Editor de avatar em abas, com a prévia fixa no topo e um botão de Sortear. Dez cortes de cabelo, oito olhos, cinco barbas, seis modelos de roupa, óculos e chapéu — que agora dá para usar juntos.' },
      { tipo: 'melhor', texto: 'O avatar não pergunta mais "homem ou mulher": você escolhe o formato do rosto, e o resto vem do cabelo e da barba que escolher. Quem já tinha avatar abre com o mesmo rosto e a mesma gola de antes.' },
      { tipo: 'melhor', texto: 'Todo avatar ganhou orelha e um olho novo, com brilho. Sete tons de pele em vez de três.' },
      { tipo: 'novo', texto: 'Na mesa, o seu avatar fica ao lado do nick e sente o estresse com você: olheira, suor, lágrima — e o fim da partida mostra a cara do desfecho.' },
      { tipo: 'correcao', texto: 'No fim da partida, o painel cobria o botão de Histórico. Agora o próprio painel tem "Ver o que aconteceu".' },
    ],
  },
  {
    versao: '0.12',
    data: '2026-09-16',
    titulo: 'O histórico saiu do escuro, e o que uma carta faz cabe em mais coisas',
    itens: [
      { tipo: 'novo', texto: 'Botão de Histórico na mesa, ao lado do "Como jogar": tudo o que aconteceu na run, dia por dia, com o resultado de cada dia fechado. O jogo já guardava esse histórico desde sempre e não mostrava em lugar nenhum.' },
      { tipo: 'novo', texto: 'As cartas e os eventos agora falam com você na mesa. "Segunda reunião do dia: só estresse" aparece na hora em que acontece, em vez de sumir.' },
      { tipo: 'melhor', texto: 'Carta travada explica POR QUE está travada, com a condição escrita em português, em vez de "as condições desta carta ainda não aconteceram".' },
      { tipo: 'melhor', texto: 'Efeito que continua valendo virou uma coisa só, e agora sabe durar uma semana em vez de só "para sempre" — dá para existir carta cujo bônus acaba junto com a semana.' },
      { tipo: 'melhor', texto: '"Deixar para amanhã" deixou de valer só para energia e cota: dá para adiar qualquer coisa, inclusive uma carta ou um recado.' },
      { tipo: 'novo', texto: 'Uma carta pode PERGUNTAR antes de agir, como os eventos ambíguos já faziam.' },
    ],
  },
  {
    versao: '0.11',
    data: '2026-09-11',
    titulo: 'A carta virou blocos, e o mudo passou a ser mudo de verdade',
    itens: [
      { tipo: 'novo', texto: 'O laboratório ganhou um editor visual de cartas: o que uma carta faz agora se monta em blocos empilhados, com menu de ações, setas para reordenar e listas dentro de listas para sorteio e escolha. Antes era preciso escrever JSON à mão.' },
      { tipo: 'melhor', texto: 'O JSON continua ali, recolhido, para conferir o resultado ou colar uma carta inteira de fora — deixou de ser o único caminho, não de existir.' },
      { tipo: 'correcao', texto: 'Mudo agora PARA a música em vez de abaixá-la a zero. Tocando em silêncio, o site tomava o controle de som do aparelho e pausava o YouTube ou o Spotify que estivesse tocando — no mudo o som é seu.' },
      { tipo: 'correcao', texto: 'Abrindo o site no mudo, os 3,7 MB da trilha nem são baixados.' },
      { tipo: 'correcao', texto: 'Os popups do laboratório ficavam mais largos que a tela do celular. Agora cabem, e o que não couber (a fileira de classes, a tabela das semanas) rola de lado sozinho.' },
    ],
  },
  {
    versao: '0.10',
    data: '2026-09-11',
    titulo: 'As cartas saíram do código, e o descarte ficou visível',
    itens: [
      { tipo: 'novo', texto: 'As regras do jogo — aluguel, cota, meta da semana, salário, energia base — também foram para o banco, como modo de jogo. Hoje existe só o Normal. Um ajuste de dificuldade passa a valer na próxima partida que alguém começar, sem esperar versão nova do site.' },
      { tipo: 'melhor', texto: 'Quem já está no meio de uma partida não é afetado por mudança de regra: cada partida guarda as regras com que começou e termina com elas. O replay de uma partida antiga mostra o aluguel que ela pagou, e não o de hoje.' },
      { tipo: 'melhor', texto: '"Desbloquear tudo" e "Resetar" saíram do Baralho. Eles existem para teste e continuam no laboratório, que é o lugar deles.' },
      { tipo: 'novo', texto: 'As cartas e os eventos agora moram no banco. Um ajuste de balanceamento passa a valer na próxima vez que você abrir o site, sem esperar uma versão nova do jogo.' },
      { tipo: 'novo', texto: 'Carta sem tipo. Ela não é bloqueada por evento nenhum, e em troca não entra em embalo: jogar uma quebra a sequência que estiver em pé.' },
      { tipo: 'novo', texto: 'Reorganizar a Mesa: descarte 1 carta à SUA escolha e compre 1. É a primeira carta que pergunta antes de agir — e a primeira sem tipo.' },
      { tipo: 'novo', texto: 'Limpeza de Mesa: um evento que manda descartar 2 cartas, e deixa você escolher quais.' },
      { tipo: 'melhor', texto: 'Descarte visível. Quando uma carta ou um evento tira algo da sua mão, a carta aparece no meio da mesa com o motivo antes de ir para o descarte — antes a mão só encolhia e você não sabia o que tinha perdido.' },
      { tipo: 'melhor', texto: 'Nenhuma carta é apagada de verdade. Carta removida sai dos baralhos novos, mas quem estiver no meio de uma partida com ela na mão termina normalmente, e o replay continua sabendo o que ela era.' },
      { tipo: 'melhor', texto: 'O histórico de cada carta agora nasce junto com a mudança: não dá para ajustar uma carta sem escrever por que — e é esse texto que aparece para você no baralho.' },
      { tipo: 'correcao', texto: 'O aviso de por que uma carta não pode ser jogada parou de citar o Puxar o Saco pelo nome: ele lê a restrição da carta, então continua certo se a carta mudar.' },
    ],
  },
  {
    versao: '0.9',
    data: '2026-09-11',
    titulo: 'As cartas viraram dado, e as partidas antigas ficaram intactas',
    itens: [
      { tipo: 'melhor', texto: 'Toda carta agora diz o que faz numa lista de ações que o jogo lê — inclusive as cinco que tinham regra escrita no motor (Reunião, Foco Total, Puxar o Saco, Automatizar e Pedir Aumento). Na prática: dá para ajustar qualquer carta sem mexer no código do jogo, e carta nova nasce só de dado.' },
      { tipo: 'melhor', texto: 'Os 20 eventos seguiram o mesmo caminho. O motor não conhece mais o nome de carta nenhuma.' },
      { tipo: 'novo', texto: 'Cada partida guarda o retrato do baralho que você usou: nome, custo e texto das cartas como eram naquele dia. Quando o balanceamento começar, o replay de uma partida antiga continua mostrando a carta que você jogou, e não a de hoje.' },
      { tipo: 'novo', texto: 'No baralho, cada carta tem um atalho de histórico: o que já mudou nela, quando, e por quê. Está vazio hoje porque o baralho ainda está na v1 — nenhuma carta mudou desde que o jogo existe.' },
      { tipo: 'novo', texto: 'O baralho passou a ter versão, visível no topo da página. Ela sobe a cada ajuste de carta e fica gravada na partida.' },
      { tipo: 'melhor', texto: 'O laboratório de cartas agora edita a carta inteira, condição e sorteio inclusive — antes ele parava nas cinco especiais.' },
      { tipo: 'correcao', texto: 'Uma partida que cite uma carta removida no futuro não derruba mais a página do replay.' },
    ],
  },
  {
    versao: '0.8',
    data: '2026-09-11',
    titulo: 'Menu enxuto, perfis públicos e a oficina',
    itens: [
      { tipo: 'novo', texto: 'Dá para abrir o perfil de qualquer pessoa clicando no nick do ranking: avatar, placar e partidas. Nome e e-mail continuam sendo só de quem é dono.' },
      { tipo: 'novo', texto: 'Suas partidas e sua posição no ranking agora ficam no seu perfil.' },
      { tipo: 'novo', texto: 'Novidades, Feedbacks e Análise viraram abas de uma página só: Comunidade.' },
      { tipo: 'novo', texto: 'A música toca no site inteiro, baixinha fora do jogo — e dá para desligar essa parte nas configurações.' },
      { tipo: 'novo', texto: 'Esqueci a senha agora leva a uma página que troca a senha de verdade.' },
      { tipo: 'melhor', texto: '"Como jogar" saiu do menu e foi para a mesa, no canto oposto ao "Próximo dia".' },
      { tipo: 'melhor', texto: 'Os termos de uso abrem num popup, sem fazer você perder o cadastro pela metade.' },
      { tipo: 'melhor', texto: 'Entrar com um e-mail que não tem conta leva direto para o cadastro, já preenchido.' },
      { tipo: 'melhor', texto: 'O cadastro parou de perguntar gênero: quem não escolheu avatar é o manequim, e escolher leva dez segundos no perfil.' },
      { tipo: 'melhor', texto: 'Na entrada, no computador, o título ficou à esquerda e o que se faz à direita.' },
    ],
  },
  {
    versao: '0.7',
    data: '2026-09-11',
    titulo: 'Avatares',
    itens: [
      { tipo: 'novo', texto: 'Avatar no perfil: corpo, cabelo, tom de pele, cor do cabelo, cor da roupa e cor do fundo — 1500 combinações.' },
      { tipo: 'novo', texto: 'Página própria para editar o avatar, com cada opção já desenhada em vez de escrita.' },
      { tipo: 'novo', texto: 'Quem ainda não escolheu aparece como um manequim de madeira — inclusive quem joga como convidado.' },
      { tipo: 'novo', texto: 'O cadastro pergunta o gênero e já entrega um avatar sorteado a partir dele.' },
      { tipo: 'novo', texto: 'Avisos agora têm duas abas: novos e todos.' },
      { tipo: 'melhor', texto: 'As escolhas de poucas opções (tema, abas) ganharam um fundo que desliza de uma para a outra.' },
    ],
  },
  {
    versao: '0.6',
    data: '2026-09-11',
    titulo: 'Tema, controles desenhados e a dica que não fechava',
    itens: [
      { tipo: 'novo', texto: 'Tema claro, escuro ou o do aparelho, em Configurações.' },
      { tipo: 'novo', texto: 'Sair direto pela barra lateral, com confirmação.' },
      { tipo: 'melhor', texto: 'Os controles de volume viraram sliders desenhados, com botões de − e +; as caixas de marcar também são nossas agora.' },
      { tipo: 'correcao', texto: 'No celular, a dica dos medidores (energia, estresse…) não fechava mais depois do primeiro toque.' },
      { tipo: 'correcao', texto: 'Essa mesma dica era cortada quando o medidor ficava perto da borda da tela.' },
      { tipo: 'correcao', texto: 'Os campos de cadastro abriam com 200px de altura cada um.' },
    ],
  },
  {
    versao: '0.5',
    data: '2026-09-11',
    titulo: 'Tutorial ilustrado e feedback mais claro',
    itens: [
      { tipo: 'melhor', texto: '"Como jogar" agora mostra as cartas de verdade, os ícones e as cores dos recursos, em vez de só texto.' },
      { tipo: 'melhor', texto: 'O botão do tutorial ficou destacado na entrada, e a home ganhou atalhos para perfil, ranking, feedbacks e novidades.' },
      { tipo: 'melhor', texto: 'Bug agora tem gravidade (de "cosmético" a "quebra o jogo") e sugestão tem prioridade (de "algum dia" a "entra já") — cada um na sua língua.' },
      { tipo: 'melhor', texto: 'Relato comentado pelo admin sai sozinho de "novo" para "na fila": responder já é ter lido.' },
      { tipo: 'correcao', texto: 'Os controles de admin não apareciam quando o perfil guardado no navegador estava desatualizado; agora quem responde é o banco.' },
      { tipo: 'correcao', texto: 'Campos de texto altos demais em todo o site.' },
    ],
  },
  {
    versao: '0.4',
    data: '2026-09-11',
    titulo: 'Contas, feedbacks e tutorial',
    itens: [
      { tipo: 'novo', texto: 'Conta de verdade: e-mail e senha ou Google, com nick e termos de uso.' },
      { tipo: 'novo', texto: 'Modo convidado — dá para jogar sem conta, avisando que o progresso não sai deste navegador.' },
      { tipo: 'novo', texto: 'Página de feedbacks: relate bug, sugira ideia e acompanhe o que foi feito com o seu relato.' },
      { tipo: 'novo', texto: 'Antes de enviar, o sistema procura relato parecido e mostra o que achou.' },
      { tipo: 'novo', texto: 'Popup "Como jogar", com as regras, na entrada e na mesa.' },
      { tipo: 'novo', texto: 'Esta página de novidades.' },
      { tipo: 'melhor', texto: 'Todo popup agora fecha ao clicar fora, fecha no Esc e trava a página atrás.' },
      { tipo: 'correcao', texto: 'A janela de configurações não muda mais de largura quando o volume chega a 100%.' },
    ],
  },
  {
    versao: '0.3',
    data: '2026-09-11',
    titulo: 'Som e telemetria que não some',
    itens: [
      { tipo: 'novo', texto: 'Música de fundo na mesa, com volume geral, volume da música e botão de mudo.' },
      { tipo: 'novo', texto: 'Página de perfil.' },
      { tipo: 'correcao', texto: 'Partida terminada que o banco recusava sumia em silêncio; agora ela é registrada, o motivo aparece na tela e o que falhar sobe sozinho depois.' },
      { tipo: 'correcao', texto: 'Os controles de volume não mexiam em nada no iPhone (o iOS não deixa mudar o volume do áudio por código).' },
    ],
  },
  {
    versao: '0.2',
    data: '2026-09-10',
    titulo: 'Histórico, ranking e análise',
    itens: [
      { tipo: 'novo', texto: 'Ranking público com as vitórias e derrotas de todo mundo.' },
      { tipo: 'novo', texto: '"Meus jogos", com o replay dia a dia de cada partida terminada.' },
      { tipo: 'novo', texto: 'Página de análise com as estatísticas de todas as partidas — inclusive a carta que mais mata.' },
      { tipo: 'novo', texto: 'Ícone e modo aplicativo ao instalar o jogo na tela de início do celular.' },
      { tipo: 'melhor', texto: 'Ranking legível no celular e campo de nick que não dá mais zoom no iPhone.' },
      { tipo: 'melhor', texto: 'Reiniciar run saiu da mesa e foi para o menu, com confirmação e a opção de guardar a partida.' },
    ],
  },
  {
    versao: '0.1',
    data: '2026-09-10',
    titulo: 'O jogo, jogável',
    itens: [
      { tipo: 'novo', texto: '20 dias, 4 semanas, 20 cartas de ação e 20 de evento; as três derrotas e a vitória funcionando.' },
      { tipo: 'novo', texto: 'Mesa em tela cheia, mão em leque, carta em 3D com verso e arraste para jogar.' },
      { tipo: 'novo', texto: 'Embalo: cartas seguidas da mesma classe rendem bônus crescente.' },
      { tipo: 'novo', texto: 'Sexta-feira em três passos: salário, contas e fim de semana.' },
      { tipo: 'novo', texto: 'Save no Supabase, barra lateral recolhível e site publicado no GitHub Pages.' },
    ],
  },
]
