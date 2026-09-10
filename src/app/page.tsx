import Link from 'next/link'
import buttons from '@/styles/buttons.module.sass'
import styles from './page.module.sass'

export default function Home() {
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

      <div className={styles.actions}>
        <Link className={`${buttons.button} ${buttons.primary}`} href="/jogar">
          Jogar
        </Link>
        <Link className={buttons.button} href="/baralho">
          Baralho
        </Link>
      </div>

      <p className={styles.foot}>4 semanas · 20 dias úteis · 1 baralho</p>
    </main>
  )
}
