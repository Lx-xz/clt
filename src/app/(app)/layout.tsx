import Musica from '@/components/Musica'
import SessaoGuard from '@/components/SessaoGuard'
import SideNav from '@/components/SideNav'
import styles from './shell.module.sass'

// o Next prefixa o basePath nos links que ele gera, mas não no `src` de uma
// tag de mídia: aqui o caminho é montado à mão, como no manifest e no ícone
const base = process.env.DEPLOY_TARGET === 'gh-pages' ? (process.env.PAGES_BASE_PATH ?? '/clt') : ''

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessaoGuard>
      <div className={styles.shell}>
        <SideNav />
        <Musica src={`${base}/som/cold-coffee-logic.mp3`} />
        <div className={styles.conteudo}>{children}</div>
      </div>
    </SessaoGuard>
  )
}
