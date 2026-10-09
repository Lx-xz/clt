/**
 * Uma alteração por salvar na página aberta — hoje, só o editor do avatar.
 *
 * O site é uma SPA estática e a navegação é do Next: não existe um "antes de
 * sair desta rota" para perguntar se pode. A página que tem algo a perder
 * marca aqui, e quem navega (a barra lateral) pergunta antes de ir. Fechar a
 * aba é outro caminho, e esse o navegador cobre com o `beforeunload`, que a
 * própria página liga.
 *
 * Um módulo com uma variável, e não um contexto do React: quem lê é um
 * clique, não um render — ninguém precisa redesenhar quando ela muda.
 */
let pendente: string | null = null

export function marcarPendencia(aviso: string | null) {
  pendente = aviso
}

/** O aviso a mostrar antes de sair, ou null quando não há nada a perder. */
export function pendencia(): string | null {
  return pendente
}
