'use client'

import { BookOpen, LogIn, Layers, Play, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import ComoJogar from '@/components/ComoJogar'
import Dialogo from '@/components/Dialogo'
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
import { bancoConfigurado } from '@/data/supabase'
import { cancelarSync } from '@/data/sync'
import { limparLocalDoJogo } from '@/game/storage'
import buttons from '@/styles/buttons.module.sass'
import styles from './page.module.sass'

type Aba = 'entrar' | 'criar'

export default function Home() {
  const [conta, setConta] = useState<Conta | null>(null)
  const [aba, setAba] = useState<Aba>('entrar')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)
  const [tutorial, setTutorial] = useState(false)
  const [avisoConvidado, setAvisoConvidado] = useState(false)

  // campos — um só conjunto para as duas abas e para o "completar cadastro"
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [nick, setNick] = useState('')
  const [termos, setTermos] = useState(false)

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
      void tentar(async () => {
        await entrar(email, senha)
        recarregar()
      })
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
      const { precisaConfirmar } = await cadastrar({ email, senha, nome, nick })
      if (precisaConfirmar) {
        setRecado(
          'Conta criada. Confira a caixa de entrada de ' +
            email +
            ' e clique no link de confirmação para entrar.',
        )
        setAba('entrar')
        return
      }
      recarregar()
    })
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

  return (
    <main className={styles.home}>
      <span className={styles.stamp}>Registro em carteira</span>
      <h1 className={styles.title}>
        CLT
        <br />
        Coffee, Labor
        <br />
        and Tears
      </h1>
      <p className={styles.sub}>Sobreviva ao mês. Depois a gente vê.</p>

      {conta === null ? <p className={styles.aviso}>Batendo o ponto…</p> : null}

      {dentro && conta ? (
        <>
          <span className={styles.quem}>
            Jogando como <span className={styles.nick}>{conta.perfil.nick}</span>
            <button type="button" className={styles.trocar} onClick={trocar} disabled={ocupado}>
              {conta.perfil.convidado ? 'sair' : 'trocar de conta'}
            </button>
          </span>
          {conta.perfil.convidado ? (
            <p className={styles.avisoForte}>
              Você está como <b>convidado</b>. As partidas e as cartas ganhas ficam só neste
              navegador: ao sair, ou ao entrar de novo, <b>tudo isto se perde</b> — e sem conta não
              dá para relatar bug nem acompanhar o que foi corrigido.{' '}
              <button type="button" className={styles.trocar} onClick={trocar} disabled={ocupado}>
                criar uma conta
              </button>
            </p>
          ) : null}
          <div className={styles.actions}>
            <Link className={`${buttons.button} ${buttons.primary}`} href="/jogar">
              <Play size={16} aria-hidden />
              Jogar
            </Link>
            <Link className={buttons.button} href="/baralho">
              <Layers size={16} aria-hidden />
              Baralho
            </Link>
            <button type="button" className={buttons.button} onClick={() => setTutorial(true)}>
              <BookOpen size={16} aria-hidden />
              Como jogar
            </button>
          </div>
        </>
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
          <label className={styles.caixa}>
            <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
            <span>
              Li e aceito os <Link href="/termos">termos de uso</Link>.
            </span>
          </label>
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

      {conta?.tipo === 'fora' ? (
        <>
          <div className={styles.abas} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'entrar'}
              className={`${styles.aba} ${aba === 'entrar' ? styles.abaAtiva : ''}`}
              onClick={() => {
                setAba('entrar')
                setErro(null)
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'criar'}
              className={`${styles.aba} ${aba === 'criar' ? styles.abaAtiva : ''}`}
              onClick={() => {
                setAba('criar')
                setErro(null)
              }}
            >
              Criar conta
            </button>
          </div>

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
            <input
              className={styles.campo}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e-mail"
              autoComplete="email"
              autoCapitalize="none"
              aria-label="E-mail"
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
              <label className={styles.caixa}>
                <input
                  type="checkbox"
                  checked={termos}
                  onChange={(e) => setTermos(e.target.checked)}
                />
                <span>
                  Li e aceito os <Link href="/termos">termos de uso</Link>.
                </span>
              </label>
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
              onClick={() => void tentar(entrarComGoogle)}
            >
              Entrar com o Google
            </button>
            <button
              type="button"
              className={`${buttons.button} ${buttons.ghost} ${styles.largo}`}
              disabled={ocupado}
              onClick={() => setAvisoConvidado(true)}
            >
              <UserRound size={16} aria-hidden />
              Jogar como convidado
            </button>
            {aba === 'entrar' ? (
              <button
                type="button"
                className={styles.trocar}
                disabled={ocupado || !email}
                onClick={() =>
                  void tentar(async () => {
                    await recuperarSenha(email)
                    setRecado('Se existe conta com esse e-mail, o link de nova senha já foi.')
                  })
                }
              >
                esqueci a senha
              </button>
            ) : null}
          </div>

          <button type="button" className={buttons.button} onClick={() => setTutorial(true)}>
            <BookOpen size={16} aria-hidden />
            Como jogar
          </button>
        </>
      ) : null}

      {erro ? <p className={styles.erro}>{erro}</p> : null}
      {recado ? <p className={styles.recado}>{recado}</p> : null}

      <p className={styles.foot}>4 semanas · 20 dias úteis · 1 baralho</p>

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
