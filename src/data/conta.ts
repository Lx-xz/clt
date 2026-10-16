'use client'

import { AVATAR_PADRAO, lerAvatar, type Avatar } from './avatar'
import { atualizarAvatarSalvo, esquecerConta, lembrarConta } from './contasSalvas'
import { supabase } from './supabase'
import {
  gravarConvidado,
  gravarPerfilLocal,
  lerConvidado,
  limparConvidado,
  limparPerfilLocal,
  type Sessao,
} from '@/game/session'

/**
 * Contas, do lado do site. O banco é quem manda: aqui só se chama o Supabase
 * Auth e se lê o perfil pela função `meu_perfil()`. Nada nesta camada decide
 * permissão — quem decide é o `security definer` do outro lado.
 */

/** O estado possível de quem abre o site. */
export type Conta =
  | { tipo: 'conta'; perfil: Sessao }
  /** Logado, mas ainda sem nick ou sem termos aceitos — o caso do Google. */
  | { tipo: 'incompleto'; perfil: Sessao; email: string }
  | { tipo: 'convidado'; perfil: Sessao }
  | { tipo: 'fora' }

function exigirBanco() {
  if (!supabase) throw new Error('O banco não está configurado neste site.')
  return supabase
}

interface LinhaPerfil {
  id: string
  nick: string | null
  nome: string | null
  email: string | null
  convidado: boolean
  admin: boolean
  termos_em: string | null
  pontos: number
  avatar: unknown
}

/**
 * Lê quem está logado. Ordem de preferência: conta primeiro, convidado
 * depois — quem criou conta com um convidado aberto no mesmo navegador passa
 * a jogar como a conta.
 */
export async function lerConta(): Promise<Conta> {
  if (!supabase) return { tipo: 'fora' }

  // getSession lê o que já está no localStorage (e renova o token sozinho
  // quando precisa); getUser bateria no servidor a cada navegação
  const { data } = await supabase.auth.getSession()
  const usuario = data.session?.user
  if (usuario) {
    const { data: linhas, error } = await supabase.rpc('meu_perfil')
    if (error) throw new Error(error.message)
    const linha = (linhas as LinhaPerfil[] | null)?.[0]
    const perfil: Sessao = {
      id: usuario.id,
      nick: linha?.nick ?? '',
      nome: linha?.nome ?? null,
      email: linha?.email ?? usuario.email ?? null,
      convidado: false,
      admin: linha?.admin === true,
      pontos: linha?.pontos ?? 0,
      avatar: lerAvatar(linha?.avatar),
    }
    // sem nick ou sem termos o cadastro não terminou: o site pede o resto
    // antes de deixar jogar, senão o ranking ficaria cheio de gente sem nome
    if (!linha?.nick || !linha.termos_em) {
      return { tipo: 'incompleto', perfil, email: perfil.email ?? '' }
    }
    gravarPerfilLocal(perfil)
    // entra (ou continua) na lista de contas deste aparelho, com o nick e o
    // avatar de hoje: é ela que a troca de conta mostra
    await lembrarConta(perfil)
    return { tipo: 'conta', perfil }
  }

  limparPerfilLocal()
  const convidado = lerConvidado()
  return convidado ? { tipo: 'convidado', perfil: convidado } : { tipo: 'fora' }
}

/** Avisa quando a conta muda em outra aba, ou quando o Google devolve. */
export function aoMudarConta(cb: () => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange(() => cb())
  return () => data.subscription.unsubscribe()
}

export async function nickLivre(nick: string): Promise<boolean> {
  const sb = exigirBanco()
  const { data, error } = await sb.rpc('nick_livre', { p_nick: nick })
  if (error) throw new Error(error.message)
  return data === true
}

export interface DadosCadastro {
  email: string
  senha: string
  nome: string
  nick: string
}

/**
 * Cria a conta. O perfil (nick, nome, aceite dos termos) não é gravado aqui:
 * ele vai junto como metadado e um gatilho no banco cria a linha de
 * `players`. Assim nunca existe conta sem perfil, nem que o navegador feche
 * no meio.
 *
 * Devolve `precisaConfirmar` quando o projeto exige confirmar o e-mail: nesse
 * caso não há sessão ainda, e insistir em entrar só daria erro.
 */
