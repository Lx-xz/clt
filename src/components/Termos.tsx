import styles from './Termos.module.sass'

/**
 * O texto dos termos, num lugar só. Ele aparece em dois: no popup que abre do
 * check do cadastro (é onde as pessoas realmente leem, sem perder o
 * formulário pelo caminho) e na rota `/termos`, que existe para o link ser
 * compartilhável e para quem quiser ler antes de se cadastrar.
 */
export default function Termos() {
  return (
    <div className={styles.texto}>
      <p className={styles.data}>Versão de setembro de 2026</p>

      <h3>O que é isto</h3>
      <p>
        O CLT — Coffee, Labor and Tears é um card game feito como <b>trabalho de faculdade</b> por
        Luiz Adolfo Frederico (CC4M). Não é um produto comercial: não há cobrança, não há anúncio,
        não há venda de nada, e ele pode sair do ar ou ser reiniciado do zero a qualquer momento —
        inclusive apagando partidas e contas.
      </p>

      <h3>O que guardamos sobre você</h3>
      <ul>
        <li>
          <b>E-mail e nome</b>, para identificar sua conta. Quem entra pelo Google traz os mesmos
          dois dados de lá.
        </li>
        <li>
          <b>Nick e avatar</b>, que são públicos: aparecem no ranking, no seu perfil e ao lado dos
          seus relatos.
        </li>
        <li>
          <b>Suas partidas</b> — o dia a dia de cada run, para o histórico e para balancear o jogo.
          Elas aparecem no seu perfil, que qualquer pessoa pode abrir.
        </li>
        <li>
          <b>O que você relatar</b> na página de feedbacks, junto com o seu nick.
        </li>
      </ul>
      <p>
        A senha fica com o Supabase Auth, cifrada; este site nunca a vê nem a guarda. Seu e-mail e
        seu nome <b>não aparecem para outras pessoas</b> — só o nick e o avatar.
      </p>

      <h3>Convidado</h3>
      <p>
        Dá para jogar sem conta. Nesse caso a identidade é sorteada, fica só no seu navegador e{' '}
        <b>o progresso se perde</b> ao sair ou ao entrar de novo. As partidas de convidado são
        gravadas de forma anônima, marcadas como tal, e servem só para balanceamento.
      </p>

      <h3>O que se espera de você</h3>
      <ul>
        <li>Nada de nick ofensivo, de se passar por outra pessoa nem de conteúdo ilegal.</li>
        <li>Nada de tentar derrubar, sobrecarregar ou invadir o serviço.</li>
        <li>Nos feedbacks, escreva como você gostaria de ser respondido.</li>
      </ul>
      <p>
        Conta que usar o jogo para isso pode ser apagada sem aviso, junto com o que ela escreveu.
      </p>

      <h3>Seus dados na sua mão</h3>
      <p>
        Dá para pedir a exclusão da conta e de tudo que está ligado a ela a qualquer momento, pela
        própria página de feedbacks ou pelo e-mail do autor. As partidas já gravadas podem
        permanecer de forma anônima, sem ligação com você, porque é delas que sai o balanceamento.
      </p>

      <h3>Sem garantia</h3>
      <p>
        O jogo é oferecido como está. Ele pode ter bugs — inclusive bugs que apaguem o seu
        progresso. É justamente para isso que existe a página de feedbacks.
      </p>

      <p className={styles.fim}>
        Dúvida sobre qualquer coisa aqui? Abra um relato do tipo &ldquo;dúvida&rdquo; na página de
        feedbacks.
      </p>
    </div>
  )
}
