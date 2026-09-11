import type { Metadata, Viewport } from 'next'
import './global.sass'

// o mesmo prefixo que o manifest precisa: `icons` declarado à mão não passa
// pelo basePath do Next (só os arquivos de convenção passam)
const base = process.env.DEPLOY_TARGET === 'gh-pages' ? (process.env.PAGES_BASE_PATH ?? '/clt') : ''

export const metadata: Metadata = {
  title: 'CLT — Coffee, Labor and Tears',
  description: 'Card game roguelike sobre atravessar um mês de trabalho formal sem ficar no vermelho.',
  // "Adicionar à Tela de Início" no iPhone: o iOS ignora o manifest e o
  // icon.svg, e só olha o apple-touch-icon. O arquivo mora em public/ e não
  // em app/ de propósito — pela convenção do app/ o Next publica o link com
  // uma query de cache (?a1b2c3), e o buscador de ícone do iOS tropeça nela.
  // declarar `icons` à mão desliga a convenção de arquivo, então o favicon
  // precisa vir junto aqui — senão a aba fica sem ícone
  icons: {
    icon: { url: `${base}/icon.svg`, type: 'image/svg+xml' },
    apple: `${base}/apple-touch-icon.png`,
  },
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
