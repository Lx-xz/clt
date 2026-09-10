import type { NextConfig } from 'next'

// O deploy no GitHub Pages é estático e servido em /clt (página de projeto).
// Fora do CI nada disso vale, então `npm run dev` continua na raiz.
const isPages = process.env.DEPLOY_TARGET === 'gh-pages'
const basePath = process.env.PAGES_BASE_PATH ?? '/clt'

const config: NextConfig = {
  sassOptions: {
    // arquivos .sass usam sintaxe indentada (sem chaves)
    silenceDeprecations: ['legacy-js-api'],
  },
  ...(isPages
    ? {
        output: 'export' as const,
        basePath,
        // sem isso os links internos quebram ao servir de um subdiretório
        trailingSlash: true,
      }
    : {}),
}

export default config
