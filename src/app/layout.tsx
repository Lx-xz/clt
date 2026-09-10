import type { Metadata, Viewport } from 'next'
import './global.sass'

export const metadata: Metadata = {
  title: 'CLT — Coffee, Labor and Tears',
  description: 'Card game roguelike sobre atravessar um mês de trabalho formal sem ficar no vermelho.',
  // "Adicionar à Tela de Início" no iPhone: o iOS ignora o manifest e o
  // icon.svg, e só olha o apple-touch-icon (o arquivo apple-icon.png ao lado
  // deste, que o Next publica sozinho). appleWebApp faz abrir em tela cheia.
  appleWebApp: {
    capable: true,
    title: 'CLT',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#e9e4d9',
  // instalado no iPhone o app pega a tela inteira, entalhe incluso
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
