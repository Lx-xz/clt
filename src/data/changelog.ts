/**
 * O histórico do jogo, escrito à mão a partir dos commits. Não sai do git em
 * tempo de execução de propósito: o site é estático e não tem servidor para
 * consultar o GitHub, e além disso "Corrige a nota de deploy no README" não
 * interessa a ninguém que joga.
 *
 * **Aqui entra só o que quem JOGA percebe** (v0.23). O que é de bastidor —
 * o banco, o lab, a forma como a carta é guardada, o editor de cartas — fica
 * no git e no CLAUDE.md. Cada item é uma frase que um jogador entende sem
 * contexto; o que foi desfeito depois (o cadastro que perguntava gênero, o
 * Sair na barra lateral) sai da lista em vez de ficar contando uma coisa que
 * não existe mais.
 *
 * Ao entregar coisa nova, acrescente a versão no TOPO e mova para cá o que
 * saiu de `EM_ANDAMENTO`. Quando a mudança é de cara, ponha a foto de antes
 * e a de agora em `imagens` (os arquivos moram em `novidades/` aqui do lado,
 * em WebP, e são importados: assim o endereço já sai com o `/clt` do
 * GitHub Pages, que o `src` escrito à mão não ganharia).
 */

import type { StaticImageData } from 'next/image'
import mesaAntes from './novidades/mesa-antes.webp'
import mesaDepois from './novidades/mesa-depois.webp'
import inicioAntes from './novidades/inicio-antes.webp'
import inicioDepois from './novidades/inicio-depois.webp'
import rankingAntes from './novidades/ranking-antes.webp'
import rankingDepois from './novidades/ranking-depois.webp'
import avatarAntes from './novidades/avatar-antes.webp'
import avatarDepois from './novidades/avatar-depois.webp'
import recompensasAntes from './novidades/recompensas-antes.webp'
import recompensasDepois from './novidades/recompensas-depois.webp'
import inicioHeroAntes from './novidades/inicio-hero-antes.webp'
import inicioHeroDepois from './novidades/inicio-hero-depois.webp'

/** Uma foto de antes e uma de agora, da mesma coisa. */
export interface AntesEDepois {
  legenda: string
  antes: StaticImageData
  /** De quando é a foto de antes, para quem lê se situar. */
  antesDe: string
  depois: StaticImageData
}

export interface Versao {
  versao: string
  data: string
  titulo: string
  itens: { tipo: 'novo' | 'melhor' | 'correcao'; texto: string }[]
  imagens?: AntesEDepois[]
}

export const ROTULO_TIPO: Record<Versao['itens'][number]['tipo'], string> = {
  novo: 'Novo',
  melhor: 'Melhor',
  correcao: 'Corrigido',
}

/** O que está sendo feito agora, ou logo depois. Sem data, de propósito. */
export const EM_ANDAMENTO: string[] = [
  'Rebalancear: hoje quase toda partida acaba em burnout ainda na primeira semana — o jogo está mais duro do que deveria.',
  'A máquina de vendas: três cartas e três itens por dia, comprados com tokens.',
  'Mais peças para o avatar, e fundos de mesa para escolher onde jogar.',
  'Efeitos sonoros: um som por carta jogada, cota batida, advertência, vitória e derrota.',
  'Uma recompensa para quem manda bom feedback.',
  'Um aviso fora do site (e-mail ou no celular) quando o seu relato mudar de estado.',
  'As cartas voando do baralho para a mão.',
]