export async function cadastrar(d: DadosCadastro): Promise<{ precisaConfirmar: boolean }> {
  const sb = exigirBanco()
  if (!(await nickLivre(d.nick))) throw new Error('Esse nick já é de outra pessoa.')

  const { data, error } = await sb.auth.signUp({
    email: d.email.trim(),
    password: d.senha,
    options: {
      data: { nick: d.nick, nome: d.nome.trim(), termos: 'true' },
      emailRedirectTo: enderecoDeVolta(),
    },
  })
  if (error) throw new Error(traduzir(error.message))
  return { precisaConfirmar: !data.session }
}

/**
 * Entra com e-mail OU nick (v0.38). Sem arroba é nick: o Auth só entende
 * e-mail, então o banco devolve o e-mail daquele nick — mas só depois de
 * conferir a senha (`email_para_entrar`), para o e-mail de ninguém vazar a
 * quem só sabe o nick. Nick inexistente e senha errada dão o mesmo recado.
 */
export async function entrar(identificador: string, senha: string) {
  const sb = exigirBanco()
  let email = identificador.trim()
  if (!email.includes('@')) {
    const { data, error } = await sb.rpc('email_para_entrar', { p_nick: email, p_senha: senha })
    if (error) {
      // banco sem a função (o schema.sql da v0.38 ainda não rodou)
      if (error.code === 'PGRST202' || error.message.includes('email_para_entrar')) {
        throw new Error('Entrar pelo nick ainda não está ligado. Use o e-mail.')
      }
      throw new Error(error.message)
    }
    if (typeof data !== 'string' || !data) throw new Error('Nick ou senha não conferem. Ainda não tem conta? É em “Criar conta”.')
    email = data
  }
  const { error } = await sb.auth.signInWithPassword({ email, password: senha })
  if (error) throw new Error(traduzir(error.message))
}

export async function entrarComGoogle() {
  const sb = exigirBanco()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: enderecoDeVolta() },
  })
  if (error) throw new Error(traduzir(error.message))
}

/**
 * Manda o e-mail de recuperação. O link volta para `/nova-senha`, que troca a
 * senha — e esse endereço precisa estar na lista de Redirect URLs do painel
 * do Supabase, senão o link cai no lugar errado sem erro nenhum.
 */
export async function recuperarSenha(email: string) {
  const sb = exigirBanco()
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: enderecoDeVolta('nova-senha'),
  })
  if (error) throw new Error(traduzir(error.message))
}

/** Se já existe sessão neste navegador — o link de recuperação cria uma. */
export async function temSessao(): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session)
}

/**
 * Se a conta já tem senha: quem entrou só pelo Google não tem, e para ela
 * o botão é "Criar senha". Quem diz é a lista de provedores do Auth — e o
 * `email` entra nela no cadastro com senha. Quem criou a senha depois, pelo
 * Google, pode continuar aparecendo só com o Google ali: por isso o botão
 * diz "criar" só como palpite, e a ação é a mesma.
 */
export async function contaTemSenha(): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase.auth.getUser()
  const provedores = (data.user?.app_metadata?.providers as string[] | undefined) ?? []
  return provedores.includes('email')
}

export async function definirNovaSenha(senha: string) {
  const sb = exigirBanco()
  const { error } = await sb.auth.updateUser({ password: senha })
  if (error) throw new Error(traduzir(error.message))
}

/**
 * Fecha o cadastro de quem entrou pelo Google (que não traz nick nenhum) ou
 * de quem tropeçou num nick tomado no meio do caminho. A senha é opcional:
 * quem veio do Google já entra pelo Google, e só precisa dela se quiser
 * também entrar por e-mail.
 */
export async function completarPerfil(nick: string, nome: string, senha?: string) {
  const sb = exigirBanco()
  const { error } = await sb.rpc('completar_perfil', {
    p_nick: nick,
    p_nome: nome,
    p_termos: true,
  })
  if (error) throw new Error(error.message)
  if (senha) {
    const { error: falha } = await sb.auth.updateUser({ password: senha })
    if (falha) throw new Error(traduzir(falha.message))
  }
}

