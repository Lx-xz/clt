'use client'

import Card from './Card'
import Dialogo from './Dialogo'
import { RESOURCE_ICONS, iconeDaClasse } from './icons'

/** O ícone de tarefa, citado no texto que explica o canto da carta. */
const IconeDeTarefa = iconeDaClasse('tarefa')
import {
} from '@/game/cards'
import { regras, totalDeDias, type Regras } from '@/game/regras'
import { getCard } from '@/game/catalogo'
import styles from './ComoJogar.module.sass'

/**
 * As regras, no popup. Os números e as cartas saem de `cards.ts` em vez de
 * estarem escritos aqui de novo: rebalancear o jogo não pode deixar o
 * tutorial mentindo, e as cartas de exemplo são as mesmas que o jogador vai
 * ver na mesa — inclusive no desenho, porque são o componente `Card`.
 */

// RECURSOS e DERROTAS viraram funções porque agora leem as regras do modo,
// e o modo vem do banco: um valor calculado no carregamento do módulo
// congelaria o número de ontem.
function recursos(jogo: Regras) {
  return [
  {
    chave: 'energia',
    nome: 'Energia',
    tom: styles.energia,
    texto: (
      <>
        Paga as cartas. Reinicia todo dia em <b>{jogo.energiaBase} − estresse</b>.
      </>
    ),
  },
  {
    chave: 'estresse',
    nome: 'Estresse',
    tom: styles.estresse,
    texto: (
      <>
        <b>Não some sozinho.</b> Acumula e encolhe a energia de amanhã.
      </>
    ),
  },
  {
    chave: 'produtividade',
    nome: 'Produtividade',
    tom: styles.produtividade,
    texto: <>Zera todo dia. É o que o chefe mede.</>,
  },
  {
    chave: 'dinheiro',
    nome: 'Dinheiro',
    tom: styles.dinheiro,
    texto: <>Começa em R$ {jogo.dinheiroInicial}. Sai nas contas de sexta.</>,
  },
  ] as const
}

const CLASSES = [
  { kind: 'tarefa', nome: 'Tarefa', bonus: '+ produtividade', tom: styles.produtividade },
  { kind: 'descanso', nome: 'Descanso', bonus: '+ energia', tom: styles.energia },
  { kind: 'grana', nome: 'Grana', bonus: '+ R$ 10', tom: styles.dinheiro },
  { kind: 'social', nome: 'Social', bonus: '− estresse', tom: styles.destaque },
] as const

function derrotas(jogo: Regras) {
  return [
  {
    chave: 'estresse',
    nome: 'Burnout',
    tom: styles.estresse,
    texto: <>O estresse chegou a {jogo.estresseMaximo}.</>,
  },
  {
    chave: 'advertencias',
    nome: 'Demissão',
    tom: styles.estresse,
    texto: <>{jogo.advertenciasMaximas} advertências do chefe.</>,
  },
  {
    chave: 'dinheiro',
    nome: 'Despejo',
    tom: styles.estresse,
    texto: <>O dinheiro não cobriu as contas da sexta.</>,
  },
  ] as const
}

/** Três cartas do baralho inicial, para o desenho falar antes do texto. */
const EXEMPLOS = ['tarefa-simples', 'cafe', 'hora-extra']

