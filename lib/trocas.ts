import type { SupabaseClient } from '@supabase/supabase-js';

import type { AulaDoAluno } from '@/lib/aulas';
import { ErroDeValidacao } from '@/lib/erros';

/**
 * Troca de aula (contrato § 9.4, D44–D47): a folha "Trocar aula" sai da aula
 * nova. As opções vêm só das colunas (`can_swap_from`,
 * `can_swap_from_permanent`, `can_swap_to`, `is_recurring`); as recusas, do
 * banco, com a frase dele. Textos da § 3, os mesmos do app
 * (`snake-thai/src/utils/trocas.ts`).
 *
 * Os anexos da troca permanente esperam o G2 (rota `motivos/sign-upload`).
 */

export type TipoDeTroca = 'once' | 'permanent';

export const ROTULO_DO_TIPO: Record<TipoDeTroca, string> = {
  once: 'Só nesta semana',
  permanent: 'Permanente',
};

export const TEXTOS_DA_TROCA = {
  pergunta: 'Qual aula sua você quer trocar por esta?',
  campoDaPermanente: 'Por que você precisa mudar de horário?',
  avisoDaPermanente:
    'A troca permanente muda a sua grade a partir da próxima aula depois da aprovação.',
  semOpcao: 'Nenhuma aula sua nesta semana pode ser trocada por esta.',
  pedida: 'Pedido de troca enviado. A aula nova fica como Troca pendente até a decisão.',
} as const;

/** Limite do banco para a justificativa da permanente (`action_reasons.body`). */
export const TAMANHO_MAXIMO_DA_JUSTIFICATIVA_DA_TROCA = 500;

/** A frase do banco para a justificativa da permanente que falta. */
const JUSTIFICATIVA_OBRIGATORIA = 'Para a troca permanente, escreva a justificativa.';

/** Os tipos que esta aula nova aceita, com as aulas dele da semana (§ 12.2, folha). */
export function tiposPossiveis(nova: AulaDoAluno, semana: readonly AulaDoAluno[]): TipoDeTroca[] {
  const tipos: TipoDeTroca[] = [];
  if (semana.some((aula) => aula.id !== nova.id && aula.podeTrocarDe)) tipos.push('once');
  if (nova.recorrente && semana.some((aula) => aula.id !== nova.id && aula.podeTrocarDePermanente)) {
    tipos.push('permanent');
  }
  return tipos;
}

/** As aulas dele que podem sair na troca daquele tipo. A nova nunca entra. */
export function opcoesDeOrigem(
  semana: readonly AulaDoAluno[],
  nova: AulaDoAluno,
  tipo: TipoDeTroca,
): AulaDoAluno[] {
  return semana.filter(
    (aula) => aula.id !== nova.id && (tipo === 'once' ? aula.podeTrocarDe : aula.podeTrocarDePermanente),
  );
}

/** Reposição: a aula original já começou (§ 9.4, `is_makeup`). Nunca na permanente. */
export function ehReposicao(original: AulaDoAluno, agora: Date): boolean {
  return new Date(original.quando) <= agora;
}

/** "Este horário termina em dd/mm." (§ 3), a partir de `AAAA-MM-DD`. */
export function textoDoFimDoHorario(fim: string): string {
  return `Este horário termina em ${fim.slice(8, 10)}/${fim.slice(5, 7)}.`;
}

export interface PedidoDeTroca {
  de: string;
  para: string;
  tipo: TipoDeTroca;
  /** Obrigatório na permanente; proibido na avulsa (P19). */
  justificativa?: string;
}

/**
 * Avulsa: só o pedido. Permanente, nesta ordem (§ 9.4): o motivo
 * `class_swap_evidence` com a justificativa, e o pedido com ele.
 */
export async function pedirTroca(cliente: SupabaseClient, pedido: PedidoDeTroca): Promise<string> {
  let motivoId: string | null = null;
  if (pedido.tipo === 'permanent') {
    const texto = (pedido.justificativa ?? '').trim();
    if (texto === '' || texto.length > TAMANHO_MAXIMO_DA_JUSTIFICATIVA_DA_TROCA) {
      throw new ErroDeValidacao(JUSTIFICATIVA_OBRIGATORIA);
    }
    const motivo = await cliente.rpc('criar_motivo', {
      p_kind: 'class_swap_evidence',
      p_class_id: null,
      p_texto: texto,
    });
    if (motivo.error !== null) {
      throw motivo.error;
    }
    motivoId = String(motivo.data);
  }

  const { data, error } = await cliente.rpc('pedir_troca_de_aula', {
    p_de: pedido.de,
    p_para: pedido.para,
    p_tipo: pedido.tipo,
    p_motivo_id: motivoId,
  });
  if (error !== null) {
    throw error;
  }
  return String(data);
}
