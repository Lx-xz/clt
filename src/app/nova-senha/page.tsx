'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { aoMudarConta, definirNovaSenha, temSessao } from '@/data/conta'
import buttons from '@/styles/buttons.module.sass'
import styles from './nova-senha.module.sass'

/**
 * Onde o link de "esqueci a senha" cai.
 *
 * O Supabase manda um e-mail com um endereço que traz o token na âncora; a
 * `supabase-js` transforma isso em sessão sozinha (`detectSessionInUrl`), e é
 * por isso que esta página não pede token nenhum — ela só confere se a
 * sessão apareceu e troca a senha. Fica FORA da guarda de `(app)` de
 * propósito: quem chega aqui está no meio de recuperar o acesso, não jogando.
 *
 * Este endereço precisa estar na lista de Redirect URLs do painel do
 * Supabase, senão o link do e-mail volta para o lugar errado sem erro nenhum.
 */
export default function NovaSenhaPage() {
  const [pronto, setPronto] = useState<boolean | null>(null)
  const [senha, setSenha] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    // a sessão pode ainda não existir no primeiro render: a supabase-js lê a
    // âncora de forma assíncrona, e o aviso de mudança é quem diz que chegou
    const conferir = () => void temSessao().then(setPronto)
    conferir()
    return aoMudarConta(conferir)
  }, [])

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (senha.length < 6) {
      setErro('A senha precisa de pelo menos 6 letras.')
      return
    }
    if (senha !== repetida) {
      setErro('As duas senhas não são iguais.')
      return
    }
    setErro(null)
    setSalvando(true)
    definirNovaSenha(senha)
      .then(() => setSalvo(true))
      .catch((f: unknown) => setErro(f instanceof Error ? f.message : 'Não deu para trocar.'))
      .finally(() => setSalvando(false))
  }

  return (
    <main className={styles.pagina}>
      <h1 className={styles.titulo}>Nova senha</h1>

      {pronto === null ? <p className={styles.texto}>Conferindo o link…</p> : null}

      {pronto === false ? (
        <>
          <p className={styles.texto}>
            Este link não vale mais — eles expiram, e cada um só funciona uma vez. Peça outro na
            entrada, em &ldquo;esqueci a senha&rdquo;.
          </p>
          <Link className={`${buttons.button} ${buttons.primary}`} href="/">
            Voltar para a entrada
          </Link>
        </>
      ) : null}

      {pronto && salvo ? (
        <>
          <p className={styles.texto}>Senha trocada. Já dá para entrar com ela.</p>
          <Link className={`${buttons.button} ${buttons.primary}`} href="/">
            Ir para o jogo
          </Link>
        </>
      ) : null}

      {pronto && !salvo ? (
        <form className={styles.forma} onSubmit={enviar}>
          <p className={styles.texto}>Escolha a senha nova. Ela passa a valer na hora.</p>
          <input
            className={styles.campo}
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="senha nova"
            autoComplete="new-password"
            aria-label="Senha nova"
          />
          <input
            className={styles.campo}
            type="password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            placeholder="repita a senha"
            autoComplete="new-password"
            aria-label="Repita a senha"
          />
          {erro ? <p className={styles.erro}>{erro}</p> : null}
          <button
            type="submit"
            className={`${buttons.button} ${buttons.primary}`}
            disabled={salvando}
          >
            {salvando ? 'Trocando…' : 'Trocar a senha'}
          </button>
        </form>
      ) : null}
    </main>
  )
}
