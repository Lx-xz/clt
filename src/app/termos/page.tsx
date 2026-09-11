import Link from 'next/link'
import styles from './termos.module.sass'

export const metadata = { title: 'Termos de uso — CLT' }

/**
 * Termos de uso, em português claro e curto. É um trabalho de faculdade sem
 * monetização e sem dado sensível — o texto diz exatamente isso, em vez de
 * copiar contrato de empresa grande que não se aplica a nada aqui.
 */
export default function TermosPage() {
  return (
    <main className={styles.pagina}>
      <Link className={styles.voltar} href="/">
        ← voltar
      </Link>
      <h1 className={styles.titulo}>Termos de uso</h1>
      <p className={styles.data}>Versão de setembro de 2026</p>

      <h2>O que é isto</h2>
      <p>
        O CLT — Coffee, Labor and Tears é um card game feito como <b>trabalho de faculdade</b> por
        Luiz Adolfo Frederico (CC4M). Não é um produto comercial: não há cobrança, não há anúncio,
        não há venda de nada, e ele pode sair do ar ou ser reiniciado do zero a qualquer momento —
        inclusive apagando partidas e contas.
      </p>

      <h2>O que guardamos sobre você</h2>
      <ul>
        <li>
          <b>E-mail e nome</b>, para identificar sua conta. Quem entra pelo Google traz os mesmos
          dois dados de lá.
        </li>
        <li>
          <b>Nick</b>, que é público: ele aparece no ranking e ao lado dos seus relatos.
        </li>
        <li>
          <b>Suas partidas</b> — o dia a dia de cada run, para o histórico e para balancear o jogo.
        </li>
        <li>
          <b>O que você relatar</b> na página de feedbacks, junto com o seu nick.
        </li>
      </ul>
      <p>
        A senha fica com o Supabase Auth, cifrada; este site nunca a vê nem a guarda. Seu e-mail e
        seu nome <b>não aparecem para outras pessoas</b> — só o nick.
      </p>

      <h2>Convidado</h2>
      <p>
        Dá para jogar sem conta. Nesse caso a identidade é sorteada, fica só no seu navegador e{' '}
        <b>o progresso se perde</b> ao sair ou ao entrar de novo. As partidas de convidado são
        gravadas de forma anônima, marcadas como tal, e servem só para balanceamento.
      </p>

      <h2>O que se espera de você</h2>
      <ul>
        <li>Nada de nick ofensivo, de se passar por outra pessoa nem de conteúdo ilegal.</li>
        <li>Nada de tentar derrubar, sobrecarregar ou invadir o serviço.</li>
        <li>Nos feedbacks, escreva como você gostaria de ser respondido.</li>
      </ul>
      <p>
        Conta que usar o jogo para isso pode ser apagada sem aviso, junto com o que ela escreveu.
      </p>

      <h2>Seus dados na sua mão</h2>
      <p>
        Dá para pedir a exclusão da conta e de tudo que está ligado a ela a qualquer momento, pela
        própria página de feedbacks ou pelo e-mail do autor. As partidas já gravadas podem
        permanecer de forma anônima, sem ligação com você, porque é delas que sai o balanceamento.
      </p>

      <h2>Sem garantia</h2>
      <p>
        O jogo é oferecido como está. Ele pode ter bugs — inclusive bugs que apaguem o seu
        progresso. É justamente para isso que existe a página de feedbacks.
      </p>

      <p className={styles.fim}>
        Dúvida sobre qualquer coisa aqui? Abra um relato do tipo &ldquo;dúvida&rdquo; na página de
        feedbacks.
      </p>
    </main>
  )
}
