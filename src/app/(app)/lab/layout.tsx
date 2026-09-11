import GuardaAdmin from '@/components/GuardaAdmin'

/** Tudo abaixo de `/lab` passa pela mesma trava; veja `GuardaAdmin`. */
export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <GuardaAdmin>{children}</GuardaAdmin>
}
