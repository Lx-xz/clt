// Remendo no Next, aplicado no `postinstall` (roda também no `npm ci` do deploy).
//
// O defeito: no export estático, o roteador busca os dados de uma página em
// `.../pagina/index.txt`. Quando essa busca FALHA (o caso típico é a aba
// aberta numa versão antiga do site, depois de um deploy), ele cai para uma
// navegação comum — só que para o endereço do `.txt`, e não o da página. O
// navegador abre o arquivo de dados e mostra aquele texto cru
// (`1:"$Sreact.fragment"…`) no lugar do site. Foi o que aconteceu ao sair da
// conta. O ramo do erro usa `url` (já com o `index.txt`), enquanto o resto do
// arquivo tira o marcador com `urlToUrlWithoutFlightMarker`; o remendo faz o
// ramo do erro tirar também. Continua igual na 15.5.27, então subir de versão
// não resolve.
//
// Idempotente, e não derruba a instalação: se o Next mudar e o trecho não for
// achado, avisa e segue — aí é conferir se a versão nova já corrigiu.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const ALVOS = [
  ['node_modules/next/dist/client/components/router-reducer/fetch-server-response.js', '(0, _routeparams.urlToUrlWithoutFlightMarker)'],
  ['node_modules/next/dist/esm/client/components/router-reducer/fetch-server-response.js', 'urlToUrlWithoutFlightMarker'],
]
const ERRADO = 'flightData: url.toString(),'

for (const [arquivo, funcao] of ALVOS) {
  if (!existsSync(arquivo)) continue
  const texto = readFileSync(arquivo, 'utf8')
  const certo = `flightData: ${funcao}(url).toString(),`
  if (texto.includes(certo)) continue
  const vezes = texto.split(ERRADO).length - 1
  if (vezes !== 1) {
    console.warn(`[remendar-next] trecho não encontrado em ${arquivo} (${vezes}x) — confira se o Next já corrigiu`)
    continue
  }
  writeFileSync(arquivo, texto.replace(ERRADO, certo))
  console.log(`[remendar-next] remendado: ${arquivo}`)
}
