'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, CloudOff, Loader } from 'lucide-react'
import Card from '@/components/Card'
import CardDetail from '@/components/CardDetail'
import Medidor from '@/components/Medidor'
import { RESOURCE_ICONS } from '@/components/icons'
import { MAX_STRESS, MAX_WARNINGS, WEEKLY_BILLS, getCard } from '@/game/cards'
import {
  canPlay,
  chooseEventOption,
  chooseReward,
  createRun,
  currentWeek,
  dayLabel,
  effectiveCost,
  endDay,
  payBills,
  paySalary,
  playCard,
  restWeekend,
  revealEvent,
} from '@/game/engine'
import { getEvent } from '@/game/events'
import {
  carregarDoBanco,
  enviarRunsPendentes,
  registrarRunAgora,
  sincronizar,
  type StatusSync,
} from '@/data/sync'
import { useSessao } from '@/components/SessaoGuard'
import { EVENTO_REINICIAR } from '@/components/SideNav'
import { clearRun, loadCollection, unlockCard } from '@/game/storage'
import type { CardInstance, GameState } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './jogar.module.sass'

const FIM: Record<Exclude<GameState['outcome'], 'jogando'>, { title: string; text: string }> = {
  vitoria: { title: 'Mês fechado', text: 'Quatro semanas, ainda empregado e com as contas pagas.' },
  burnout: { title: 'Burnout', text: 'O estresse chegou a 10. O corpo cobrou antes do banco.' },
  demissao: { title: 'Demissão', text: 'Três advertências. O RH marcou uma conversa rápida.' },
  despejo: { title: 'Despejo', text: 'As contas de sexta não fecharam.' },
}

const CLASSES: Record<string, string> = {
  tarefa: 'produtividade',
  descanso: 'energia',
  grana: 'dinheiro',
  social: 'calma',
}

