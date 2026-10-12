'use client'

// direto do arquivo, e não do índice da pasta: veja a armadilha "Página que
// é a ÚNICA a importar um componente pelo index.ts" no CLAUDE.md
import Perfil from '@/components/Perfil/Perfil'
import { useSessao } from '@/components/SessaoGuard'

/** O seu perfil: o mesmo componente do perfil dos outros (v0.34), com tudo
 *  aberto e o lápis do editor na capa. */
export default function PerfilPage() {
  const sessao = useSessao()
  return (
    <main className="page">
      <Perfil nick={sessao.nick} meu />
    </main>
  )
}
