'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, CloudOff, Layers, Loader, ScrollText } from 'lucide-react'
import Avatar, { humorDoEstresse } from '@/components/Avatar'
import Card from '@/components/Card'
import CartasDaRun from '@/components/CartasDaRun'
import CurvaDeEstresse from '@/components/CurvaDeEstresse'
import Dialogo from '@/components/Dialogo'
import EscolherCarta from '@/components/EscolherCarta'
import { useFocoPreso } from '@/components/useFocoPreso'
import ComoJogar from '@/components/ComoJogar'
import CardDetail from '@/components/CardDetail'
import DescarteNaMesa from '@/components/DescarteNaMesa'
import HistoricoDaRun from '@/components/HistoricoDaRun'
import MensagemNaMesa from '@/components/MensagemNaMesa'
import Medidor from '@/components/Medidor'
import { RESOURCE_ICONS } from '@/components/icons'
import Link from 'next/link'
import { getCard, getEvent, tamanhoDoBaralho } from '@/game/catalogo'
import { regras } from '@/game/regras'
import {
  canPlay,
  chooseEventOption,
  chooseReward,
  comprarNaLoja,
  lojaAberta,
  motivoDaLoja,
  createRun,
  currentWeek,
  dayLabel,
  effectiveCost,
  endDay,
  escolherOpcao,
  escolherParaDescartar,
  payBills,
  paySalary,
  playCard,
  preverJogada,
  previsaoDeAmanha,
  restWeekend,
  revealEvent,
  skipReward,
} from '@/game/engine'
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
import { textoDaCondicao } from '@/game/textos'
import type { CardId, CardInstance, GameState } from '@/game/types'
import type { PrevisaoDeAmanha } from '@/game/engine'
import type { Consequencia } from '@/components/CardDetail'

const EnergiaIcone = RESOURCE_ICONS.energia
import buttons from '@/styles/buttons.module.sass'
import styles from './jogar.module.sass'

/** Os números saem das regras DA RUN, como o tutorial faz com as de hoje:
 *  escritos à mão ("chegou a 10", "três advertências"), eles mentiriam no dia
 *  em que o /lab/regras mudasse o modo. */
