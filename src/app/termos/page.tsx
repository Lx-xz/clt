import Link from 'next/link'
import Termos from '@/components/Termos'
import styles from './termos.module.sass'

export const metadata = { title: 'Termos de uso — CLT' }

/**
 * A rota existe para o link ser compartilhável e para quem quiser ler antes
 * de se cadastrar; no cadastro o mesmo texto abre num popup, que é onde as
 * pessoas leem de verdade sem perder o formulário pelo caminho.
 */
export default function TermosPage() {
  return (
    <main className={styles.pagina}>
      <Link className={styles.voltar} href="/">
        ← voltar
      </Link>
      <h1 className={styles.titulo}>Termos de uso</h1>
      <Termos />
    </main>
  )
}
