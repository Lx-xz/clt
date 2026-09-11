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
  'Recompensa para quem manda bom feedback — a nota que o admin dá já está virando pontos.',
  'Notificação de verdade (e-mail ou aviso no aparelho) quando o seu relato mudar de estado.',
  'Rebalancear o jogo depois do Embalo, em especial as cartas de grana.',
  'Deixar clonar o repositório e jogar sem configurar banco nenhum.',
  'Animação das cartas voando do baralho para a mão, como no protótipo.',
]

export const VERSOES: Versao[] = [
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
