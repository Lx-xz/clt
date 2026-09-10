import SessaoGuard from '@/components/SessaoGuard'
import SideNav from '@/components/SideNav'
import styles from './shell.module.sass'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessaoGuard>
      <div className={styles.shell}>
        <SideNav />
        <div className={styles.conteudo}>{children}</div>
      </div>
    </SessaoGuard>
  )
}