export const VERSOES: Versao[] = [
  {
    versao: '0.29',
    data: '2026-10-12',
    titulo: 'Halloween e os tokens',
    itens: [
      { tipo: 'novo', texto: 'Coleção de Halloween para o avatar: chapéu de bruxa, cílios longos, olho de gato, de réptil, todo colorido e todo preto, e as cores abóbora e noite. As peças dela levam uma abóbora no canto.' },
      { tipo: 'novo', texto: 'Tokens: a carta que passa do limite de cópias e o item que você já tem não somem mais — viram tokens na abertura, conforme a raridade, e a soma aparece no fim.' },
      { tipo: 'melhor', texto: 'As recompensas sorteiam entre todas as cartas, e não só entre as que faltam: completar a coleção ficou mais demorado, e as repetidas viram tokens.' },
      { tipo: 'melhor', texto: 'No editor, dá para tocar numa peça que ainda não é sua e ver como fica no avatar. Salvar com ela é que não dá.' },
    ],
  },
  {
    versao: '0.27',
    data: '2026-10-12',
    titulo: 'A cor dos olhos',
    itens: [
      { tipo: 'novo', texto: 'No editor do avatar, na aba da expressão: a cor dos olhos, em sete tons.' },
      { tipo: 'novo', texto: 'Íris para colecionar: olho de gato, de réptil, todo colorido e todo preto. Saem de recompensa, como os óculos de sol, e valem com qualquer expressão.' },
    ],
  },
  {
    versao: '0.26',
    data: '2026-10-12',
    titulo: 'O avatar respira',
    itens: [
      { tipo: 'melhor', texto: 'Na capa do início e do perfil, e no crachá da mesa, o avatar respira, pisca de vez em quando e olha para os lados. Bem de leve; quem pede menos movimento no aparelho o vê parado.' },
    ],
  },
  {
    versao: '0.25',
    data: '2026-10-11',
    titulo: 'O início com a sua cara',
    itens: [
      { tipo: 'melhor', texto: 'O início abre com o seu avatar grande, de ponta a ponta da tela, como no perfil. Com uma partida em andamento, a cara dele já mostra o estresse em que você parou.' },
      { tipo: 'melhor', texto: 'A barra lateral ficou mais larga, com os ícones e os nomes maiores.' },
      { tipo: 'melhor', texto: 'O que vem numa recompensa ficou mais curto: quantas cartas, se pode vir item para o avatar, e a chance de cada raridade numa barra só.' },
    ],
    imagens: [{ legenda: 'O início', antes: inicioHeroAntes, antesDe: 'v0.24', depois: inicioHeroDepois }],
  },
  {
    versao: '0.24',
    data: '2026-10-11',
    titulo: 'Sete dias seguidos',
    itens: [
      { tipo: 'novo', texto: 'Missão nova: termine uma partida por dia, sete dias sem falhar, e ganhe um cofre. Os dias aparecem no início, um tijolo por dia; se um dia ficar sem partida, a conta recomeça.' },
      { tipo: 'novo', texto: 'Itens para o avatar dentro das recompensas: a maleta tem chance de trazer um, e o cofre traz um garantido (às vezes dois). Só vem peça que você ainda não tem, e ela sobe na abertura já vestida no seu avatar.' },
      { tipo: 'melhor', texto: 'A quantidade de cartas também é sorteada: o envelope traz de 1 a 3, o pacote de 3 a 5, a maleta de 5 a 7 e o cofre de 7 a 9. Pode vir uma carta só, e épica, ou três comuns.' },
    ],
  },
  {
    versao: '0.23',
    data: '2026-10-11',
    titulo: 'Envelope, pacote, maleta e cofre',
    itens: [
      { tipo: 'novo', texto: 'As recompensas viraram objetos, e o tamanho diz o valor: o envelope (3 cartas) vem de toda partida, o pacote (5) da primeira partida do dia e a maleta (7) da primeira vitória. O cofre (10) já existe e espera a missão que vai dá-lo.' },
      { tipo: 'novo', texto: 'Cada um abre do seu jeito: a aba do envelope vira e a cera racha, as abas do pacote caem para os lados, a maleta abre pelo meio, e o cofre gira o segredo antes de abrir a porta. As cartas saem de dentro.' },
      { tipo: 'correcao', texto: 'Sair da conta podia mostrar uma tela cheia de texto técnico no lugar do site.' },
    ],
    imagens: [{ legenda: 'As recompensas para abrir, no início', antes: recompensasAntes, antesDe: 'v0.21', depois: recompensasDepois }],
  },
  {
    versao: '0.22',
    data: '2026-10-10',
    titulo: 'Abertura mais limpa',
    itens: [
      { tipo: 'melhor', texto: 'Ao abrir uma recompensa, a raridade (e o "nova") aparece embaixo da carta, em vez de uma etiqueta escura por cima dela.' },
      { tipo: 'correcao', texto: 'A carta que sobe ainda virada mostrava o custo e o tipo nas costas, espelhados.' },
      { tipo: 'correcao', texto: 'Os raios das cartas épicas e lendárias tinham dois feixes colados em cima.' },
    ],
  },
  {
    versao: '0.21',
    data: '2026-10-10',
    titulo: 'Compartilhar o recibo',
    itens: [
      { tipo: 'novo', texto: 'O recibo de fim e o replay têm um botão de compartilhar: no celular, ele abre a janela de compartilhar do aparelho (WhatsApp e companhia) com a imagem do recibo, uma frase e o link do jogo. No computador, baixa a imagem e copia a frase.' },
      { tipo: 'melhor', texto: 'A carta que não dá para jogar fica mais escura, em vez de transparente: as cartas de trás do leque não aparecem mais através dela.' },
    ],
  },
  {
    versao: '0.20',
    data: '2026-10-10',
    titulo: 'Recibos',
    itens: [
      { tipo: 'novo', texto: 'Recompensa melhor dá mais cartas: 3 na de toda partida, 5 na da primeira partida do dia e 7 na da primeira vitória.' },
      { tipo: 'novo', texto: 'O recibo de fim mostra o que a partida deu: fechado, é só tocar para abrir; aberto, com as cartas que vieram ao lado. O replay de uma partida começa pelo recibo dela.' },
      { tipo: 'novo', texto: 'Todas as suas partidas numa página de recibos, com filtro (vitórias, derrotas, pediu demissão) e ordem (mais recentes, mais dinheiro, mais dias). No perfil, a última partida aparece como recibo.' },
      { tipo: 'novo', texto: 'Cinco eventos que mexem nos custos: Black Friday e Inflação (as cartas pagas em dinheiro ficam mais baratas ou mais caras), Chefe de Folga e Pressão por Resultado (o estresse que as cartas cobram cai ou sobe) e Dia de Entrega.' },
      { tipo: 'novo', texto: 'O baralho tem busca, filtro por naipe e por raridade, e ordem por custo, nome, raridade ou naipe.' },
      { tipo: 'melhor', texto: 'Quando um evento encarece ou barateia uma carta, o carimbo do custo ganha uma seta para cima ou para baixo.' },
      { tipo: 'correcao', texto: 'No modo escuro, o fundo atrás dos popups clareava a tela em vez de escurecer.' },
      { tipo: 'correcao', texto: 'Apertar Esc para pular a abertura fechava também o recibo atrás dela.' },
    ],
  },
  {
    versao: '0.19',
    data: '2026-10-10',
    titulo: 'Abrir envelope virou um momento',
    itens: [
      { tipo: 'novo', texto: 'Abrir a recompensa ocupa a tela: ela vem para a frente, abre, e cada carta sobe de dentro, virada, e desvira com o brilho da raridade. No fim, todas as que vieram.' },
      { tipo: 'novo', texto: 'As primeiras cartas lendárias (Automatizar e Pedir Aumento) e épicas (Café com o Chefe, Investimento, Grito no Travesseiro, Virar a Noite e Plantão).' },
      { tipo: 'melhor', texto: 'O início ficou limpo: o seu avatar, o botão de jogar e as missões do dia, cada uma com a barra de progresso e a recompensa que ela dá. Toque na recompensa para ver as chances.' },
    ],
    imagens: [{ legenda: 'O início', antes: inicioAntes, antesDe: 'v0.14', depois: inicioDepois }],
  },
  {
    versao: '0.18',
    data: '2026-10-10',
    titulo: 'O estresse como combustível',
    itens: [
      { tipo: 'novo', texto: 'A raridade tem cor: a borda da carta e o quadrado do tipo ficam azuis na incomum, verdes na rara, roxos na épica e dourados na lendária. A comum continua sem cor.' },
      { tipo: 'novo', texto: 'Duas raridades novas, épica e lendária, com uma cópia só de cada carta na coleção.' },
      { tipo: 'novo', texto: 'Três cartas que só saem com o estresse alto e o gastam ao jogar: Canalizar a Raiva, Desabafo no Café e Grito no Travesseiro. Quanto pior o dia, mais forte a mão.' },
      { tipo: 'novo', texto: 'Doze cartas novas, várias pagas em estresse ou em produtividade: Raiva, Virar a Noite, Respirar Fundo, Pedir Desculpas, Café Expresso, Terceirizar, Engolir Sapo, Reunião que Podia Ser E-mail, Faxina na Caixa de Entrada, Meditação no Banheiro, Plantão e Deixar pra Amanhã.' },
    ],
  },
  {
    versao: '0.17',
    data: '2026-10-10',
    titulo: 'Custos de qualquer recurso',
    itens: [
      { tipo: 'novo', texto: 'Uma carta pode custar mais do que energia: dinheiro, estresse ou produtividade, cada um com o seu carimbo, na cor do medidor. Tudo é pago antes do efeito; sem dinheiro ou produtividade suficiente, a carta não sai da mão.' },
      { tipo: 'melhor', texto: 'O dinheiro do jogo deixou de ser "real": em todo lugar ele é o ícone da cédula e o número, como no medidor.' },
      { tipo: 'melhor', texto: 'O custo de energia ganhou o ícone do raio. A carta que não custa nada não mostra carimbo nenhum.' },
    ],
  },
  {
    versao: '0.16',
    data: '2026-10-10',
    titulo: 'Missões diárias',
    itens: [
      { tipo: 'novo', texto: 'Missões diárias: terminar uma partida e vencer uma partida dão recompensa. Elas renovam à meia-noite e aparecem no início e no recibo de fim.' },
      { tipo: 'novo', texto: 'Carta nova agora vem de recompensa, direto para a coleção. A escolha de carta no fim da partida saiu.' },
      { tipo: 'melhor', texto: 'As notas fiscais (a sexta-feira e o fim da partida) sobem de baixo da tela, como papel saindo da maquininha.' },
      { tipo: 'correcao', texto: 'A conquista Colecionador não contava as cartas repetidas da coleção.' },
    ],
  },
  {
    versao: '0.15',
    data: '2026-10-09',
    titulo: 'A coleção ganhou cópias',
    itens: [
      { tipo: 'novo', texto: 'A coleção conta cópias: até 4 de uma carta comum, 3 de uma incomum e 2 de uma rara, e você escolhe quantas vão para o baralho.' },
      { tipo: 'novo', texto: 'Até três baralhos com nome, um equipado.' },
      { tipo: 'novo', texto: 'O baralho tem limites: de 15 a 25 cartas, com pelo menos 3 de cada naipe (tarefa, descanso, grana e social). A contagem fica sempre à vista, e a mesa diz o que falta em vez de começar.' },
      { tipo: 'novo', texto: 'As cartas têm raridade: comum, incomum e rara.' },
      { tipo: 'novo', texto: 'Doze cartas novas: Delivery, Academia no Almoço, Uber pra Casa, Checklist, Prazo Apertado, Café com o Chefe, Mentoria, Happy Hour, Vender as Férias, Investimento, Bico de Fim de Semana e Pausa Estratégica.' },
      { tipo: 'melhor', texto: 'Clique duplo ou arrastar para a outra coluna move uma cópia só. O clique abre a carta, com o seletor de cópias e o histórico dela.' },
      { tipo: 'melhor', texto: 'Ajustes: Atalho no Sistema dá +1 estresse; Home Office custa 3; Planilha Infinita custa 1; Terapia custa R$ 80 e nenhuma energia; Vale-Refeição compra 1 carta; Hora Extra custa 3 e paga R$ 40; Café Duplo virou rara.' },
      { tipo: 'melhor', texto: 'O baralho inicial troca uma Tarefa Simples por uma Reunião, para já nascer com 3 de cada naipe.' },
    ],
  },
  {
    versao: '0.14',
    data: '2026-10-09',
    titulo: 'Amigos e conquistas',
    itens: [
      { tipo: 'novo', texto: 'Amigos: peça amizade no perfil de qualquer pessoa, aceite no seu, e filtre o ranking só pelos amigos.' },
      { tipo: 'novo', texto: 'Oito conquistas, do "Sobreviveu à primeira semana" ao "Nem chegou a terça". As que faltam aparecem apagadas no seu perfil, e a partida que destrava uma avisa no recibo de fim.' },
      { tipo: 'novo', texto: 'Dá para abrir as partidas de outras pessoas e ver, dia a dia, as cartas que elas jogaram.' },
      { tipo: 'melhor', texto: 'O histórico da partida mostra as cartas — o evento, as jogadas numeradas na ordem e as que sobraram na mão —, e não mais só frases.' },
      { tipo: 'melhor', texto: '"Reiniciar run" virou "Pedir demissão", dentro da mesa, e confirma com um segundo clique.' },
      { tipo: 'melhor', texto: 'O seu avatar virou um crachá no canto da mesa, grande o bastante para ver a cara mudar com o estresse.' },
      { tipo: 'correcao', texto: 'O fim da partida travava a barra lateral: só dava para sair começando outra.' },
    ],
  },
  {
    versao: '0.13',
    data: '2026-09-30',
    titulo: 'O avatar ganhou rosto, barba e humor',
    itens: [
      { tipo: 'novo', texto: 'Editor de avatar em abas, com um botão de Sortear: cortes de cabelo, expressões, barbas, roupas, óculos e chapéu.' },
      { tipo: 'melhor', texto: 'O avatar não pergunta mais "homem ou mulher": você escolhe o formato do rosto, e o resto vem do cabelo e da barba. Sete tons de pele em vez de três.' },
      { tipo: 'novo', texto: 'Na mesa, o seu avatar sente o estresse com você: olheira, suor, lágrima — e o fim da partida mostra a cara do desfecho.' },
    ],
    imagens: [{ legenda: 'O editor do avatar', antes: avatarAntes, antesDe: 'v0.7', depois: avatarDepois }],
  },
  {
    versao: '0.12',
    data: '2026-09-16',
    titulo: 'O histórico da partida',
    itens: [
      { tipo: 'novo', texto: 'Botão de Histórico na mesa: tudo o que aconteceu na partida, dia por dia.' },
      { tipo: 'novo', texto: 'As cartas e os eventos falam com você na mesa: "Segunda reunião do dia: só estresse" aparece na hora em que acontece.' },
      { tipo: 'melhor', texto: 'Carta travada explica por que está travada, com a condição escrita em português.' },
      { tipo: 'novo', texto: 'Uma carta pode perguntar antes de agir, como os eventos ambíguos já faziam.' },
    ],
  },
  {
    versao: '0.11',
    data: '2026-09-11',
    titulo: 'O mudo ficou mudo de verdade',
    itens: [
      { tipo: 'correcao', texto: 'No mudo, o jogo pausava o YouTube ou o Spotify que estivesse tocando no celular. Agora a música para de verdade, e o som do aparelho é seu.' },
      { tipo: 'correcao', texto: 'Abrindo o site no mudo, a música nem é baixada.' },
    ],
  },
  {
    versao: '0.10',
    data: '2026-09-11',
    titulo: 'Descarte visível',
    itens: [
      { tipo: 'melhor', texto: 'Quando uma carta ou um evento tira algo da sua mão, a carta aparece no meio da mesa com o motivo antes de ir para o descarte — antes a mão só encolhia.' },
      { tipo: 'novo', texto: 'Carta sem tipo: nenhum evento a bloqueia, e em troca ela não entra em embalo — jogar uma quebra a sequência.' },
      { tipo: 'novo', texto: 'Reorganizar a Mesa: descarte 1 carta à sua escolha e compre 1. E Limpeza de Mesa, um evento que manda descartar 2 e deixa você escolher quais.' },
      { tipo: 'melhor', texto: 'Ajustes de balanceamento passam a valer sem atualizar o site, e a partida em andamento termina com as regras com que começou.' },
    ],
  },
  {
    versao: '0.9',
    data: '2026-09-11',
    titulo: 'As partidas antigas ficam intactas',
    itens: [
      { tipo: 'novo', texto: 'Cada partida guarda o baralho como ele era naquele dia: quando uma carta mudar, o replay continua mostrando a carta que você jogou.' },
      { tipo: 'novo', texto: 'No baralho, cada carta tem o seu histórico: o que já mudou nela, quando, e por quê.' },
    ],
  },
  {
    versao: '0.8',
    data: '2026-09-11',
    titulo: 'Perfis públicos e a Comunidade',
    itens: [
      { tipo: 'novo', texto: 'Dá para abrir o perfil de qualquer pessoa pelo ranking: avatar, placar e partidas. Nome e e-mail continuam sendo só seus.' },
      { tipo: 'novo', texto: 'Novidades, Feedbacks e Análise viraram abas de uma página só: Comunidade.' },
      { tipo: 'novo', texto: 'A música toca no site inteiro, baixinha fora do jogo — e dá para desligar essa parte nas configurações.' },
      { tipo: 'novo', texto: 'Esqueci a senha leva a uma página que troca a senha de verdade.' },
      { tipo: 'melhor', texto: '"Como jogar" foi para a mesa, no canto oposto ao "Próximo dia", onde a dúvida aparece.' },
      { tipo: 'melhor', texto: 'O cadastro não pergunta mais o gênero: quem não escolheu avatar aparece como o manequim.' },
    ],
  },
  {
    versao: '0.7',
    data: '2026-09-11',
    titulo: 'Avatares',
    itens: [
      { tipo: 'novo', texto: 'Avatar no perfil, com página própria para editar e cada opção já desenhada.' },
      { tipo: 'novo', texto: 'Quem ainda não escolheu aparece como um manequim de madeira — inclusive quem joga como convidado.' },
      { tipo: 'novo', texto: 'Os avisos têm duas abas: novos e todos.' },
    ],
  },
  {
    versao: '0.6',
    data: '2026-09-11',
    titulo: 'Tema escuro',
    itens: [
      { tipo: 'novo', texto: 'Tema claro, escuro ou o do aparelho, nas Configurações.' },
      { tipo: 'melhor', texto: 'Os controles de volume viraram sliders com botões de − e +, fáceis de acertar no celular.' },
      { tipo: 'correcao', texto: 'No celular, a dica dos medidores (energia, estresse…) não fechava depois do primeiro toque, e era cortada perto da borda da tela.' },
    ],
  },
  {
    versao: '0.5',
    data: '2026-09-11',
    titulo: 'Tutorial ilustrado',
    itens: [
      { tipo: 'melhor', texto: '"Como jogar" mostra as cartas de verdade, os ícones e as cores dos recursos, em vez de só texto.' },
      { tipo: 'melhor', texto: 'Bug tem gravidade (de "cosmético" a "quebra o jogo") e sugestão tem prioridade (de "algum dia" a "entra já").' },
    ],
  },
  {
    versao: '0.4',
    data: '2026-09-11',
    titulo: 'Contas e feedbacks',
    itens: [
      { tipo: 'novo', texto: 'Conta de verdade: e-mail e senha ou Google.' },
      { tipo: 'novo', texto: 'Modo convidado: dá para jogar sem conta, com o progresso guardado só neste navegador.' },
      { tipo: 'novo', texto: 'Página de feedbacks: relate um bug, sugira uma ideia e acompanhe o que foi feito com o seu relato. Antes de enviar, ela mostra relatos parecidos.' },
      { tipo: 'novo', texto: '"Como jogar", com as regras, e esta página de novidades.' },
      { tipo: 'melhor', texto: 'Todo popup fecha ao clicar fora e no Esc.' },
    ],
  },
  {
    versao: '0.3',
    data: '2026-09-11',
    titulo: 'Música',
    itens: [
      { tipo: 'novo', texto: 'Música de fundo na mesa, com volume e mudo.' },
      { tipo: 'novo', texto: 'Página de perfil.' },
      { tipo: 'correcao', texto: 'Uma partida terminada podia não ser salva sem aviso nenhum; agora ela sobe sozinha depois, e o motivo aparece na tela.' },
      { tipo: 'correcao', texto: 'O volume não mudava nada no iPhone.' },
    ],
  },
  {
    versao: '0.2',
    data: '2026-09-10',
    titulo: 'Ranking',
    itens: [
      { tipo: 'novo', texto: 'Ranking público com as vitórias e derrotas de todo mundo.' },
      { tipo: 'novo', texto: 'As suas partidas, com o replay dia a dia de cada uma.' },
      { tipo: 'novo', texto: 'Análise, com as estatísticas de todas as partidas — inclusive a carta que mais mata.' },
      { tipo: 'novo', texto: 'Dá para instalar o jogo na tela de início do celular, com ícone e cara de aplicativo.' },
    ],
    imagens: [{ legenda: 'O ranking', antes: rankingAntes, antesDe: 'v0.2', depois: rankingDepois }],
  },
  {
    versao: '0.1',
    data: '2026-09-10',
    titulo: 'O jogo, jogável',
    itens: [
      { tipo: 'novo', texto: '20 dias, 4 semanas, as três derrotas e a vitória.' },
      { tipo: 'novo', texto: 'Mesa em tela cheia, mão em leque, carta com verso e arraste para jogar.' },
      { tipo: 'novo', texto: 'Embalo: cartas seguidas da mesma classe rendem bônus crescente.' },
      { tipo: 'novo', texto: 'Sexta-feira em três passos: salário, contas e fim de semana.' },
    ],
    imagens: [{ legenda: 'A mesa', antes: mesaAntes, antesDe: 'v0.1', depois: mesaDepois }],
  },
]
