import type { SupabaseClient } from '@supabase/supabase-js';

import { formatarDiaEHora, type SituacaoDaJustificativa, type SituacaoDaPresenca } from '@/lib/aulas';

/**
 * Histórico de aulas do próprio aluno (`historico_de_aulas_do_aluno`, § 12).
 * O aluno vê a marca **Editada**, mas nunca quem editou nem o valor anterior:
 * essas colunas vêm nulas para ele (D20), e esta tela nem as lê.
 */

export interface AulaDoHistorico {
  id: string;
  quando: string;
  titulo: string;
  cancelada: boolean;
  presenca: SituacaoDaPresenca | null;
  origem: string | null;
  justificativa: SituacaoDaJustificativa | null;
  editada: boolean;
  /** T14: dias entre a aula e a chamada; nulo quando foi no mesmo dia. */
  diasDeAtraso: number | null;
  outraQuando: string | null;
}

/** `de` e `ate`: `AAAA-MM-DD`, inclusive. */
export async function buscarHistoricoDoAluno(
  cliente: SupabaseClient,
  userId: string,
  de: string,
  ate: string,
): Promise<AulaDoHistorico[]> {
  const { data, error } = await cliente.rpc('historico_de_aulas_do_aluno', {
    p_user_id: userId,
    p_de: de,
    p_ate: ate,
  });
  if (error !== null) {
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[])
    .map((linha) => ({
      id: String(linha.class_id),
      quando: String(linha.date_time),
      titulo: typeof linha.title === 'string' ? linha.title : 'Aula',
      cancelada: linha.cancelled === true,
      presenca: (linha.status ?? null) as SituacaoDaPresenca | null,
      origem: typeof linha.origem === 'string' ? linha.origem : null,
      justificativa: (linha.justification_status ?? null) as SituacaoDaJustificativa | null,
      editada: linha.edited === true,
      diasDeAtraso: typeof linha.attendance_delay_days === 'number' ? linha.attendance_delay_days : null,
      outraQuando: typeof linha.swap_other_date_time === 'string' ? linha.swap_other_date_time : null,
    }))
    .sort((a, b) => b.quando.localeCompare(a.quando));
}

/**
 * A situação da aula, com a mesma leitura do app (`rotuloDaAulaDoAluno`): a
 * aula que ele trocou mostra "Trocou para…", nunca "Falta" (§ 12).
 */
export function situacaoNoHistorico(aula: AulaDoHistorico): string {
  if (aula.cancelada) return 'Cancelada';
  if (aula.origem === 'trocou' && aula.outraQuando !== null) {
    return `Trocou para ${formatarDiaEHora(aula.outraQuando)}`;
  }
  if (aula.presenca === 'present') return 'Presente';
  if (aula.presenca === 'absent') {
    return aula.justificativa === 'approved' ? 'Falta justificada' : 'Falta';
  }
  return 'Sem registro';
}

/** "Feita {x} dia(s) depois" (§ 3, T14). */
export function atrasoDaChamada(dias: number | null): string | null {
  if (dias === null || dias <= 0) return null;
  return dias === 1 ? 'Feita 1 dia depois' : `Feita ${dias} dias depois`;
}

/** Tom da situação, para a cor por token. */
export function tomDaSituacao(aula: AulaDoHistorico): 'presente' | 'falta' | 'neutro' {
  if (aula.cancelada || aula.origem === 'trocou') return 'neutro';
  if (aula.presenca === 'present') return 'presente';
  if (aula.presenca === 'absent' && aula.justificativa !== 'approved') return 'falta';
  return 'neutro';
}
