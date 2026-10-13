'use client'

import { ArrowLeft, ArrowRight, Pointer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCard } from '@/game/catalogo'
import { ENVELOPES, MISSOES, SEQUENCIA } from '@/game/missoes'
import { regras, totalDeDias, type Regras } from '@/game/regras'
import type { TipoEnvelope } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import Card from '../Card'
import Dialogo from '../Dialogo'
import Dinheiro from '../Dinheiro'
import { ObjetoDaRecompensa } from '../Envelope'
import { RESOURCE_ICONS, TokenIcon, iconeDaClasse } from '../icons'
import styles from './ComoJogar.module.sass'

/**
 * As regras, em PÁGINAS (v0.38). Era um popup comprido de rolar, e no
 * celular a parte de baixo — a sexta e as derrotas — ninguém alcançava.
 * Hoje são seis passos curtos, com voltar e avançar embaixo, as bolinhas em
 * cima para pular, e as setas do teclado.
 *
 * Os números e as cartas saem do jogo em vez de estarem escritos aqui de
 * novo: as REGRAS de hoje (`regras()`, que vêm do banco), as cartas de
 * verdade (o componente `Card`) e as recompensas da tabela `ENVELOPES`.
 * Rebalancear o jogo não pode deixar o tutorial mentindo. As cores dos
 * recursos são as do HUD: o jogador reconhece o medidor pela cor antes de
 * ler o nome.
 */

/** Três cartas do baralho inicial, para o desenho falar antes do texto. */
// Tarefa Simples, Café e Hora Extra
const EXEMPLOS = ['ced5bff1-3c5e-5aaa-ac5c-5783d18e3d43', '49efebc8-f8b2-5495-ad28-472e360fc73b', 'bea0a018-64c8-57a7-a8df-c33aa2248983']

const CLASSES = [
  { kind: 'tarefa', nome: 'Tarefa', bonus: '+ produtividade', tom: styles.produtividade },
  { kind: 'descanso', nome: 'Descanso', bonus: '+ energia', tom: styles.energia },
  { kind: 'grana', nome: 'Grana', bonus: <>+<Dinheiro valor={10} /></>, tom: styles.dinheiro },
  { kind: 'social', nome: 'Social', bonus: '− estresse', tom: styles.destaque },
] as const

// funções, e não constantes: as regras vêm do banco, e um valor calculado
// no carregamento do módulo congelaria o número de ontem
function recursos(jogo: Regras) {
  return [
    { chave: 'energia', nome: 'Energia', tom: styles.energia, texto: <>Paga as cartas. Volta todo dia.</> },
    { chave: 'estresse', nome: 'Estresse', tom: styles.estresse, texto: <><b>Não some sozinho.</b> Acumula de um dia para o outro.</> },
    { chave: 'produtividade', nome: 'Produtividade', tom: styles.produtividade, texto: <>Zera todo dia. É o que o chefe mede.</> },
    { chave: 'dinheiro', nome: 'Dinheiro', tom: styles.dinheiro, texto: <>Começa em <Dinheiro valor={jogo.dinheiroInicial} />. Sai nas contas de sexta.</> },
  ] as const
}

function derrotas(jogo: Regras) {
  return [
    { chave: 'estresse', nome: 'Burnout', texto: <>O estresse chegou a {jogo.estresseMaximo}.</> },
    { chave: 'advertencias', nome: 'Demissão', texto: <>{jogo.advertenciasMaximas} advertências do chefe.</> },
    { chave: 'dinheiro', nome: 'Despejo', texto: <>O dinheiro não cobriu as contas da sexta.</> },
  ] as const
}