export default function JogarPage() {
  const [state, setState] = useState<GameState | null>(null)
  const [aberta, setAberta] = useState<CardInstance | null>(null)
  const [eventoAberto, setEventoAberto] = useState(false)
  const [sobreTapete, setSobreTapete] = useState(false)
  const [status, setStatus] = useState<StatusSync>('ocioso')
  const [falha, setFalha] = useState<string | null>(null)
  // o banco recusar o registro da run precisa aparecer na tela: engolir isso
  // foi o bug de "joguei até o fim e não salvou"
  const [registroFalhou, setRegistroFalhou] = useState(false)
  const tapete = useRef<HTMLDivElement>(null)
  const sessao = useSessao()

  useEffect(() => {
    let vivo = true
    // o que não conseguiu subir da última vez sobe agora
    void enviarRunsPendentes()
    carregarDoBanco(sessao.id)
      .then(({ run, collection }) => {
        if (!vivo) return
        if (run) {
          setState(run)
          return
        }
        // run nova já nasce salva: sem isso, recarregar antes da primeira
        // jogada sorteava outra run
        const nova = createRun(collection.equipped)
        setState(nova)
        sincronizar(sessao.id, nova, collection, setStatus)
      })
      .catch((e: unknown) => {
        if (vivo) setFalha(e instanceof Error ? e.message : 'Não deu para falar com o banco.')
      })
    return () => {
      vivo = false
    }
  }, [sessao.id])

  function update(next: GameState) {
    setState(next)
    sincronizar(sessao.id, next, loadCollection(), setStatus)
    // a run terminada vai para o banco na hora, fora do timer do sincronizar:
    // o timer é cancelado por qualquer jogada seguinte, e era assim que uma
    // derrota sumia se o jogador clicasse em "nova run" rápido demais
    if (next.outcome !== 'jogando') {
      void registrarRunAgora(sessao.id, next, next.outcome).then((erro) => setRegistroFalhou(Boolean(erro)))
    }
  }

  /**
   * `guardar` é a resposta do jogador à pergunta do menu. Dizer não tira a run
   * de "meus jogos" e do ranking — ela ainda é registrada, invisível, porque
   * quantas runs são largadas no meio é justamente um dado de balanceamento.
   */
  function recomecar(guardar = true) {
    // abaixo do dia 3 não registra nada: reiniciar no primeiro minuto é
    // "ainda estou escolhendo o baralho", não desistência — e encheria a
    // análise de abandono que não diz nada
    if (state && state.outcome === 'jogando' && state.day >= 3) {
      void registrarRunAgora(sessao.id, state, 'abandono', guardar)
    }
    clearRun()
    setAberta(null)
    update(createRun(loadCollection().equipped))
  }

  // o botão de reiniciar vive no menu lateral (com confirmação); ele avisa por
  // evento e a mesa recomeça aqui
  const recomecarRef = useRef(recomecar)
  recomecarRef.current = recomecar
  useEffect(() => {
    const aoReiniciar = (e: Event) => {
      const guardar = (e as CustomEvent<{ guardar?: boolean }>).detail?.guardar ?? true
      recomecarRef.current(guardar)
    }
    window.addEventListener(EVENTO_REINICIAR, aoReiniciar)
    return () => window.removeEventListener(EVENTO_REINICIAR, aoReiniciar)
  }, [])

  function jogar(uid: string) {
    if (!state) return
    setAberta(null)
    update(playCard(state, uid))
  }

  if (falha) {
    return (
      <main className={styles.mesa}>
        <div className={styles.fundo}>
          <div className={styles.painel}>
            <h2 className={styles.painelTitulo}>Não deu para carregar seu save</h2>
            <p className={styles.painelTexto}>{falha}</p>
            <div className={styles.acoes}>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => window.location.reload()}
              >
                Tentar de novo
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!state) {
    return <main className={styles.mesa} aria-busy="true" />
  }

  const week = currentWeek(state)
  const evento = state.currentEvent ? getEvent(state.currentEvent) : null
  const acabou = state.outcome !== 'jogando'
  const esperandoEvento = state.phase === 'evento' && !state.eventRevealed
  const meio = (state.hand.length - 1) / 2

  return (
    <main className={`${styles.mesa} ${sobreTapete ? styles.arrastando : ''}`}>
      <div className={styles.hud}>
        <span className={styles.dia}>{acabou ? 'Run encerrada' : dayLabel(state)}</span>
        <div className={styles.medidores}>
          <Medidor
            icon={RESOURCE_ICONS.energia}
            nome="Energia"
            descricao="Reinicia todo dia em 10 menos o estresse. É o que você gasta para jogar cartas."
            valor={state.energy}
            tom={styles.energia}
          />
          <Medidor
            icon={RESOURCE_ICONS.estresse}
            nome="Estresse"
            descricao="Acumula entre os dias e encolhe a energia de amanhã. Chegou a 10, é burnout."
            valor={state.stress}
            total={MAX_STRESS}
            tom={styles.estresse}
            subirEhRuim
          />
          <Medidor
            icon={RESOURCE_ICONS.produtividade}
            nome="Produtividade"
            descricao="Zera todo dia. Não bater a cota custa +2 estresse e uma anotação do chefe."
            valor={state.productivity}
            total={state.dailyQuota}
            tom={styles.produtividade}
          />
          <Medidor
            icon={RESOURCE_ICONS.dinheiro}
            nome="Dinheiro"
            descricao="Entra pelo salário, hora extra e freela. Sai nas contas de sexta. É a pontuação final."
            valor={state.money}
            prefixo="R$ "
            tom={styles.dinheiro}
          />
          <Medidor
            icon={RESOURCE_ICONS.semana}
            nome="Meta da semana"
            descricao="Soma da produtividade dos 5 dias. Não bater significa salário reduzido e advertência."
            valor={state.weekProductivity}
            total={week.weeklyGoal}
          />
          <Medidor
            icon={RESOURCE_ICONS.advertencias}
            nome="Advertências"
            descricao="Chegou a três, é demissão."
            valor={state.warnings}
            total={MAX_WARNINGS}
            subirEhRuim
          />
        </div>
        <span className={styles.espaco} />
        <span className={`${styles.sync} ${status === 'erro' ? styles.syncErro : ''}`}>
          <span className={styles.nick}>{sessao.nick}</span>
          {status === 'salvando' ? (
            <Loader size={13} className={styles.girando} aria-label="salvando" />
          ) : null}
          {status === 'salvo' ? <Check size={13} aria-label="salvo" /> : null}
          {status === 'erro' ? <CloudOff size={13} aria-label="sem conexão" /> : null}
        </span>
        {state.phase === 'dia' ? (
          <button
            type="button"
            className={`${buttons.button} ${buttons.primary} ${styles.proximoDia}`}
            onClick={() => update(endDay(state))}
          >
            <span className={styles.rotuloLongo}>Próximo dia</span>
            <span className={styles.rotuloCurto}>Próx. dia</span>
            <ArrowRight size={15} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className={styles.zonaEvento}>
        {evento ? (
          <Card
            card={evento}
            faceDown={esperandoEvento}
            className={`${styles.eventoCarta} ${esperandoEvento ? styles.revelavel : ''}`}
            onOpen={esperandoEvento ? () => update(revealEvent(state)) : () => setEventoAberto(true)}
          />
        ) : null}
        {state.pendingEventChoice && evento?.choices ? (
          <div className={styles.escolhas}>
            {evento.choices.map((escolha, i) => (
              <button
                key={escolha.label}
                type="button"
                className={buttons.button}
                onClick={() => update(chooseEventOption(state, i as 0 | 1))}
              >
                {escolha.label}
                <span className={styles.notaEscolha}>{escolha.text}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={tapete} className={`${styles.tapete} ${sobreTapete ? styles.alvo : ''}`}>
        {state.playedToday.length === 0 ? (
          <span className={styles.dicaTapete}>{dicaDoTapete(state, esperandoEvento)}</span>
        ) : (
          <div
            className={styles.jogadas}
            style={{ '--n': state.playedToday.length } as React.CSSProperties}
          >
            {state.playedToday.map((id, i) => (
              <Card
                key={`${id}-${i}`}
                card={getCard(id)}
                className={styles.jogada}
                style={{ '--i': i } as React.CSSProperties}
              />
            ))}
          </div>
        )}
        {state.streakKind && state.streakCount >= 1 ? (
          <span
            key={`${state.streakKind}-${state.streakCount}`}
            className={`${styles.embalo} ${state.streakCount >= 2 ? styles.embaloAtivo : ''}`}
          >
            {state.streakCount >= 2
              ? state.lastCombo
              : `Outra de ${state.streakKind}: +1 ${CLASSES[state.streakKind]}`}
          </span>
        ) : null}
      </div>

      <Pilha area={styles.pilhaDeck} rotulo="Baralho" quantidade={state.deck.length} />

      <div className={styles.zonaMao}>
        {state.hand.length === 0 ? (
          <span className={styles.maoVazia}>{esperandoEvento ? 'Aguardando o evento' : 'Mão vazia'}</span>
        ) : (
          <div
            className={styles.leque}
            style={
              {
                // com poucas cartas não há motivo para esconder os nomes
                '--sobreposicao': state.hand.length > 5 ? '-.16' : '-.08',
                '--sobreposicao-mobile': state.hand.length > 5 ? '-.28' : '-.15',
              } as React.CSSProperties
            }
          >
            {state.hand.map((instancia, i) => {
                const carta = getCard(instancia.cardId)
                const podeJogar = canPlay(state, instancia)
                return (
                  <Card
                    key={instancia.uid}
                    card={carta}
                    cost={effectiveCost(state, carta.id)}
                    rotation={(i - meio) * 5}
                    lift={Math.abs(i - meio) * 7}
                    style={{ '--i': i } as React.CSSProperties}
                    disabled={!podeJogar}
                    onOpen={() => setAberta(instancia)}
                    onPlay={podeJogar ? () => jogar(instancia.uid) : undefined}
                    dropRef={tapete}
                    onDragOver={setSobreTapete}
                  />
                )
              })}
          </div>
        )}
      </div>

      <Pilha area={styles.pilhaDesc} rotulo="Descarte" quantidade={state.discard.length} />

      {eventoAberto && evento ? <CardDetail card={evento} onClose={() => setEventoAberto(false)} /> : null}

      {aberta ? (
        <CardDetail
          card={getCard(aberta.cardId)}
          cost={effectiveCost(state, aberta.cardId)}
          onClose={() => setAberta(null)}
          onPlay={canPlay(state, aberta) ? () => jogar(aberta.uid) : undefined}
          blockedReason={canPlay(state, aberta) ? undefined : motivoBloqueio(state, aberta)}
        />
      ) : null}

      {state.phase === 'sexta' ? (
        <div className={styles.fundo}>
          <div className={styles.painel}>
            <h2 className={styles.painelTitulo}>Sexta-feira</h2>

            <ol className={styles.passos}>
              <li className={styles.passo}>
                <span className={styles.passoRot}>Produtividade da semana</span>
                <span className={styles.passoVal}>
                  {state.weekProductivity} / {week.weeklyGoal}
                </span>
              </li>

              {state.fridayResult ? (
                <li className={`${styles.passo} ${styles.passoNovo}`}>
                  <span className={styles.passoRot}>
                    {state.fridayResult.metGoal ? 'Meta batida · salário cheio' : 'Meta falhou · salário reduzido e +1 advertência'}
                  </span>
                  <span className={`${styles.passoVal} ${styles.entrada}`}>+R$ {state.fridayResult.salary}</span>
                </li>
              ) : null}

              {state.fridayStep === 'descanso' ? (
                <li className={`${styles.passo} ${styles.passoNovo}`}>
                  <span className={styles.passoRot}>Aluguel e mercado</span>
                  <span className={`${styles.passoVal} ${styles.saida}`}>−R$ {WEEKLY_BILLS}</span>
                </li>
              ) : null}
            </ol>

            <p className={styles.painelTexto}>{textoDaSexta(state)}</p>

            <div className={styles.acoes}>
              {state.fridayStep === 'salario' ? (
                <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={() => update(paySalary(state))}>
                  Bater o ponto
                </button>
              ) : null}
              {state.fridayStep === 'contas' ? (
                <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={() => update(payBills(state))}>
                  Pagar as contas
                </button>
              ) : null}
              {state.fridayStep === 'descanso' ? (
                <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={() => update(restWeekend(state))}>
                  Ir para o fim de semana
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {state.phase === 'recompensa' ? (
        <div className={styles.fundo}>
          <div className={styles.painel}>
            <h2 className={styles.painelTitulo}>Recompensa da semana</h2>
            <p className={styles.painelTexto}>Escolha 1 carta entre 3 para entrar no baralho.</p>
            <div className={styles.recompensas}>
              {state.rewardOptions.map((id, i) => (
                <Card
                  key={id}
                  card={getCard(id)}
                  className={styles.recompensa}
                  style={{ '--i': i } as React.CSSProperties}
                  onOpen={() => {
                    unlockCard(id)
                    update(chooseReward(state, id))
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {acabou ? (
        <div className={styles.fundo}>
          <div className={styles.painel}>
            <h2 className={styles.painelTitulo}>{FIM[state.outcome as keyof typeof FIM].title}</h2>
            <p className={styles.painelTexto}>
              {FIM[state.outcome as keyof typeof FIM].text} Pontuação final: R$ {state.money}.
            </p>
            {registroFalhou ? (
              <p className={styles.painelAviso}>
                Esta partida não chegou ao banco agora — ela ficou guardada aqui e sobe sozinha da
                próxima vez que você abrir a mesa. O console do navegador tem o motivo.
              </p>
            ) : null}
            <div className={styles.acoes}>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => recomecar()}
              >
                Nova run
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function textoDaSexta(state: GameState): string {
  if (state.fridayStep === 'salario') return 'O chefe soma a produtividade dos cinco dias antes de liberar o pagamento.'
  if (state.fridayStep === 'contas') return `Salário na conta. Agora o aluguel e o mercado: R$ ${WEEKLY_BILLS}. Você tem R$ ${state.money}.`
  return `Sobraram R$ ${state.money}. O fim de semana tira 3 de estresse antes da próxima segunda.`
}

function dicaDoTapete(state: GameState, esperandoEvento: boolean): string {
  if (esperandoEvento) return 'Revele o evento primeiro'
  if (state.pendingEventChoice) return 'Escolha o que fazer no evento'
  if (state.hand.length === 0) return 'Sem cartas na mão — encerre o dia'
  return 'Arraste uma carta até aqui'
}

function motivoBloqueio(state: GameState, instancia: CardInstance): string {
  const carta = getCard(instancia.cardId)
  if (state.phase !== 'dia') return 'Só dá para jogar depois de revelar o evento do dia.'
  if (state.blockedKinds.includes(carta.kind)) return `O evento de hoje bloqueia cartas de ${carta.kind}.`
  if (carta.id === 'puxar-o-saco') return 'Só uma vez por run, e só com alguma advertência para cancelar.'
  return `Energia insuficiente: custa ${effectiveCost(state, carta.id)} e você tem ${state.energy}.`
}

function Pilha({ area, rotulo, quantidade }: { area: string; rotulo: string; quantidade: number }) {
  return (
    <div className={`${styles.pilha} ${area}`}>
      <div className={`${styles.monte} ${quantidade === 0 ? styles.vazia : ''}`}>
        <span className={`${styles.lastro} ${styles.lastro1}`} />
        <span className={`${styles.lastro} ${styles.lastro2}`} />
        <span className={styles.topo}>
          <span className={styles.qtd}>{quantidade}</span>
        </span>
      </div>
      <span className={styles.rotPilha}>{rotulo}</span>
    </div>
  )
}
