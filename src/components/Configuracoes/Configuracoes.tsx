'use client'

import { LogOut, Monitor, Moon, Music, Sparkles, Sun, Vibrate, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { tocar } from '@/data/efeitos'
import type { Volumes } from '@/data/som'
import { podeVibrar, vibrar } from '@/data/vibrar'
import { TEMAS, type Tema } from '@/data/tema'
import type { Sessao } from '@/game/session'
import buttons from '@/styles/buttons.module.sass'
import Avatar from '../Avatar'
import BotaoConfirmar from '../BotaoConfirmar'
import Dialogo from '../Dialogo'
import Interruptor from '../Interruptor'
import Segmentado from '../Segmentado'
import Slider from '../Slider'
import styles from './Configuracoes.module.sass'

type Aba = 'aparencia' | 'som' | 'conta'

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'som', rotulo: 'Som' },
  { valor: 'aparencia', rotulo: 'Aparência' },
  { valor: 'conta', rotulo: 'Conta' },
]

const ICONE_DO_TEMA: Record<Tema, React.ReactNode> = {
  claro: <Sun size={15} aria-hidden />,
  escuro: <Moon size={15} aria-hidden />,
  sistema: <Monitor size={15} aria-hidden />,
}

/**
 * As Configurações (v0.38), em três abas — Som, Aparência e Conta — com o
 * Sair FORA delas, no rodapé, ao lado do Fechar: quem abre as Configurações
 * para sair não pode ter que procurar em qual aba ele mora. Continua com o
 * segundo clique para confirmar (`BotaoConfirmar`), que é o que o protege
 * de um toque errado.
 *
 * O estado (volumes, tema) mora na barra lateral, que já o tinha: aqui é só
 * a tela. Ajuste de liga-e-desliga é `Interruptor`; a caixa de marcar ficou
 * para resposta de formulário.
 */