export default function ComoJogar({ onFechar }: { onFechar: () => void }) {
  // as regras de HOJE: o tutorial explica o jogo, não uma partida específica
  const jogo = regras()
  const RECURSOS = recursos(jogo)
  const DERROTAS = derrotas(jogo)

  return (
    <Dialogo titulo="Como jogar" onFechar={onFechar} largo>
      <p className={styles.abre}>
        Um mês de trabalho: <b>{jogo.semanas.length} semanas</b>, <b>{totalDeDias(jogo)} dias úteis</b>. Vence
        quem chega ao fim <b>empregado</b>, <b>inteiro</b> e com as <b>contas pagas</b>. A pontuação
        é o dinheiro que sobrou.
      </p>

      {/* ---------------------------------------------------- recursos */}
      <h3 className={styles.titulo}>Os quatro recursos</h3>
      <div className={styles.recursos}>
        {RECURSOS.map((r) => {
          const Icone = RESOURCE_ICONS[r.chave]
          return (
            <div key={r.nome} className={`${styles.recurso} ${r.tom}`}>
              <Icone size={20} aria-hidden />
              <span className={styles.recursoNome}>{r.nome}</span>
              <span className={styles.recursoTexto}>{r.texto}</span>
            </div>
          )
        })}
      </div>
      <p className={styles.regraForte}>
        <RESOURCE_ICONS.energia size={15} aria-hidden /> Energia = {jogo.energiaBase} −{' '}
        <RESOURCE_ICONS.estresse size={15} aria-hidden /> Estresse
        <span>é esta linha que sustenta o jogo: um dia mal administrado encolhe todos os outros</span>
      </p>

      {/* ------------------------------------------------------ cartas */}
      <h3 className={styles.titulo}>A carta</h3>
      <div className={styles.cartas}>
        {EXEMPLOS.map((id) => (
          <Card key={id} card={getCard(id)} className={styles.exemplo} />
        ))}
      </div>
      <ul className={styles.legenda}>
        <li>
          <span className={styles.marcaCusto}>3</span> o <b>custo</b> em energia, na aba de cima
        </li>
        <li>
          <IconeDeTarefa size={14} aria-hidden /> a <b>classe</b> da carta, no canto direito —
          é ela que conta para o Embalo
        </li>
        <li>
          <b>Clique</b> para ler inteira · <b>clique duplo</b> ou <b>arraste até a mesa</b> para
          jogar
        </li>
      </ul>

      {/* --------------------------------------------------------- dia */}
      <h3 className={styles.titulo}>Um dia</h3>
      <ol className={styles.passos}>
        <li>
          <span className={styles.numero}>1</span>
          Você acorda e a energia é recalculada.
        </li>
        <li>
          <span className={styles.numero}>2</span>
          <b>Vire a carta de evento</b> clicando nela. Ela acontece antes de tudo, e às vezes pede
          uma escolha.
        </li>
        <li>
          <span className={styles.numero}>3</span>
          Você compra {jogo.cartasNaMao} cartas e joga quantas a energia aguentar.
        </li>
        <li>
          <span className={styles.numero}>4</span>
          <b>Próximo dia</b> encerra o expediente. Não bater a cota custa estresse e uma anotação
          do chefe.
        </li>
      </ol>

      {/* ------------------------------------------------------ embalo */}
      <h3 className={styles.titulo}>Embalo — a ordem importa</h3>
      <p className={styles.linha}>
        Cartas seguidas da <b>mesma classe</b> no mesmo dia rendem bônus: a 2ª dá o extra abaixo, e
        da 3ª em diante o dobro. Jogar outra classe zera — e carta <b>sem tipo</b> zera também,
        porque ela não pertence a classe nenhuma.
      </p>
      <div className={styles.classes}>
        {CLASSES.map((c) => {
          const Icone = iconeDaClasse(c.kind)
          return (
            <span key={c.kind} className={`${styles.classe} ${c.tom}`}>
              <Icone size={15} aria-hidden />
              {c.nome}
              <b>{c.bonus}</b>
            </span>
          )
        })}
      </div>

      {/* ------------------------------------------------------- sexta */}
      <h3 className={styles.titulo}>Sexta-feira</h3>
      <ol className={styles.passos}>
        <li>
          <span className={styles.numero}>1</span>
          <b>Salário</b> — reduzido, e com advertência, se a meta da semana não foi batida.
        </li>
        <li>
          <span className={styles.numero}>2</span>
          <b>Contas</b> — saem R$ {jogo.contasSemanais}. Não ter o dinheiro é despejo.
        </li>
        <li>
          <span className={styles.numero}>3</span>
          <b>Fim de semana</b> — tira um pouco do estresse, e você escolhe uma carta nova.
        </li>
      </ol>

      {/* ----------------------------------------------------- derrota */}
      <h3 className={styles.titulo}>Como se perde</h3>
      <div className={styles.derrotas}>
        {DERROTAS.map((d) => {
          const Icone = RESOURCE_ICONS[d.chave]
          return (
            <div key={d.nome} className={`${styles.derrota} ${d.tom}`}>
              <Icone size={18} aria-hidden />
              <span className={styles.recursoNome}>{d.nome}</span>
              <span className={styles.recursoTexto}>{d.texto}</span>
            </div>
          )
        })}
      </div>

      <p className={styles.dica}>
        Dica de quem já perdeu muito: descansar parece desperdício de turno, mas estresse alto
        encolhe <i>todos</i> os dias seguintes. Gastar um dia com o estresse baixo custa menos do
        que arrastar dez dias com ele alto.
      </p>
    </Dialogo>
  )
}
