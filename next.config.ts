import type { NextConfig } from 'next'

const config: NextConfig = {
  sassOptions: {
    // arquivos .sass usam sintaxe indentada (sem chaves)
    silenceDeprecations: ['legacy-js-api'],
  },
}

export default config
