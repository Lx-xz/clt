import GuardaAdmin from '@/components/GuardaAdmin'

/** A máquina ainda não é de todo mundo: por enquanto, a mesma trava do lab. */
export default function MaquinaLayout({ children }: { children: React.ReactNode }) {
  return <GuardaAdmin>{children}</GuardaAdmin>
}
