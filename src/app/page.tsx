'use client'

import { Layers, Play } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { normalizarNick, validarNick } from '@/data/nick'
import { acharJogador, criarJogador } from '@/data/players'
import { bancoConfigurado } from '@/data/supabase'
import { gravarSessao, lerSessao, limparSessao, type Sessao } from '@/game/session'
import buttons from '@/styles/buttons.module.sass'
import styles from './page.module.sass'

type Estado = 'carregando' | 'pedindo' | 'buscando' | 'criando'

export default function Home() {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [estado, setEstado] = useState<Estado>('carregando')
  const [nick, setNick] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [novoNick, setNovoNick] = useState<string | null>(null)

  useEffect(() => {
    const s = lerSessao()
    setSessao(s)
    setEstado(s ? 'carregando' : 'pedindo')
  }, [])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    const problema = validarNick(nick)
    if (problema) {
      setErro(problema)
      return
    }
    if (!bancoConfigurado) {
      setErro('O banco ainda não está configurado neste site.')
      return
    }

    setErro(null)
    setEstado('buscando')
    try {
      const id = await acharJogador(nick)
      if (id) {
        const s = { id, nick: normalizarNick(nick) }
        gravarSessao(s)
        setSessao(s)
        setEstado('carregando')
        return
      }
      // não existe: pergunta antes de criar, para quem só errou o nick
      setNovoNick(normalizarNick(nick))
      setEstado('pedindo')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para falar com o banco.')
      setEstado('pedindo')
    }
  }

  async function criarConta() {
    if (!novoNick) return
    setEstado('criando')
    try {
      const id = await criarJogador(novoNick)
      const s = { id, nick: novoNick }
      gravarSessao(s)
      setSessao(s)
      setNovoNick(null)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para criar a conta.')
      setNovoNick(null)
      setEstado('pedindo')
    }
  }

  function trocar() {
    limparSessao()
    setSessao(null)
    setNick('')
    setErro(null)
    setEstado('pedindo')
  }

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

      {sessao ? (
        <>
          <span className={styles.quem}>
            Jogando como <span className={styles.nick}>{sessao.nick}</span>
            <button type="button" className={styles.trocar} onClick={trocar}>
              trocar
            </button>
          </span>
          <div className={styles.actions}>
            <Link className={`${buttons.button} ${buttons.primary}`} href="/jogar">
              <Play size={16} aria-hidden />
              Jogar
            </Link>
            <Link className={buttons.button} href="/baralho">
              <Layers size={16} aria-hidden />
              Baralho
            </Link>
          </div>
        </>
      ) : (
        <>
          <form className={styles.forma} onSubmit={entrar}>
            <input
              id="nick"
              className={styles.campo}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="seu nick"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={16}
              aria-label="Seu nick"
              disabled={estado === 'buscando' || estado === 'criando'}
            />
            <button
              type="submit"
              className={`${buttons.button} ${buttons.primary}`}
              disabled={estado === 'buscando' || estado === 'criando'}
            >
              {estado === 'buscando' ? 'Procurando…' : 'Entrar'}
            </button>
          </form>
          {erro ? <p className={styles.erro}>{erro}</p> : null}
          <p className={styles.aviso}>
            O nick só identifica quem está jogando — não tem senha. Qualquer pessoa que digitar o
            seu nick joga no seu save.
          </p>
        </>
      )}

      <p className={styles.foot}>4 semanas · 20 dias úteis · 1 baralho</p>

      {novoNick ? (
        <div className={styles.fundo} role="dialog" aria-modal="true" aria-labelledby="titulo-novo">
          <div className={styles.painel}>
            <h2 className={styles.painelTitulo} id="titulo-novo">
              Primeira vez por aqui?
            </h2>
            <p className={styles.painelTexto}>
              Não existe ninguém com o nick <strong>{novoNick}</strong>. Dá para criar agora, ou
              fechar e tentar outro nick — talvez você tenha digitado diferente da última vez.
            </p>
            <div className={styles.painelAcoes}>
              <button
                type="button"
                className={`${buttons.button} ${buttons.primary}`}
                onClick={criarConta}
                disabled={estado === 'criando'}
              >
                {estado === 'criando' ? 'Criando…' : `Criar ${novoNick}`}
              </button>
              <button type="button" className={buttons.button} onClick={() => setNovoNick(null)}>
                Fechar e mudar o nick
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