/**
 * Troca o avatar. Quem tem conta grava no banco; o convidado grava só no
 * espelho local deste navegador, porque é lá que ele inteiro mora.
 */
export async function trocarAvatar(sessao: Sessao, avatar: Avatar): Promise<Sessao> {
  const novo = { ...sessao, avatar }
  if (sessao.convidado) {
    gravarConvidado(novo)
    return novo
  }
  const { salvarAvatar } = await import('./avatar')
  await salvarAvatar(avatar)
  gravarPerfilLocal(novo)
  atualizarAvatarSalvo(novo.id, avatar)
  return novo
}

/**
 * Sai da conta em uso, e só NESTE aparelho (`scope: 'local'`): o padrão do
 * Supabase é deslogar a pessoa de todo lugar, e sair do computador não pode
 * derrubar o celular. Ela também some da lista de contas daqui.
 */
export async function sair() {
  limparPerfilLocal()
  limparConvidado()
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  if (data.session) esquecerConta(data.session.user.id)
  await supabase.auth.signOut({ scope: 'local' })
}

/**
 * Entra sem conta. O nick é sorteado e descartável de propósito: convidado
 * não reserva nome de ninguém, e o progresso dele mora neste navegador — é
 * exatamente isso que a tela avisa antes de chamar esta função.
 */
export async function entrarComoConvidado(): Promise<Sessao> {
  const sb = exigirBanco()
  let ultimo: unknown = null
  // o sorteio pode colidir; três tentativas é folga de sobra para 36^4
  for (let i = 0; i < 3; i++) {
    const nick = `convidado-${Math.random().toString(36).slice(2, 6)}`
    const { data, error } = await sb.rpc('criar_convidado', { p_nick: nick })
    if (!error && data) {
      const perfil: Sessao = {
        id: data as string,
        nick,
        nome: null,
        email: null,
        convidado: true,
        admin: false,
        pontos: 0,
        avatar: AVATAR_PADRAO,
      }
      gravarConvidado(perfil)
      return perfil
    }
    ultimo = error
  }
  throw new Error(
    ultimo instanceof Error ? ultimo.message : 'Não deu para entrar como convidado.',
  )
}

/**
 * Para onde o Google (e o link de confirmação de e-mail) devolve o visitante.
 * É o endereço desta página, sem query nem âncora — e como o botão de entrar
 * só existe na home, isso já é a home com o `/clt` do GitHub Pages incluso,
 * sem precisar remontar o basePath à mão.
 *
 * Este endereço precisa estar na lista de "Redirect URLs" do painel do
 * Supabase, senão o login volta para o site errado.
 */
function enderecoDeVolta(rota = 'auth'): string {
  if (typeof window === 'undefined') return ''
  // a raiz do site, com o `/clt` do GitHub Pages incluso, sem remontar o
  // basePath à mão: é o endereço atual sem o `auth/` do fim, que é de onde
  // o login e a recuperação de senha são chamados
  const raiz = (window.location.origin + window.location.pathname.replace(/auth\/?$/, '')).replace(/\/$/, '')
  return `${raiz}/${rota}/`
}

/** As mensagens do Auth chegam em inglês; as comuns viram português aqui. */
function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha não conferem. Ainda não tem conta? É em “Criar conta”.'
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar.'
  if (m.includes('user already registered')) return 'Já existe uma conta com este e-mail.'
  if (m.includes('password should be at least')) return 'A senha precisa de pelo menos 6 letras.'
  if (m.includes('unable to validate email')) return 'Esse e-mail não parece válido.'
  if (m.includes('for security purposes')) return 'Espere alguns segundos antes de tentar de novo.'
  if (m.includes('should be different from the old')) return 'A senha nova é igual à de agora.'
  if (m.includes('reauthentication') || m.includes('reauthenticate')) {
    return 'Por segurança, saia e entre de novo antes de trocar a senha.'
  }
  if (m.includes('provider is not enabled')) {
    return 'O login pelo Google ainda não está ligado neste projeto do Supabase.'
  }
  return mensagem
}
