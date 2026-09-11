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
  'Efeitos sonoros: um som por carta jogada, cota batida, advertência, vitória e derrota.',
  'Mais peças de avatar (óculos, barba) e o avatar aparecendo também no ranking e nos feedbacks.',
  'Recompensa para quem manda bom feedback — a nota que o admin dá já está virando pontos.',
  'Notificação de verdade (e-mail ou aviso no aparelho) quando o seu relato mudar de estado.',
  'Rebalancear o jogo depois do Embalo, em especial as cartas de grana.',
  'Deixar clonar o repositório e jogar sem configurar banco nenhum.',
  'Animação das cartas voando do baralho para a mão, como no protótipo.',
]

export const VERSOES: Versao[] = [
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
