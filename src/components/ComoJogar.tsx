'use client'

import Dialogo from './Dialogo'
import {
  BASE_ENERGY,
  HAND_SIZE,
  MAX_STRESS,
  MAX_WARNINGS,
  STARTING_MONEY,
  TOTAL_DAYS,
  WEEKLY_BILLS,
  WEEKS,
} from '@/game/cards'
import styles from './ComoJogar.module.sass'

/**
 * As regras, no popup. Os números saem de `cards.ts` em vez de estarem
 * escritos aqui de novo: rebalancear o jogo não pode deixar o tutorial
 * mentindo.
 */
export default function ComoJogar({ onFechar }: { onFechar: () => void }) {
  return (
    <Dialogo titulo="Como jogar" onFechar={onFechar} largo>
      <p className={styles.linha}>
        Você tem um mês de trabalho pela frente: <b>{WEEKS.length} semanas</b>, {TOTAL_DAYS} dias
        úteis. Vence quem chega ao fim <b>empregado</b>, <b>inteiro</b> e com as <b>contas pagas</b>.
        A pontuação é o dinheiro que sobrou.
      </p>

      <section className={styles.bloco}>
        <h3 className={styles.titulo}>Os quatro recursos</h3>
        <ul className={styles.lista}>
          <li>
            <b>Energia</b> — é o que paga as cartas. Reinicia todo dia em{' '}
            <b>
              {BASE_ENERGY} − estresse
            </b>
            . Esta é a regra que sustenta o jogo inteiro.
          </li>
          <li>
            <b>Estresse</b> — <b>não some sozinho</b>. Acumula de um dia para o outro e encolhe a
            energia de amanhã. Chegou a {MAX_STRESS}, é burnout.
          </li>
          <li>
            <b>Produtividade</b> — zera todo dia. É o que o chefe mede, na cota do dia e na meta da
            semana.
          </li>
          <li>
            <b>Dinheiro</b> — começa em R$ {STARTING_MONEY}, entra no salário de sexta e sai nas
            contas.
          </li>
        </ul>
      </section>

      <section className={styles.bloco}>
        <h3 className={styles.titulo}>Um dia</h3>
        <ol className={styles.lista}>
          <li>Você acorda e a energia é recalculada.</li>
          <li>
            <b>Vire a carta de evento</b> clicando nela. Ela acontece antes de tudo, e às vezes pede
            uma escolha.
          </li>
          <li>
            Você compra {HAND_SIZE} cartas e joga quantas a energia aguentar. <b>Clique</b> na carta
            para ler inteira, <b>clique duplo</b> ou <b>arraste até a mesa</b> para jogar.
          </li>
          <li>
            <b>Próximo dia</b> encerra o expediente. Não bater a cota do dia custa estresse e uma
            anotação do chefe.
          </li>
        </ol>
      </section>

      <section className={styles.bloco}>
        <h3 className={styles.titulo}>Embalo</h3>
        <p className={styles.linha}>
          Cartas seguidas da <b>mesma classe</b> no mesmo dia rendem bônus: a 2ª dá um extra do
          recurso da classe (tarefa → produtividade, descanso → energia, grana → dinheiro, social →
          menos estresse), e da 3ª em diante o dobro. Jogar outra classe zera o embalo. Ou seja:{' '}
          <b>a ordem importa</b>.
        </p>
      </section>

      <section className={styles.bloco}>
        <h3 className={styles.titulo}>Sexta-feira</h3>
        <p className={styles.linha}>
          A sexta vem em três passos, um clique cada: entra o <b>salário</b> (reduzido, e com
          advertência, se a meta da semana não foi batida), saem as <b>contas</b> de R${' '}
          {WEEKLY_BILLS} e vem o <b>fim de semana</b>, que tira um pouco do estresse. No fim da
          semana você escolhe uma carta nova para a coleção.
        </p>
      </section>

      <section className={styles.bloco}>
        <h3 className={styles.titulo}>Como se perde</h3>
        <ul className={styles.lista}>
          <li>
            <b>Burnout</b> — o estresse chegou a {MAX_STRESS}.
          </li>
          <li>
            <b>Demissão</b> — {MAX_WARNINGS} advertências.
          </li>
          <li>
            <b>Despejo</b> — o dinheiro não cobriu as contas da sexta.
          </li>
        </ul>
      </section>

      <p className={styles.dica}>
        Dica de quem já perdeu muito: descansar parece desperdício de turno, mas estresse alto
        encolhe <i>todos</i> os dias seguintes. Gastar um dia com o estresse baixo custa menos do
        que arrastar dez dias com ele alto.
      </p>
    </Dialogo>
  )
}