export default function Configuracoes({
  sessao,
  volumes,
  mudarVolume,
  tema,
  mudarTema,
  saindo,
  onSair,
  onFechar,
}: {
  sessao: Sessao
  volumes: Volumes
  mudarVolume: <C extends keyof Volumes>(campo: C, valor: Volumes[C]) => void
  tema: Tema
  mudarTema: (t: Tema) => void
  saindo: boolean
  onSair: () => void
  onFechar: () => void
}) {
  const [aba, setAba] = useState<Aba>('som')
  const [vibra] = useState(podeVibrar)

  return (
    <Dialogo
      titulo="Configurações"
      largo
      onFechar={onFechar}
      acoes={
        <div className={styles.rodape}>
          <BotaoConfirmar
            className={`${buttons.button} ${styles.sair}`}
            armado={sessao.convidado ? 'Confirmar: perder tudo e sair' : 'Confirmar saída'}
            desabilitado={saindo}
            onConfirmar={onSair}
          >
            <LogOut size={15} aria-hidden />
            {saindo ? 'Saindo…' : sessao.convidado ? 'Sair (e criar conta)' : 'Sair da conta'}
          </BotaoConfirmar>
          <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onFechar}>
            Fechar
          </button>
        </div>
      }
    >
      <Segmentado rotulo="Seção das configurações" valor={aba} onChange={setAba} opcoes={ABAS} className={styles.abas} />

      {aba === 'aparencia' ? (
        <section className={styles.secao}>
          <h3 className={styles.titulo}>Tema</h3>
          {/* um cartão por tema, com a mesa daquele tema desenhada: ver é
              mais rápido que ler "claro" e imaginar */}
          <div className={styles.temas} role="radiogroup" aria-label="Tema">
            {TEMAS.map((t) => (
              <button
                key={t.valor}
                type="button"
                role="radio"
                aria-checked={tema === t.valor}
                className={`${styles.tema} ${tema === t.valor ? styles.temaAtivo : ''}`}
                onClick={() => mudarTema(t.valor)}
              >
                <span className={`${styles.previa} ${styles[`previa_${t.valor}`]}`} aria-hidden>
                  <span className={styles.previaBarra} />
                  <span className={styles.previaCarta} />
                  <span className={styles.previaCarta} />
                  <span className={styles.previaBotao} />
                </span>
                <span className={styles.temaNome}>
                  {ICONE_DO_TEMA[t.valor]}
                  {t.rotulo}
                </span>
              </button>
            ))}
          </div>
          <p className={styles.dica}>
            &ldquo;Sistema&rdquo; acompanha o aparelho, inclusive quando ele troca sozinho de noite.
          </p>
        </section>
      ) : null}

      {aba === 'som' ? (
        <section className={styles.secao}>
          <div className={styles.cartao}>
            <Interruptor
              ligado={volumes.mudo}
              onChange={(v) => mudarVolume('mudo', v)}
              rotulo="Mudo"
              dica="Desliga tudo, e devolve o som do aparelho para o que estiver tocando."
              icone={<VolumeX size={18} />}
            />
            {/* só onde há o que tremer: no computador seria um ajuste que
                não faz nada */}
            {vibra ? (
              <Interruptor
                ligado={volumes.vibrar}
                onChange={(v) => {
                  mudarVolume('vibrar', v)
                  // ligar treme uma vez, para a pessoa saber como é
                  if (v) vibrar('abrir')
                }}
                rotulo="Vibração"
                dica="O celular treme junto com as jogadas e as recompensas. Vale com o mudo ligado."
                icone={<Vibrate size={18} />}
              />
            ) : null}
          </div>

          <h3 className={styles.titulo}>Volume</h3>
          <div className={`${styles.cartao} ${volumes.mudo ? styles.apagado : ''}`}>
            <Volume
              icone={<Volume2 size={18} />}
              rotulo="Geral"
              valor={volumes.geral}
              desabilitado={volumes.mudo}
              onChange={(v) => mudarVolume('geral', v)}
            />
            <Volume
              icone={<Music size={18} />}
              rotulo="Música"
              valor={volumes.musica}
              desabilitado={volumes.mudo}
              onChange={(v) => mudarVolume('musica', v)}
            />
            <Volume
              icone={<Sparkles size={18} />}
              rotulo="Efeitos"
              valor={volumes.efeitos}
              desabilitado={volumes.mudo}
              onChange={(v) => mudarVolume('efeitos', v)}
              // ouvir o volume escolhido, mas uma vez, ao soltar: tocando a
              // cada passo do arraste, era uma metralhadora
              onSoltar={() => tocar('carta')}
            />
          </div>

          <div className={styles.cartao}>
            <Interruptor
              ligado={volumes.baixaFora}
              onChange={(v) => mudarVolume('baixaFora', v)}
              rotulo="Música baixa fora do jogo"
              dica="Na mesa ela volta ao volume de cima."
              icone={<Music size={18} />}
              desabilitado={volumes.mudo}
            />
          </div>
        </section>
      ) : null}

      {aba === 'conta' ? (
        <section className={styles.secao}>
          {/* os dados da conta moravam no perfil — que é a página que os
              OUTROS veem. Aqui só você chega */}
          <div className={styles.quem}>
            <Avatar avatar={sessao.avatar} tamanho={56} />
            <div className={styles.quemTexto}>
              <span className={styles.nick}>{sessao.nick}</span>
              <span className={styles.selos}>
                <span className={styles.selo}>{sessao.convidado ? 'Convidado' : 'Conta própria'}</span>
                {sessao.admin ? <span className={`${styles.selo} ${styles.seloAdmin}`}>Admin</span> : null}
              </span>
            </div>
          </div>

          <dl className={`${styles.cartao} ${styles.dados}`}>
            {sessao.nome ? (
              <div>
                <dt>Nome</dt>
                <dd>{sessao.nome}</dd>
              </div>
            ) : null}
            {sessao.email ? (
              <div>
                <dt>E-mail</dt>
                <dd className={styles.mono}>{sessao.email}</dd>
              </div>
            ) : null}
            {sessao.convidado ? null : (
              <div>
                <dt>Pontos de feedback</dt>
                <dd className={styles.mono}>{sessao.pontos}</dd>
              </div>
            )}
          </dl>

          <p className={`${styles.dica} ${sessao.convidado ? styles.aviso : ''}`}>
            {sessao.convidado
              ? 'Você está sem conta: ao sair, a partida em andamento e as cartas ganhas ficam para trás, e não há como recuperá-las.'
              : 'Sua partida está salva no banco e volta quando você entrar de novo. Ao sair, só este navegador fica limpo.'}
          </p>
        </section>
      ) : null}
    </Dialogo>
  )
}

/** Uma linha de volume: o ícone, o nome e o número em cima, o slider embaixo. */
function Volume({
  icone,
  rotulo,
  valor,
  desabilitado,
  onChange,
  onSoltar,
}: {
  icone: React.ReactNode
  rotulo: string
  valor: number
  desabilitado: boolean
  onChange: (v: number) => void
  onSoltar?: () => void
}) {
  const pct = Math.round(valor * 100)
  return (
    <div className={styles.volume}>
      <div className={styles.volumeCabeca}>
        <span className={styles.volumeIcone} aria-hidden>{icone}</span>
        <span className={styles.volumeRotulo}>{rotulo}</span>
        <span className={styles.volumeValor}>{pct}%</span>
      </div>
      <Slider
        rotulo={`Volume: ${rotulo.toLowerCase()}`}
        valor={pct}
        desabilitado={desabilitado}
        onChange={(v) => onChange(v / 100)}
        onSoltar={onSoltar}
      />
    </div>
  )
}