function textoDoFim(state: GameState): { title: string; text: string } {
  const m = state.modo
  switch (state.outcome) {
    case 'vitoria':
      return {
        title: 'Mês fechado',
        text: `${m.semanas.length} semanas, ainda empregado e com as contas pagas.`,
      }
    case 'burnout':
      return {
        title: 'Burnout',
        text: `O estresse chegou a ${m.estresseMaximo}. O corpo cobrou antes do banco.`,
      }
    case 'demissao':
      return {
        title: 'Demissão',
        text: `${m.advertenciasMaximas} advertências. O RH marcou uma conversa rápida.`,
      }
    default:
      return { title: 'Despejo', text: 'As contas de sexta não fecharam.' }
  }
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
  // o banco recusar o registro da run precisa aparecer na tela, com a
  // mensagem do Postgres junto: engolir isso foi o bug de "joguei até o fim e
  // não salvou", e no iPhone não há console para ler o motivo
  const [registroFalhou, setRegistroFalhou] = useState<string | null>(null)
  // as regras saíram da barra lateral e vieram para a mesa: é aqui que a
  // dúvida aparece, e no meio da partida abrir o menu para consultá-las é
  // atravessar o jogo inteiro
  const [tutorial, setTutorial] = useState(false)
  const [historico, setHistorico] = useState(false)
  const [baralhoCurto, setBaralhoCurto] = useState<{ tem: number; minimo: number } | null>(null)
  const [confirmarFim, setConfirmarFim] = useState(false)
  const [vendoCartas, setVendoCartas] = useState(false)
  const [recompensaAberta, setRecompensaAberta] = useState<CardId | null>(null)
  // o item da loja que tira carta, esperando o jogador apontar qual
  const [cortando, setCortando] = useState<string | null>(null)
  // a carta em foco (mouse por cima, arraste, teclado) ou a aberta no
  // detalhe — no toque não existe "por cima", e o detalhe é onde se decide
  const [previaUid, setPreviaUid] = useState<string | null>(null)
  const focoDaPrevia = previaUid ?? aberta?.uid ?? null
  const previa = useMemo(
    () => (state && focoDaPrevia ? preverJogada(state, focoDaPrevia) : null),
    [state, focoDaPrevia],
  )
  const amanha = useMemo(() => (state ? previsaoDeAmanha(state) : null), [state])
  const amanhaComPrevia = useMemo(() => (previa ? previsaoDeAmanha(previa.depois) : null), [previa])
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
        const nova = comecarRun(collection.equipped)
        if (!nova) return
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

  /**
   * A run só começa com o baralho no mínimo do modo. Antes não havia mínimo
   * nenhum: dava para começar com o baralho vazio (o dia não comprava nada e
   * a cota perdida matava em uma semana) e, no outro extremo, tirar as cartas
   * ruins até sobrar só o que presta dava 100% de vitória nas simulações.
   * A tela do baralho já recusa a carta que passaria do limite; isto aqui
   * pega a coleção que chegou abaixo dele por outro caminho (uma de antes do
   * mínimo existir, um modo novo com mínimo maior).
   */
  function comecarRun(equipped: CardId[]): GameState | null {
    const tem = tamanhoDoBaralho(equipped)
    const minimo = regras().baralhoMinimo
    if (tem < minimo) {
      setBaralhoCurto({ tem, minimo })
      return null
    }
    setBaralhoCurto(null)
    return createRun(equipped)
  }

  function update(next: GameState) {
    setState(next)
    sincronizar(sessao.id, next, loadCollection(), setStatus)
    // a run terminada vai para o banco na hora, fora do timer do sincronizar:
    // o timer é cancelado por qualquer jogada seguinte, e era assim que uma
    // derrota sumia se o jogador clicasse em "nova run" rápido demais
    if (next.outcome !== 'jogando') {
      void registrarRunAgora(sessao.id, next, next.outcome, sessao.convidado).then(setRegistroFalhou)
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
      void registrarRunAgora(sessao.id, state, 'abandono', sessao.convidado, guardar)
    }
    clearRun()
    setAberta(null)
    const collection = loadCollection()
    const nova = comecarRun(collection.equipped)
    if (nova) {
      update(nova)
      return
    }
    // a run velha já foi largada: sem uma nova, o save fica sem run até o
    // baralho voltar ao mínimo
    setState(null)
    sincronizar(sessao.id, null, collection, setStatus)
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

  /**
   * Fechar o dia sem bater a cota custa estresse, e o botão ficava a um
   * clique distraído disso. Só pergunta quando ainda há o que fazer — cota
   * aberta E carta jogável na mão: sem carta jogável não existe escolha, e
   * perguntar seria só atrito.
   */
  function pedirFimDoDia() {
    if (!state) return
    const faltaCota = state.productivity < state.dailyQuota
    const temJogada = state.hand.some((c) => canPlay(state, c))
    if (faltaCota && temJogada) {
      setConfirmarFim(true)
      return
    }
    update(endDay(state))
  }

  function escolherRecompensa(id: CardId) {
    if (!state) return
    setRecompensaAberta(null)
    unlockCard(id)
    update(chooseReward(state, id))
  }

  /** A resposta do jogador ao pedido de descarte de uma carta ou evento. */
  function escolherDescarte(uid: string) {
    if (!state) return
    setAberta(null)
    update(escolherParaDescartar(state, uid))
  }

  if (falha) {
    return (
      <main className={styles.mesa}>
        <PainelDaMesa rotulo="Não deu para carregar">
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
        </PainelDaMesa>
      </main>
    )
  }

  if (baralhoCurto) {
    return (
      <main className={styles.mesa}>
        <PainelDaMesa rotulo="Baralho curto demais">
            <h2 className={styles.painelTitulo}>Baralho curto demais</h2>
            <p className={styles.painelTexto}>
              Seu baralho tem {baralhoCurto.tem} cartas e uma run precisa de pelo menos{' '}
              {baralhoCurto.minimo}. Equipe mais {baralhoCurto.minimo - baralhoCurto.tem} para
              começar.
            </p>
            <div className={styles.acoes}>
              <Link className={`${buttons.button} ${buttons.primary}`} href="/baralho">
                Montar o baralho
              </Link>
            </div>
        </PainelDaMesa>
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
  const escolhendo = state.escolhaDeDescarte
  // `weekProductivity` só recebe o dia no `endDay`, e o medidor mostrava a
  // semana SEM o que já foi feito hoje: o jogador batia a meta e o número
  // dizia que faltava. Na sexta o dia já foi somado, e somar de novo dobraria
  const diaEmAndamento = state.phase === 'dia' || state.phase === 'evento'
  const semanaComHoje = state.weekProductivity + (diaEmAndamento ? state.productivity : 0)

  return (
    <main className={`${styles.mesa} ${sobreTapete ? styles.arrastando : ''}`}>
      <div className={styles.hud}>
        <span className={styles.dia}>{acabou ? 'Run encerrada' : dayLabel(state)}</span>
        <div className={styles.medidores}>
          <Medidor
            icon={RESOURCE_ICONS.energia}
            nome="Energia"
            descricao={`Reinicia todo dia em ${state.modo.energiaBase} menos o estresse. É o que você gasta para jogar cartas.`}
            valor={state.energy}
            tom={styles.energia}
            previa={previa?.depois.energy}
            previaIncerta={previa?.incerta}
          />
          <Medidor
            icon={RESOURCE_ICONS.estresse}
            nome="Estresse"
            descricao={`Acumula entre os dias e encolhe a energia de amanhã. Chegou a ${state.modo.estresseMaximo}, é burnout.`}
            valor={state.stress}
            total={state.modo.estresseMaximo}
            tom={styles.estresse}
            subirEhRuim
            previa={previa?.depois.stress}
            previaIncerta={previa?.incerta}
          />
          <Medidor
            icon={RESOURCE_ICONS.produtividade}
            nome="Produtividade"
            descricao={`Zera todo dia. Não bater a cota custa +${state.modo.penalidadeDaCota} de estresse.`}
            valor={state.productivity}
            total={state.dailyQuota}
            tom={styles.produtividade}
            previa={previa?.depois.productivity}
            previaIncerta={previa?.incerta}
          />
          <Medidor
            icon={RESOURCE_ICONS.dinheiro}
            nome="Dinheiro"
            descricao="Entra pelo salário, hora extra e freela. Sai nas contas de sexta. É a pontuação final."
            valor={state.money}
            prefixo="R$ "
            tom={styles.dinheiro}
            previa={previa?.depois.money}
            previaIncerta={previa?.incerta}
          />
          <Medidor
            icon={RESOURCE_ICONS.semana}
            nome="Meta da semana"
            descricao={`Soma da produtividade dos ${state.modo.diasPorSemana} dias, já contando a de hoje. Não bater significa salário reduzido e advertência.`}
            valor={semanaComHoje}
            total={week.weeklyGoal}
            previa={previa ? previa.depois.weekProductivity + previa.depois.productivity : undefined}
            previaIncerta={previa?.incerta}
          />
          <Medidor
            icon={RESOURCE_ICONS.advertencias}
            nome="Advertências"
            descricao={`Chegou a ${state.modo.advertenciasMaximas}, é demissão.`}
            valor={state.warnings}
            total={state.modo.advertenciasMaximas}
            subirEhRuim
            previa={previa?.depois.warnings}
          />
        </div>
        <span className={styles.espaco} />
        <span className={`${styles.sync} ${status === 'erro' ? styles.syncErro : ''}`}>
          {/* o medidor de estresse com CARA: ele cansa junto com o jogador.
              A conta "Energia = 10 − Estresse" é o jogo inteiro, e antes dele
              ela só existia em texto */}
          <Avatar
            avatar={sessao.avatar}
            tamanho={28}
            className={styles.avatarHud}
            humor={humorDoEstresse(state.stress, state.modo.estresseMaximo)}
          />
          <span className={styles.nick}>{sessao.nick}</span>
          {status === 'salvando' ? (
            <Loader size={13} className={styles.girando} aria-label="salvando" />
          ) : null}
          {status === 'salvo' ? <Check size={13} aria-label="salvo" /> : null}
          {status === 'erro' ? <CloudOff size={13} aria-label="sem conexão" /> : null}
        </span>
        {/* os dois moram num invólucro: o "Como jogar" estava preso sozinho
            em `left: 10px`, e um segundo botão exigiria um `left` calculado à
            mão que quebraria no primeiro ajuste de padding */}
        <div className={styles.cantoEsquerdo}>
          <button
            type="button"
            className={styles.botaoCanto}
            onClick={() => setTutorial(true)}
            aria-label="Como jogar"
            title="Como jogar"
          >
            <BookOpen size={15} aria-hidden />
            <span className={styles.rotuloCanto}>Como jogar</span>
          </button>
          {/* aparece em TODA fase, inclusive depois da derrota: é justamente
              aí que se quer ler o que aconteceu */}
          <button
            type="button"
            className={styles.botaoCanto}
            onClick={() => setHistorico(true)}
            aria-label="Histórico da run"
            title="Histórico da run"
          >
            <ScrollText size={15} aria-hidden />
            <span className={styles.rotuloCanto}>Histórico</span>
          </button>
          {/* no celular as pilhas saem da mesa; o que elas guardam continua
              acessível por aqui */}
          <button
            type="button"
            className={`${styles.botaoCanto} ${styles.soCelular}`}
            onClick={() => setVendoCartas(true)}
            aria-label="Baralho e descarte"
            title="Baralho e descarte"
          >
            <Layers size={15} aria-hidden />
          </button>
        </div>

        {state.phase === 'dia' ? (
          <button
            type="button"
            className={`${buttons.button} ${buttons.primary} ${styles.proximoDia}`}
            // o dia não fecha por cima de uma pergunta em aberto; o motor
            // recusa de qualquer jeito, e o botão apagado explica por quê
            disabled={Boolean(escolhendo) || Boolean(state.escolhaAberta)}
            onClick={pedirFimDoDia}
            title={amanha ? textoDeAmanha(amanha, state) : undefined}
          >
            <span className={styles.rotuloLongo}>Próximo dia</span>
            <span className={styles.rotuloCurto}>Próx. dia</span>
            {/* a energia com que amanhã começa, se o dia fechar agora. É a
                conta "base − estresse" que sustenta o jogo, feita em voz
                alta — e com uma carta em foco, como ela mudaria */}
            {amanha ? (
              <span className={styles.amanha} aria-label={textoDeAmanha(amanha, state)}>
                <EnergiaIcone size={12} aria-hidden />
                {amanha.desfecho === 'jogando' ? amanha.energia : '✕'}
                {amanhaComPrevia && amanhaComPrevia.energia !== amanha.energia ? (
                  <span className={amanhaComPrevia.energia < amanha.energia ? styles.amanhaPior : styles.amanhaMelhor}>
                    →{amanhaComPrevia.desfecho === 'jogando' ? amanhaComPrevia.energia : '✕'}
                  </span>
                ) : null}
              </span>
            ) : null}
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
        <DescarteNaMesa descarte={state.ultimoDescarte} />
        <MensagemNaMesa mensagem={state.ultimaMensagem} />

        {state.escolhaAberta ? (
          <div className={styles.pedido} role="status">
            <b>{state.escolhaAberta.cartaId ? getCard(state.escolhaAberta.cartaId).name : 'Escolha'}</b>
            <div className={styles.escolhasDaCarta}>
              {state.escolhaAberta.opcoes.map((o, i) => (
                <button
                  key={o.rotulo || i}
                  type="button"
                  className={buttons.button}
                  onClick={() => update(escolherOpcao(state, i))}
                >
                  {o.rotulo || `Opção ${i + 1}`}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {escolhendo ? (
          <div className={styles.pedido} role="status">
            <b>{escolhendo.porque}</b>
            <span>
              Escolha {escolhendo.restam === 1 ? '1 carta' : `${escolhendo.restam} cartas`} da sua
              mão para descartar.
            </span>
          </div>
        ) : null}

        {state.streakKind && state.streakCount >= 1 ? (
          <span
            key={`${state.streakKind}-${state.streakCount}`}
            className={`${styles.embalo} ${state.streakCount >= 2 ? styles.embaloAtivo : ''}`}
          >
            {state.streakCount >= 2
              ? state.lastCombo
              : `Outra de ${state.streakKind}: +${state.streakKind === 'grana' ? `R$ ${state.modo.embaloSegunda * state.modo.embaloReaisPorPonto}` : `${state.modo.embaloSegunda} ${CLASSES[state.streakKind]}`}`}
          </span>
        ) : null}
      </div>

      <Pilha
        area={styles.pilhaDeck}
        rotulo="Baralho"
        quantidade={state.deck.length}
        onAbrir={() => setVendoCartas(true)}
      />

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
                // com uma escolha de descarte em pé, a mão inteira vira
                // seletor: o clique simples deixa de abrir o detalhe e passa
                // a ser a resposta. Sem essa troca o jogador clicaria na
                // carta esperando escolher e leria o texto dela
                // a carta NÃO é embrulhada num div: o leque posiciona os
                // filhos diretos a partir de `--carta-w`, que mora na própria
                // carta. Um invólucro no meio come a sobreposição e o arco
                if (escolhendo) {
                  return (
                    <Card
                      key={instancia.uid}
                      card={carta}
                      cost={effectiveCost(state, carta.id)}
                      rotation={(i - meio) * 5}
                      lift={Math.abs(i - meio) * 7}
                      style={{ '--i': i } as React.CSSProperties}
                      className={styles.escolhivel}
                      onOpen={() => escolherDescarte(instancia.uid)}
                    />
                  )
                }
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
                    onPrevia={(ativa) =>
                      setPreviaUid((atual) =>
                        ativa ? instancia.uid : atual === instancia.uid ? null : atual,
                      )
                    }
                  />
                )
              })}
          </div>
        )}
      </div>

      <Pilha
        area={styles.pilhaDesc}
        rotulo="Descarte"
        quantidade={state.discard.length}
        onAbrir={() => setVendoCartas(true)}
      />

      {eventoAberto && evento ? <CardDetail card={evento} onClose={() => setEventoAberto(false)} /> : null}

      {aberta ? (
        <CardDetail
          card={getCard(aberta.cardId)}
          cost={effectiveCost(state, aberta.cardId)}
          onClose={() => setAberta(null)}
          onPlay={canPlay(state, aberta) ? () => jogar(aberta.uid) : undefined}
          blockedReason={canPlay(state, aberta) ? undefined : motivoBloqueio(state, aberta)}
          consequencias={previa ? consequenciasDe(state, previa.depois, amanha, amanhaComPrevia) : undefined}
          incerta={previa?.incerta}
        />
      ) : null}

      {state.phase === 'sexta' ? (
        <PainelDaMesa rotulo="Sexta-feira">
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
                  <span className={`${styles.passoVal} ${styles.saida}`}>−R$ {state.modo.contasSemanais}</span>
                </li>
              ) : null}
            </ol>

            <p className={styles.painelTexto}>{textoDaSexta(state)}</p>

            {lojaAberta(state) ? (
              <section className={styles.loja} aria-label="Lojinha do fim de semana">
                <h3 className={styles.lojaTitulo}>O que fazer com o dinheiro</h3>
                <p className={styles.lojaNota}>
                  Cada compra sai da pontuação final — e o aluguel da próxima sexta continua
                  sendo R$ {state.modo.contasSemanais}.
                </p>
                <ul className={styles.lojaItens}>
                  {state.modo.loja.map((item) => {
                    const motivo = motivoDaLoja(state, item.id)
                    const comprado = state.compradosNaSemana.includes(item.id)
                    return (
                      <li key={item.id} className={`${styles.lojaItem} ${comprado ? styles.lojaComprado : ''}`}>
                        <span className={styles.lojaNome}>
                          <b>{item.nome}</b>
                          <span>{item.texto}</span>
                        </span>
                        <span className={styles.lojaPreco}>R$ {item.preco}</span>
                        <button
                          type="button"
                          className={buttons.button}
                          disabled={motivo !== null}
                          title={motivo ?? undefined}
                          onClick={() =>
                            item.cortarCarta ? setCortando(item.id) : update(comprarNaLoja(state, item.id))
                          }
                        >
                          {comprado ? 'Feito' : 'Comprar'}
                        </button>
                        {motivo && !comprado ? <span className={styles.lojaMotivo}>{motivo}</span> : null}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

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
        </PainelDaMesa>
      ) : null}

      {state.phase === 'recompensa' ? (
        <PainelDaMesa rotulo="Recompensa da semana">
            <h2 className={styles.painelTitulo}>Recompensa da semana</h2>
            <p className={styles.painelTexto}>
              Toque numa carta para ler e escolher. Ela entra no baralho desta run e fica na sua
              coleção — ou siga sem nenhuma.
            </p>
            {/* o clique abre o detalhe em vez de escolher: na mesa o clique
                simples é LER, e aqui ele era uma escolha irreversível, feita
                sem dar para ler a carta inteira */}
            <div className={styles.recompensas}>
              {state.rewardOptions.map((id, i) => (
                <Card
                  key={id}
                  card={getCard(id)}
                  className={styles.recompensa}
                  style={{ '--i': i } as React.CSSProperties}
                  onOpen={() => setRecompensaAberta(id)}
                />
              ))}
            </div>
            <div className={styles.acoes}>
              <button type="button" className={buttons.button} onClick={() => update(skipReward(state))}>
                Seguir sem carta nova
              </button>
            </div>
        </PainelDaMesa>
      ) : null}

      {recompensaAberta && state.phase === 'recompensa' ? (
        <CardDetail
          card={getCard(recompensaAberta)}
          onClose={() => setRecompensaAberta(null)}
          onPlay={() => escolherRecompensa(recompensaAberta)}
          rotuloAcao="Escolher esta carta"
        />
      ) : null}

      {confirmarFim && state.phase === 'dia' ? (
        <Dialogo
          titulo="Encerrar sem bater a cota?"
          onFechar={() => setConfirmarFim(false)}
          acoes={
            <>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => setConfirmarFim(false)}
              >
                Continuar jogando
              </button>
              <button
                type="button"
                className={buttons.button}
                onClick={() => {
                  setConfirmarFim(false)
                  update(endDay(state))
                }}
              >
                Encerrar o dia
              </button>
            </>
          }
        >
          <p className={styles.painelTexto}>
            A produtividade está em <b>{state.productivity}/{state.dailyQuota}</b>. Fechar agora
            custa <b>+{state.modo.penalidadeDaCota} de estresse</b> — e ainda há carta na mão que
            dá para jogar.
          </p>
          {amanha ? <p className={styles.painelTexto}>{textoDeAmanha(amanha, state)}</p> : null}
        </Dialogo>
      ) : null}

      {cortando && lojaAberta(state) ? (
        <EscolherCarta
          titulo="Qual carta sai?"
          explicacao={`Uma cópia dela sai do baralho desta run — a sua coleção não muda. O baralho não pode ficar abaixo de ${state.modo.baralhoMinimo}.`}
          cartas={[...state.deck, ...state.discard]}
          onFechar={() => setCortando(null)}
          aoEscolher={(id) => {
            const item = cortando
            setCortando(null)
            update(comprarNaLoja(state, item, id))
          }}
        />
      ) : null}

      {vendoCartas ? (
        <CartasDaRun baralho={state.deck} descarte={state.discard} onFechar={() => setVendoCartas(false)} />
      ) : null}

      {acabou ? (
        <PainelDaMesa rotulo="Fim da run">
            <Avatar
              avatar={sessao.avatar}
              tamanho={88}
              className={styles.avatarFim}
              humor={state.outcome === 'vitoria' ? 'vitoria' : humorDoEstresse(state.stress, state.modo.estresseMaximo)}
            />
            <h2 className={styles.painelTitulo}>{textoDoFim(state).title}</h2>
            <p className={styles.painelTexto}>
              {textoDoFim(state).text} Pontuação final: R$ {state.money}.
            </p>
            {/* a run inteira numa linha: é o "por quê" da derrota, que o
                texto acima não tem como contar */}
            {state.history.length > 1 ? (
              <CurvaDeEstresse
                titulo="Seu estresse ao fim de cada dia"
                pontos={state.history.map((d) => ({ dia: d.day, valor: d.stress }))}
                maximo={state.modo.estresseMaximo}
                diasPorSemana={state.modo.diasPorSemana}
                altura={120}
              />
            ) : null}
            {registroFalhou ? (
              <div className={styles.painelAviso}>
                <p>
                  Esta partida não chegou ao banco. Ela ficou guardada aqui e sobe sozinha da
                  próxima vez que você abrir a mesa.
                </p>
                <p className={styles.painelMotivo}>{registroFalhou}</p>
              </div>
            ) : null}
            <div className={styles.acoes}>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => recomecar()}
              >
                Nova run
              </button>
              {/* o botão Histórico do canto fica DEBAIXO deste painel — e é
                  justamente agora que se quer ler o que aconteceu. O Dialogo
                  do histórico abre por cima do painel */}
              <button type="button" className={buttons.button} onClick={() => setHistorico(true)}>
                Ver o que aconteceu
              </button>
            </div>
        </PainelDaMesa>
      ) : null}
      {tutorial ? <ComoJogar onFechar={() => setTutorial(false)} /> : null}
      {historico ? <HistoricoDaRun state={state} onFechar={() => setHistorico(false)} /> : null}
    </main>
  )
}

/** A frase da energia de amanhã — a mesma no botão, na dica e no aviso. */
function textoDeAmanha(a: PrevisaoDeAmanha, state: GameState): string {
  if (a.desfecho === 'burnout') return 'Fechar o dia agora leva ao burnout.'
  if (a.desfecho !== 'jogando') return 'Fechar o dia agora encerra a run.'
  const conta = `${state.modo.energiaBase} − ${a.estresse} de estresse`
  return a.fimDeSemana
    ? `Se encerrar agora, segunda começa com ${a.energia} de energia (${conta}, já com o fim de semana).`
    : `Se encerrar agora, amanhã começa com ${a.energia} de energia (${conta}).`
}

/** O que a carta aberta mudaria, para o detalhe mostrar antes do "Jogar". */
function consequenciasDe(
  antes: GameState,
  depois: GameState,
  amanha: PrevisaoDeAmanha | null,
  amanhaDepois: PrevisaoDeAmanha | null,
): Consequencia[] {
  const linhas: Consequencia[] = [
    { rotulo: 'Energia', de: antes.energy, para: depois.energy },
    { rotulo: 'Estresse', de: antes.stress, para: depois.stress, subirEhRuim: true },
    { rotulo: 'Produtividade', de: antes.productivity, para: depois.productivity },
    { rotulo: 'Dinheiro', de: antes.money, para: depois.money },
    { rotulo: 'Advertências', de: antes.warnings, para: depois.warnings, subirEhRuim: true },
  ]
  if (amanha && amanhaDepois && amanha.desfecho === 'jogando') {
    linhas.push({
      rotulo: amanha.fimDeSemana ? 'Energia na segunda' : 'Energia amanhã',
      de: amanha.energia,
      para: amanhaDepois.desfecho === 'jogando' ? amanhaDepois.energia : 0,
    })
  }
  return linhas.filter((l) => l.de !== l.para)
}

function textoDaSexta(state: GameState): string {
  if (state.fridayStep === 'salario') return `O chefe soma a produtividade dos ${state.modo.diasPorSemana} dias antes de liberar o pagamento.`
  if (state.fridayStep === 'contas') return `Salário na conta. Agora o aluguel e o mercado: R$ ${state.modo.contasSemanais}. Você tem R$ ${state.money}.`
  return `Sobraram R$ ${state.money}. O fim de semana tira ${state.modo.descansoDoFimDeSemana} de estresse antes da próxima segunda.`
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
  if (state.escolhaDeDescarte) return 'Primeiro escolha o que descartar.'
  if (state.escolhaAberta) return 'Primeiro responda a pergunta da carta.'
  if (carta.kind !== null && state.blockedKinds.includes(carta.kind)) {
    return `O evento de hoje bloqueia cartas de ${carta.kind}.`
  }
  // a restrição é da CARTA, não do motor: citar "puxar-o-saco" pelo id aqui
  // deixaria de valer no dia em que a carta mudasse de nome no /lab/cartas
  if (carta.restricao?.umaVezPorRun && state.usadasNaRun.includes(carta.id)) {
    return 'Esta carta só sai uma vez por run, e já saiu.'
  }
  // a frase vem do MOTOR (`textoDaCondicao`), a mesma que o lab mostra ao
  // montar a condição: "as condições desta carta ainda não aconteceram" não
  // dizia qual condição, e a carta travada virava um mistério
  if (carta.restricao?.exige) {
    return `Esta carta pede: ${textoDaCondicao(carta.restricao.exige)}.`
  }
  return `Energia insuficiente: custa ${effectiveCost(state, carta.id)} e você tem ${state.energy}.`
}

function Pilha({ area, rotulo, quantidade, onAbrir }: {
  area: string
  rotulo: string
  quantidade: number
  onAbrir: () => void
}) {
  return (
    <button
      type="button"
      className={`${styles.pilha} ${area}`}
      onClick={onAbrir}
      aria-label={`${rotulo}: ${quantidade} cartas. Ver quais são.`}
      title={`Ver o que tem no ${rotulo.toLowerCase()}`}
    >
      <span className={`${styles.monte} ${quantidade === 0 ? styles.vazia : ''}`}>
        <span className={`${styles.lastro} ${styles.lastro1}`} />
        <span className={`${styles.lastro} ${styles.lastro2}`} />
        <span className={styles.topo}>
          <span className={styles.qtd}>{quantidade}</span>
        </span>
      </span>
      <span className={styles.rotPilha}>{rotulo}</span>
    </button>
  )
}

/**
 * Os painéis da própria mesa — sexta, recompensa, fim de run, erro — são
 * modais como qualquer popup: cobrem a mesa e esperam uma resposta. Mas não
 * eram o `Dialogo`, e o foco do teclado escapava para os botões da mesa atrás
 * da cortina. O foco preso é o mesmo do `Dialogo`.
 */
function PainelDaMesa({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  const painel = useRef<HTMLDivElement>(null)
  useFocoPreso(painel)
  return (
    <div className={styles.fundo}>
      <div
        ref={painel}
        className={styles.painel}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  )
}
