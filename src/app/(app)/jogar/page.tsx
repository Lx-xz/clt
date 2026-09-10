'use client'

import { useEffect, useRef, useState } from 'react'
import Card from '@/components/Card'
import CardDetail from '@/components/CardDetail'
import { RESOURCE_ICONS } from '@/components/icons'
import { MAX_STRESS, MAX_WARNINGS, getCard } from '@/game/cards'
import {
  canPlay,
  chooseEventOption,
  chooseReward,
  createRun,
  currentWeek,
  dayLabel,
  effectiveCost,
  endDay,
  playCard,
  resolveFriday,
  revealEvent,
} from '@/game/engine'
import { getEvent } from '@/game/events'
import { clearRun, loadCollection, loadRun, saveRun, unlockCard } from '@/game/storage'
import type { CardInstance, GameState } from '@/game/types'
import buttons from '@/styles/buttons.module.sass'
import styles from './jogar.module.sass'

const FIM: Record<Exclude<GameState['outcome'], 'jogando'>, { title: string; text: string }> = {
  vitoria: { title: 'Mês fechado', text: 'Quatro semanas, ainda empregado e com as contas pagas.' },
  burnout: { title: 'Burnout', text: 'O estresse chegou a 10. O corpo cobrou antes do banco.' },
  demissao: { title: 'Demissão', text: 'Três advertências. O RH marcou uma conversa rápida.' },
  despejo: { title: 'Despejo', text: 'As contas de sexta não fecharam.' },
}

export default function JogarPage() {
  const [state, setState] = useState<GameState | null>(null)
  const [aberta, setAberta] = useState<CardInstance | null>(null)
  const [eventoAberto, setEventoAberto] = useState(false)
  const [sobreTapete, setSobreTapete] = useState(false)
  const tapete = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const salva = loadRun<GameState>()
    if (salva) {
      setState(salva)
      return
    }
    // a run nova precisa ser salva já: sem isso, recarregar a página antes da
    // primeira jogada sorteava outra run
    const nova = createRun(loadCollection().equipped)
    saveRun(nova)
    setState(nova)
  }, [])

  function update(next: GameState) {
    saveRun(next)
    setState(next)
  }

  function recomecar() {
    clearRun()
    setAberta(null)
    update(createRun(loadCollection().equipped))
  }

  function jogar(uid: string) {
    if (!state) return
    setAberta(null)
    update(playCard(state, uid))
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
        <Recurso rot="Energia" valor={state.energy} tom={styles.energia} icone="energia" />
        <Recurso rot="Estresse" valor={`${state.stress}/${MAX_STRESS}`} tom={styles.estresse} icone="estresse" />
        <Recurso
          rot="Produt."
          valor={`${state.productivity}/${state.dailyQuota}`}
          tom={styles.produtividade}
          icone="produtividade"
        />
        <Recurso rot="Dinheiro" valor={`R$ ${state.money}`} tom={styles.dinheiro} icone="dinheiro" />
        <Recurso rot="Semana" valor={`${state.weekProductivity}/${week.weeklyGoal}`} icone="semana" />
        <Recurso rot="Advert." valor={`${state.warnings}/${MAX_WARNINGS}`} icone="advertencias" />
        <span className={styles.espaco} />
        <button type="button" className={`${buttons.button} ${buttons.ghost}`} onClick={recomecar}>
          Reiniciar run
        </button>
        {state.phase === 'dia' ? (
          <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={() => update(endDay(state))}>
            Encerrar o dia
          </button>
        ) : null}
      </div>

      <div className={styles.zonaEvento}>
        {evento ? (
          <Card
            card={evento}
            faceDown={esperandoEvento}
            className={styles.eventoCarta}
            onOpen={esperandoEvento ? () => update(revealEvent(state)) : () => setEventoAberto(true)}
          />
        ) : null}
        {esperandoEvento ? (
          <span className={`${styles.dicaEvento} ${styles.chamando}`}>Clique para revelar o dia</span>
        ) : (
          <span className={styles.dicaEvento}>Evento do dia · clique para ler</span>
        )}
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
          <div className={styles.jogadas}>
            {state.playedToday.map((id, i) => (
              <Card key={`${id}-${i}`} card={getCard(id)} className={styles.jogada} />
            ))}
          </div>
        )}
      </div>

      <Pilha area={styles.pilhaDeck} rotulo="Baralho" quantidade={state.deck.length} />

      <div className={styles.zonaMao}>
        {state.hand.length === 0 ? (
          <span className={styles.maoVazia}>{esperandoEvento ? 'Aguardando o evento' : 'Mão vazia'}</span>
        ) : (
          <>
            <span className={styles.statusMao}>
              Clique para ver a carta · clique duplo ou arraste até o tapete para jogar
            </span>
            <div className={styles.leque}>
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
                    disabled={!podeJogar}
                    onOpen={() => setAberta(instancia)}
                    onPlay={podeJogar ? () => jogar(instancia.uid) : undefined}
                    dropRef={tapete}
                    onDragOver={setSobreTapete}
                  />
                )
              })}
            </div>
          </>
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
            <h2 className={styles.painelTitulo}>Sexta-feira — hora da cobrança</h2>
            <p className={styles.painelTexto}>
              Produtividade da semana: {state.weekProductivity} de {week.weeklyGoal}. Depois do expediente vêm o
              salário, as contas de R$ 300 e o fim de semana.
            </p>
            <div className={styles.acoes}>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => update(resolveFriday(state))}
              >
                Bater o ponto
              </button>
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
              {state.rewardOptions.map((id) => (
                <Card
                  key={id}
                  card={getCard(id)}
                  className={styles.recompensa}
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
            <div className={styles.acoes}>
              <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={recomecar}>
                Nova run
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
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

function Recurso({
  rot,
  valor,
  tom,
  icone,
}: {
  rot: string
  valor: string | number
  tom?: string
  icone: keyof typeof RESOURCE_ICONS
}) {
  const Icon = RESOURCE_ICONS[icone]
  return (
    <span className={styles.res}>
      <Icon size={13} className={tom} aria-hidden />
      <span className={styles.resRot}>{rot}</span>
      <span className={`${styles.resVal} ${tom ?? ''}`}>{valor}</span>
    </span>
  )
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