function Passos({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ol className={styles.passos}>
      {itens.map((item, i) => (
        <li key={i}>
          <span className={styles.numero}>{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function paginas(jogo: Regras): { titulo: string; corpo: React.ReactNode }[] {
  const semana1 = jogo.semanas[0]
  const Energia = RESOURCE_ICONS.energia
  const Estresse = RESOURCE_ICONS.estresse
  const IconeDeTarefa = iconeDaClasse('tarefa')
  const recompensas: { tipo: TipoEnvelope; de: string }[] = [
    { tipo: 'comum', de: 'Toda partida terminada, ganhando ou perdendo.' },
    { tipo: 'pardo', de: `Missão do dia: ${MISSOES[0].descricao.toLowerCase()}` },
    { tipo: 'confidencial', de: `Missão do dia: ${MISSOES[1].descricao.toLowerCase()}` },
    { tipo: 'epico', de: `${SEQUENCIA.nome}: ${SEQUENCIA.descricao.toLowerCase()}` },
  ]

  return [
    {
      titulo: 'O objetivo',
      corpo: (
        <>
          <p className={styles.abre}>
            Um mês de trabalho: <b>{jogo.semanas.length} semanas</b>, <b>{totalDeDias(jogo)} dias úteis</b>. Vence quem
            chega ao fim <b>empregado</b>, <b>inteiro</b> e com as <b>contas pagas</b>. A pontuação é o dinheiro que sobrou.
          </p>
          <div className={styles.recursos}>
            {recursos(jogo).map((r) => {
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
          <div className={styles.regraForte}>
            <span className={styles.conta}>
              <Energia size={16} className={styles.energia} aria-hidden /> Energia = {jogo.energiaBase} −{' '}
              <Estresse size={16} className={styles.estresse} aria-hidden /> Estresse
            </span>
            <span>A conta que sustenta o jogo: um dia mal administrado encolhe todos os seguintes.</span>
          </div>
        </>
      ),
    },
    {
      titulo: 'A carta',
      corpo: (
        <>
          <div className={styles.cartas}>
            {EXEMPLOS.map((id) => (
              <Card key={id} card={getCard(id)} className={styles.exemplo} />
            ))}
          </div>
          <ul className={styles.legenda}>
            <li>
              <span className={`${styles.carimbo} ${styles.carimboEnergia}`}>
                <Energia size={11} aria-hidden />2
              </span>
              <span>
                O <b>custo</b>, no canto de cima. Quase sempre é energia; algumas cobram também dinheiro, estresse ou
                produtividade, cada uma com o ícone do seu medidor.
              </span>
            </li>
            <li>
              <span className={styles.carimbo}>
                <IconeDeTarefa size={13} aria-hidden />
              </span>
              <span>
                A <b>classe</b>, no outro canto. É ela que conta para o Embalo. A cor da borda é a <b>raridade</b>.
              </span>
            </li>
            <li>
              <span className={styles.carimbo}>
                <Pointer size={13} aria-hidden />
              </span>
              <span>
                <b>Toque</b> para ler inteira. <b>Toque duplo</b> ou <b>arraste até a mesa</b> para jogar.
              </span>
            </li>
          </ul>
        </>
      ),
    },
    {
      titulo: 'Um dia',
      corpo: (
        <>
          <Passos
            itens={[
              <>Você acorda com a energia recalculada: {jogo.energiaBase} menos o estresse.</>,
              <>
                <b>Vire a carta de evento.</b> Ela acontece antes de tudo, e às vezes pede uma escolha.
              </>,
              <>
                Você compra <b>{jogo.cartasNaMao} cartas</b> e joga quantas a energia aguentar.
              </>,
              <>
                <b>Próximo dia</b> encerra o expediente. Ficar abaixo da <b>cota</b> de produtividade (
                {semana1.dailyQuota} na primeira semana) custa <b>+2 de estresse</b>.
              </>,
            ]}
          />
          <p className={styles.nota}>A cota sobe com as semanas. O que sobrou na mão vai para o descarte.</p>
        </>
      ),
    },
    {
      titulo: 'Embalo',
      corpo: (
        <>
          <p className={styles.linha}>
            A ordem importa. Cartas seguidas da <b>mesma classe</b> no mesmo dia rendem um extra: a 2ª ganha o bônus
            abaixo, e da 3ª em diante, o dobro.
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
          <p className={styles.nota}>
            Jogar outra classe zera o embalo — e a carta <b>sem classe</b> (o círculo tracejado) também.
          </p>
        </>
      ),
    },
    {
      titulo: 'Sexta-feira',
      corpo: (
        <>
          <Passos
            itens={[
              <>
                <b>Salário.</b> Bater a meta da semana ({semana1.weeklyGoal} de produtividade na primeira) paga{' '}
                <Dinheiro valor={semana1.fullSalary} />. Sem ela, <Dinheiro valor={semana1.reducedSalary} /> e uma
                advertência.
              </>,
              <>
                <b>Contas.</b> Saem <Dinheiro valor={jogo.contasSemanais} />. Não ter o dinheiro é despejo.
              </>,
              <>
                <b>Fim de semana.</b> −{jogo.descansoDoFimDeSemana} de estresse, e segunda começa outra semana.
              </>,
            ]}
          />
          <h3 className={styles.titulo}>Como se perde</h3>
          <div className={styles.derrotas}>
            {derrotas(jogo).map((d) => {
              const Icone = RESOURCE_ICONS[d.chave]
              return (
                <div key={d.nome} className={`${styles.derrota} ${styles.estresse}`}>
                  <Icone size={18} aria-hidden />
                  <span className={styles.recursoNome}>{d.nome}</span>
                  <span className={styles.recursoTexto}>{d.texto}</span>
                </div>
              )
            })}
          </div>
        </>
      ),
    },
    {
      titulo: 'Depois da partida',
      corpo: (
        <>
          <p className={styles.linha}>Carta nova vem de recompensa, e recompensa vem de jogar:</p>
          <ul className={styles.recompensas}>
            {recompensas.map((r) => {
              const env = ENVELOPES[r.tipo]
              return (
                <li key={r.tipo}>
                  <ObjetoDaRecompensa tipo={r.tipo} largura={46} />
                  <span>
                    <b>{env.nome}</b> · {env.cartas[0]} a {env.cartas[1]} cartas
                    <small>{r.de.replace(/\.$/, '')}.</small>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className={styles.nota}>
            <TokenIcon size={14} /> Carta repetida acima do limite vira <b>token</b>, que compra cartas e itens na
            máquina de vendas. No <b>Baralho</b> você monta o seu: de {jogo.baralhoMinimo} a {jogo.baralhoMaximo} cartas,
            com pelo menos {jogo.minimoPorNaipe} de cada classe.
          </p>
          <p className={styles.dica}>
            Dica de quem já perdeu muito: descansar parece turno desperdiçado, mas estresse alto encolhe <i>todos</i> os
            dias seguintes.
          </p>
        </>
      ),
    },
  ]
}

export default function ComoJogar({ onFechar }: { onFechar: () => void }) {
  // as regras de HOJE: o tutorial explica o jogo, não uma partida específica
  const lista = paginas(regras())
  const [atual, setAtual] = useState(0)
  const ultima = atual === lista.length - 1

  // as setas do teclado passam a página, como num livro
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setAtual((a) => Math.min(lista.length - 1, a + 1))
      else if (e.key === 'ArrowLeft') setAtual((a) => Math.max(0, a - 1))
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [lista.length])

  return (
    <Dialogo
      titulo="Como jogar"
      onFechar={onFechar}
      largo
      acoes={
        <div className={styles.rodape}>
          <button
            type="button"
            className={`${buttons.button} ${buttons.ghost}`}
            onClick={() => setAtual((a) => a - 1)}
            disabled={atual === 0}
          >
            <ArrowLeft size={16} aria-hidden /> Voltar
          </button>
          <span className={styles.contador}>
            {atual + 1} de {lista.length}
          </span>
          {ultima ? (
            <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onFechar}>
              Entendi
            </button>
          ) : (
            <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={() => setAtual((a) => a + 1)}>
              Próximo <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>
      }
    >
      {/* as páginas como abas: dá para pular direto para a que interessa */}
      <nav className={styles.indice} aria-label="Páginas do tutorial">
        {lista.map((p, i) => (
          <button
            key={p.titulo}
            type="button"
            className={`${styles.marcador} ${i === atual ? styles.marcadorAtual : ''} ${i < atual ? styles.marcadorLido : ''}`}
            aria-current={i === atual ? 'step' : undefined}
            aria-label={p.titulo}
            title={p.titulo}
            onClick={() => setAtual(i)}
          />
        ))}
      </nav>
      <section key={atual} className={styles.pagina} aria-live="polite">
        <h3 className={styles.tituloDaPagina}>{lista[atual].titulo}</h3>
        {lista[atual].corpo}
      </section>
    </Dialogo>
  )
}
