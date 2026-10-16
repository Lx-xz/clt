'use client'

import { Check, ChevronRight, KeyRound, LogOut, Plus } from 'lucide-react'
import Avatar from '../Avatar'
import BotaoConfirmar from '../BotaoConfirmar'
import type { ContaSalva } from '@/data/contasSalvas'
import styles from './ListaDeContas.module.sass'

/**
 * As contas deste aparelho, como no YouTube: o avatar, o nick e um toque
 * para trocar. A mesma lista mora na porta (`/auth`, quando ninguém entrou)
 * e nas Configurações (para trocar sem sair).
 *
 * Editando, cada linha ganha o "Sair" (com o segundo clique de sempre,
 * `BotaoConfirmar`), e tocar na linha deixa de trocar: misturar os dois
 * gestos na mesma linha era sair de uma conta querendo entrar nela.
 */
export default function ListaDeContas({
  contas,
  atual,
  editando = false,
  ocupado = false,
  onEscolher,
  onSair,
  onAdicionar,
}: {
  contas: ContaSalva[]
  /** A conta em uso, que aparece marcada e não troca. */
  atual?: string
  editando?: boolean
  ocupado?: boolean
  onEscolher: (conta: ContaSalva) => void
  onSair: (conta: ContaSalva) => void
  onAdicionar?: () => void
}) {
  return (
    <ul className={styles.lista}>
      {contas.map((c) => {
        const emUso = c.id === atual
        const expirou = !c.renovacao
        const miolo = (
          <>
            <Avatar avatar={c.avatar} tamanho={44} redondo />
            <span className={styles.texto}>
              <span className={styles.nick}>{c.nick}</span>
              {emUso ? (
                <span className={styles.dica}>em uso</span>
              ) : expirou ? (
                <span className={styles.dica}>
                  <KeyRound size={12} aria-hidden /> entrar de novo
                </span>
              ) : null}
            </span>
          </>
        )
        return (
          <li key={c.id} className={styles.item}>
            {editando ? (
              <div className={styles.linha}>
                {miolo}
                <BotaoConfirmar
                  className={styles.sair}
                  armado="Confirmar"
                  onConfirmar={() => onSair(c)}
                  desabilitado={ocupado}
                  rotulo={`Sair de ${c.nick} neste aparelho`}
                >
                  <LogOut size={15} aria-hidden /> Sair
                </BotaoConfirmar>
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.linha} ${styles.tocavel}`}
                onClick={() => onEscolher(c)}
                disabled={ocupado || emUso}
                aria-current={emUso || undefined}
              >
                {miolo}
                {emUso ? (
                  <Check size={18} className={styles.marca} aria-hidden />
                ) : (
                  <ChevronRight size={18} className={styles.seta} aria-hidden />
                )}
              </button>
            )}
          </li>
        )
      })}
      {onAdicionar && !editando ? (
        <li className={styles.item}>
          <button type="button" className={`${styles.linha} ${styles.tocavel}`} onClick={onAdicionar} disabled={ocupado}>
            <span className={styles.mais}>
              <Plus size={20} aria-hidden />
            </span>
            <span className={styles.texto}>
              <span className={styles.nick}>Adicionar conta</span>
            </span>
          </button>
        </li>
      ) : null}
    </ul>
  )
}
