import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A leitura da página de pagar (D32): a mensalidade e a chave PIX da academia.
 *
 * Falha em qualquer das duas sobe como erro, para a tela dizer o motivo real.
 * Sem isso, a internet caída virava "Mensalidade não encontrada" ou "A academia
 * ainda não cadastrou a chave PIX", e o aluno ia à recepção à toa.
 */

export interface MensalidadeParaPagar {
  id: string;
  vencimento: string;
  valorCentavos: number;
  /** O comprovante já foi enviado e a academia ainda não conferiu. */
  emAnalise: boolean;
  /** `null` quando a academia não cadastrou a chave. */
  chavePix: string | null;
}

/**
 * @returns A mensalidade, ou `null` quando o banco responde sem ela (não existe
 *   ou a RLS não deixa o aluno ver).
 * @throws O erro do Supabase de qualquer das duas leituras.
 */
export async function buscarMensalidadeParaPagar(
  cliente: SupabaseClient,
  id: string,
): Promise<MensalidadeParaPagar | null> {
  const [pagamento, configuracao] = await Promise.all([
    cliente
      .from('payments')
      .select('id, due_date, amount_cents, status')
      .eq('id', id)
      .maybeSingle(),
    cliente.from('academy_settings').select('pix_key').maybeSingle(),
  ]);
  if (pagamento.error !== null) {
    throw pagamento.error;
  }
  if (configuracao.error !== null) {
    throw configuracao.error;
  }
  if (pagamento.data === null) {
    return null;
  }

  const linha = pagamento.data as Record<string, unknown>;
  const chave = (configuracao.data as { pix_key?: unknown } | null)?.pix_key;
  return {
    id: String(linha.id),
    vencimento: String(linha.due_date),
    valorCentavos: Number(linha.amount_cents),
    emAnalise: linha.status === 'pending_approval',
    chavePix: typeof chave === 'string' && chave.trim() !== '' ? chave : null,
  };
}
