import type { Metadata } from 'next'
import './global.sass'

export const metadata: Metadata = {
  title: 'CLT — Coffee, Labor and Tears',
  description: 'Card game roguelike sobre atravessar um mês de trabalho formal sem ficar no vermelho.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
