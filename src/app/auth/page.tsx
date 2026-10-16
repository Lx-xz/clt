'use client'

import { ArrowLeft, BookOpen, LogIn, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Check from '@/components/Check'
import ComoJogar from '@/components/ComoJogar'
import Segmentado from '@/components/Segmentado'
import Dialogo from '@/components/Dialogo'
import ListaDeContas from '@/components/ListaDeContas'
import { GoogleIcon } from '@/components/icons'
import Termos from '@/components/Termos'
import { validarNick } from '@/data/nick'
import {
  aoMudarConta,
  cadastrar,
  completarPerfil,
  entrar,
  entrarComGoogle,
  entrarComoConvidado,
  lerConta,
  recuperarSenha,
  sair,
  type Conta,
} from '@/data/conta'
import {
  concluirTroca,
  contasSalvas,
  esquecerConta,
  prepararTroca,
  recomecarSite,
  trocarDeConta,
  type ContaSalva,
} from '@/data/contasSalvas'
import { bancoConfigurado } from '@/data/supabase'
import { cancelarSync } from '@/data/sync'
import { limparLocalDoJogo } from '@/game/storage'
import buttons from '@/styles/buttons.module.sass'
import styles from './page.module.sass'

type Aba = 'entrar' | 'criar'

export default function Entrada() {
  const router = useRouter()
  const [conta, setConta] = useState<Conta | null>(null)
  const [aba, setAba] = useState<Aba>('entrar')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)
  const [tutorial, setTutorial] = useState(false)
  const [avisoConvidado, setAvisoConvidado] = useState(false)
  // as contas que já entraram neste aparelho: com alguma, a porta mostra os
  // perfis (como o YouTube) em vez do formulário
  const [contas, setContas] = useState<ContaSalva[]>([])
  const [escolhendo, setEscolhendo] = useState(true)
  const [editando, setEditando] = useState(false)
  // `/auth?adicionar` é "entrar com OUTRA conta" sem sair desta: a porta não
  // manda de volta para o início quem já está dentro
  const [adicionando, setAdicionando] = useState(false)

  useEffect(() => {
    setContas(contasSalvas())
    setAdicionando(new URLSearchParams(window.location.search).has('adicionar'))
  }, [])

  // campos — um só conjunto para as duas abas e para o "completar cadastro"
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [nick, setNick] = useState('')
  const [termos, setTermos] = useState(false)
  const [vendoTermos, setVendoTermos] = useState(false)

  const recarregar = useCallback(() => {
    lerConta()
      .then(setConta)
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : 'Não deu para falar com o banco.')
        setConta({ tipo: 'fora' })
      })
  }, [])

  // quem chega do Google já trouxe o nome de lá: aparece preenchido em vez
  // de o visitante ter que digitar o que o Google acabou de informar
  useEffect(() => {
    if (conta?.tipo === 'incompleto' && conta.perfil.nome) {
      setNome((atual) => atual || conta.perfil.nome || '')
    }
  }, [conta])

  useEffect(() => {
    recarregar()
    // o Google devolve o visitante para cá com o token no endereço: quando a
    // supabase-js termina de transformar aquilo em sessão, isto dispara
    return aoMudarConta(recarregar)
  }, [recarregar])

  async function tentar(acao: () => Promise<void>) {
    setErro(null)
    setRecado(null)
    setOcupado(true)
    try {
      await acao()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu certo.')
    } finally {
      setOcupado(false)
    }
  }

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!bancoConfigurado) {
      setErro('O banco ainda não está configurado neste site.')
      return
    }
    if (aba === 'entrar') {
      setErro(null)
      setRecado(null)
      setOcupado(true)
      entrarAgora(() => entrar(email, senha))
        .catch((falha: unknown) => {
          // errou, fica em "Entrar": era o caso comum (a senha), e mandar
          // para o cadastro cada errinho de digitação levava gente que já
          // tinha conta a tentar criar outra. O Supabase não diz se a conta
          // não existe ou se a senha está errada — de propósito —, então o
          // recado diz as duas, e a criação fica a um toque
          setErro(falha instanceof Error ? falha.message : 'Não deu certo.')
        })
        .finally(() => setOcupado(false))
      return
    }

    const problema = validarNick(nick)
    if (problema) {
      setErro(problema)
      return
    }
    if (nome.trim().length < 3) {
      setErro('Escreva seu nome completo.')
      return
    }
    if (!termos) {
      setErro('É preciso aceitar os termos de uso.')
      return
    }
    void tentar(async () => {
      // sem avatar: quem não escolheu é manequim, e escolher é uma visita ao
      // perfil. Perguntar o gênero para sortear um desenho era pedir um dado
      // pessoal para resolver um problema que o manequim já resolve.
      let precisaConfirmar = false
      await entrarAgora(async () => {
        ;({ precisaConfirmar } = await cadastrar({ email, senha, nome, nick }))
      })
      if (precisaConfirmar) {
        setRecado(
          'Conta criada. Confira a caixa de entrada de ' +
            email +
            ' e clique no link de confirmação para entrar.',
        )
        setAba('entrar')
      }
    })
  }

  /**
   * Entra (ou cadastra) e segue. Com outra conta já dentro (`adicionar`), o
   * que ela ainda não subiu sobe antes, e o espelho local dela é limpo
   * depois — e o site recomeça do zero, como na troca de conta.
   */
  async function entrarAgora(acao: () => Promise<void>) {
    const trocando = adicionando && dentro
    if (trocando) {
      const problema = await prepararTroca()
      if (problema) throw new Error(problema)
    }
    await acao()
    if (!trocando) return recarregar()
    const depois = await lerConta()
    // o cadastro que pede confirmação por e-mail não troca a sessão
    if (depois.tipo === 'conta' && conta && 'perfil' in conta && depois.perfil.id !== conta.perfil.id) {
      concluirTroca()
      recomecarSite()
    }
  }

  function escolherConta(c: ContaSalva) {
    void tentar(async () => {
      const r = await trocarDeConta(c.id)
      if (r.ok) return recomecarSite()
      if (r.precisaEntrar) {
        // a sessão guardada morreu: o formulário, já com quem é
        setEscolhendo(false)
        setAba('entrar')
        setEmail(c.email ?? c.nick)
        setContas(contasSalvas())
      }
      throw new Error(r.motivo)
    })
  }

  function sairDe(c: ContaSalva) {
    esquecerConta(c.id)
    const restantes = contasSalvas()
    setContas(restantes)
    if (restantes.length === 0) {
      setEditando(false)
      setEscolhendo(false)
    }
  }

  function completar(e: React.FormEvent) {
    e.preventDefault()
    const problema = validarNick(nick)
    if (problema) {
      setErro(problema)
      return
    }
    if (!termos) {
      setErro('É preciso aceitar os termos de uso.')
      return
    }
    void tentar(async () => {
      await completarPerfil(nick, nome, senha || undefined)
      recarregar()
    })
  }

  function comGoogle() {
    void tentar(async () => {
      if (adicionando && dentro) {
        const problema = await prepararTroca()
        if (problema) throw new Error(problema)
        // o Google sai do site e volta já com a outra conta
        concluirTroca()
      }
      await entrarComGoogle()
    })
  }

  function entrarConvidado() {
    setAvisoConvidado(false)
    void tentar(async () => {
      // convidado é outra identidade: o espelho local do jogo anterior não
      // pode vazar para dentro dele
      cancelarSync()
      limparLocalDoJogo()
      await entrarComoConvidado()
      recarregar()
    })
  }

  function trocar() {
    // trocar de conta zera o espelho local: o save de um jogador não pode
    // vazar para o próximo que entrar neste navegador
    void tentar(async () => {
      cancelarSync()
      limparLocalDoJogo()
      await sair()
      setEmail('')
      setSenha('')
      setNome('')
      setNick('')
      setTermos(false)
      setAba('entrar')
      recarregar()
    })
  }

  const dentro = conta?.tipo === 'conta' || conta?.tipo === 'convidado'

  // esta é só a PORTA: quem já entrou vai para o início, que tem a barra
  // lateral, o avatar e o último jogo. Antes a página era a porta e o
  // saguão ao mesmo tempo, e o saguão era um beco — sem barra, sem nada
  useEffect(() => {
    if (dentro && !adicionando) router.replace('/')
  }, [dentro, adicionando, router])

  // a porta mostra os perfis quando há contas guardadas e ninguém entrou; o
  // "adicionar" vai direto ao formulário
  const mostrarFormulario = conta?.tipo === 'fora' || (adicionando && dentro)
  const mostrarContas = mostrarFormulario && !adicionando && escolhendo && contas.length > 0

  return (
    <main className={styles.home}>
      {/* no computador a marca fica à esquerda e o que se faz aqui à direita;
          no celular as duas viram uma coluna só, na mesma ordem */}
      <div className={styles.marca}>
        <span className={styles.stamp}>Registro em carteira</span>
        <h1 className={styles.title}>
          CLT
          <br />
          Coffee, Labor
          <br />
          and Tears
        </h1>
        <p className={styles.sub}>Sobreviva ao mês. Depois a gente vê.</p>
      </div>

      <div className={styles.painel}>
      {conta === null ? <p className={styles.aviso}>Batendo o ponto…</p> : null}

      {dentro && !adicionando ? <p className={styles.aviso}>Entrando…</p> : null}

      {mostrarContas ? (
        <div className={styles.contas}>
          <div className={styles.contasTopo}>
            <h2>Escolha uma conta</h2>
            <button type="button" className={styles.trocar} onClick={() => setEditando((e) => !e)} disabled={ocupado}>
              {editando ? 'Pronto' : 'Editar'}
            </button>
          </div>
          <ListaDeContas
            contas={contas}
            editando={editando}
            ocupado={ocupado}
            onEscolher={escolherConta}
            onSair={sairDe}
            onAdicionar={() => {
              setEscolhendo(false)
              setEmail('')
              setErro(null)
            }}
          />
          {editando ? (
            <p className={styles.dica}>
              Sair tira a conta só deste aparelho. Para voltar a ela, é entrar com o e-mail ou o nick.
            </p>
          ) : null}
        </div>
      ) : null}

      {conta?.tipo === 'incompleto' ? (
        <form className={styles.forma} onSubmit={completar}>
          <p className={styles.aviso}>
            Falta pouco: sua conta <b>{conta.email}</b> ainda precisa de um nick para aparecer no
            ranking.
          </p>
          <input
            className={styles.campo}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="nome completo"
            autoComplete="name"
            aria-label="Nome completo"
          />
          <input
            className={styles.campo}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="nick (2 a 16 letras)"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={16}
            aria-label="Nick"
          />
          <input
            className={styles.campo}
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="senha (opcional)"
            autoComplete="new-password"
            aria-label="Senha"
          />
          <p className={styles.dica}>
            A senha só é necessária se você também quiser entrar sem o Google. Dá para deixar em
            branco.
          </p>
          <Check marcado={termos} onChange={setTermos}>
            Li e aceito os{' '}
            <button type="button" className={styles.linkTexto} onClick={() => setVendoTermos(true)}>
              termos de uso
            </button>
            .
          </Check>
          <button
            type="submit"
            className={`${buttons.button} ${buttons.primary} ${styles.largo}`}
            disabled={ocupado}
          >
            {ocupado ? 'Salvando…' : 'Terminar cadastro'}
          </button>
          <button type="button" className={styles.trocar} onClick={trocar} disabled={ocupado}>
            sair desta conta
          </button>
        </form>
      ) : null}

      {mostrarFormulario && !mostrarContas ? (
        <>
          {adicionando || contas.length > 0 ? (
            <button
              type="button"
              className={styles.voltarContas}
              onClick={() => (adicionando ? recomecarSite() : setEscolhendo(true))}
            >
              <ArrowLeft size={15} aria-hidden /> {adicionando ? 'Voltar ao jogo' : 'Contas deste aparelho'}
            </button>
          ) : null}
          {adicionando && dentro ? <p className={styles.aviso}>Entre com outra conta. A de agora fica guardada para trocar depois.</p> : null}
          <Segmentado
            className={styles.abas}
            rotulo="Entrar ou criar conta"
            valor={aba}
            onChange={(v) => {
              setAba(v)
              setErro(null)
            }}
            opcoes={[
              { valor: 'entrar', rotulo: 'Entrar' },
              { valor: 'criar', rotulo: 'Criar conta' },
            ]}
          />

          <form className={styles.forma} onSubmit={aoEnviar}>
            {aba === 'criar' ? (
              <>
                <input
                  className={styles.campo}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="nome completo"
                  autoComplete="name"
                  aria-label="Nome completo"
                  disabled={ocupado}
                />
                <input
                  className={styles.campo}
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="nick (2 a 16 letras)"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={16}
                  aria-label="Nick"
                  disabled={ocupado}
                />
              </>
            ) : null}
            {/* para entrar vale o e-mail OU o nick (`entrar` em conta.ts);
                para criar a conta, só o e-mail */}
            <input
              className={styles.campo}
              type={aba === 'criar' ? 'email' : 'text'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={aba === 'criar' ? 'e-mail' : 'e-mail ou nick'}
              autoComplete={aba === 'criar' ? 'email' : 'username'}
              autoCapitalize="none"
              spellCheck={false}
              aria-label={aba === 'criar' ? 'E-mail' : 'E-mail ou nick'}
              disabled={ocupado}
            />
            <input
              className={styles.campo}
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="senha"
              autoComplete={aba === 'criar' ? 'new-password' : 'current-password'}
              aria-label="Senha"
              disabled={ocupado}
            />
            {aba === 'criar' ? (
              <>
              <Check marcado={termos} onChange={setTermos}>
                Li e aceito os <Link href="/termos">termos de uso</Link>.
              </Check>
              </>
            ) : null}
            <button
              type="submit"
              className={`${buttons.button} ${buttons.primary} ${styles.largo}`}
              disabled={ocupado}
            >
              <LogIn size={16} aria-hidden />
              {ocupado ? 'Um instante…' : aba === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className={styles.outras}>
            <button
              type="button"
              className={`${buttons.button} ${styles.largo}`}
              disabled={ocupado}
              onClick={comGoogle}
            >
              <GoogleIcon size={18} />
              Entrar com o Google
            </button>
            {adicionando ? null : (
              <button
                type="button"
                className={`${buttons.button} ${buttons.ghost} ${styles.largo}`}
                disabled={ocupado}
                onClick={() => setAvisoConvidado(true)}
              >
                <UserRound size={16} aria-hidden />
                Jogar como convidado
              </button>
            )}
            {aba === 'entrar' ? (
              <button
                type="button"
                className={styles.trocar}
                disabled={ocupado || !email}
                onClick={() =>
                  void tentar(async () => {
                    // o link vai por e-mail: com o nick no campo não há para onde mandar
                    if (!email.includes('@')) throw new Error('Para receber o link de nova senha, escreva o e-mail.')
                    await recuperarSenha(email)
                    setRecado('Se existe conta com esse e-mail, o link de nova senha já foi.')
                  })
                }
              >
                esqueci a senha
              </button>
            ) : null}
          </div>

          <button type="button" className={styles.tutorial} onClick={() => setTutorial(true)}>
            <BookOpen size={20} aria-hidden />
            <span>
              <b>Como jogar</b>
              Regras, cartas e o que faz perder — em um minuto
            </span>
          </button>
        </>
      ) : null}

      {erro ? <p className={styles.erro}>{erro}</p> : null}
      {recado ? <p className={styles.recado}>{recado}</p> : null}

      </div>

      {vendoTermos ? (
        <Dialogo titulo="Termos de uso" largo onFechar={() => setVendoTermos(false)}>
          <Termos />
        </Dialogo>
      ) : null}

      {tutorial ? <ComoJogar onFechar={() => setTutorial(false)} /> : null}

      {avisoConvidado ? (
        <Dialogo
          titulo="Jogar sem conta?"
          onFechar={() => setAvisoConvidado(false)}
          acoes={
            <>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={() => {
                  setAvisoConvidado(false)
                  setAba('criar')
                }}
              >
                Criar conta (1 minuto)
              </button>
              <button type="button" className={buttons.button} onClick={entrarConvidado}>
                Entrar como convidado
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            Dá para jogar o jogo inteiro sem conta. Só que o progresso fica <b>neste navegador</b>:
          </p>
          <ul className={styles.listaAviso}>
            <li>
              ao sair, ou ao entrar de novo, <b>as partidas e as cartas ganhas se perdem</b>;
            </li>
            <li>nada disso acompanha você em outro aparelho;</li>
            <li>sem conta não dá para relatar bug, sugerir ideia nem acompanhar as respostas.</li>
          </ul>
          <p style={{ margin: 0 }}>
            Criar conta leva um minuto e mantém tudo — inclusive o lugar no ranking.
          </p>
        </Dialogo>
      ) : null}
    </main>
  )
}
