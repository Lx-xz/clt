import type { MetadataRoute } from 'next'

// O conteúdo do manifest NÃO passa pelo basePath do Next — só o <link> para
// ele passa. Então os caminhos daqui de dentro precisam do prefixo na mão,
// senão no GitHub Pages (/clt) o atalho abre na raiz do domínio.
const base = process.env.DEPLOY_TARGET === 'gh-pages' ? (process.env.PAGES_BASE_PATH ?? '/clt') : ''

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CLT — Coffee, Labor and Tears',
    short_name: 'CLT',
    description:
      'Card game roguelike sobre atravessar um mês de trabalho formal sem ficar no vermelho.',
    lang: 'pt-BR',
    start_url: `${base}/`,
    scope: `${base}/`,
    // standalone é o que faz abrir sem a barra do Safari, como aplicativo
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#e9e4d9',
    theme_color: '#e9e4d9',
    icons: [
      { src: `${base}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' },
      // purpose "maskable" é para o Android recortar sem comer o desenho
      { src: `${base}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
