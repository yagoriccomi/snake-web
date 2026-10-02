import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Contato da academia (contrato § 5.4, D52): só pela RPC
 * `contato_da_academia`, nunca por `select` em `academy_settings`. Não existe
 * antes do login (a RPC recusa `anon`).
 */

export interface ContatoDaAcademia {
  /** Só dígitos, E.164 sem o `+` (`5511912345678`). */
  whatsapp: string | null;
  email: string | null;
}

export const TEXTOS_DO_CONTATO = {
  falar: 'Falar com a academia',
  blocoDoNegado: 'Para mais informações, fale com a academia:',
  semContato: 'A academia ainda não cadastrou um contato. Procure a recepção.',
} as const;

export async function buscarContatoDaAcademia(cliente: SupabaseClient): Promise<ContatoDaAcademia> {
  const { data, error } = await cliente.rpc('contato_da_academia');
  if (error !== null) {
    throw error;
  }
  const contato = (data ?? {}) as Record<string, unknown>;
  const texto = (valor: unknown): string | null =>
    typeof valor === 'string' && valor.trim() !== '' ? valor : null;
  return { whatsapp: texto(contato.whatsapp), email: texto(contato.email) };
}

/** `+55 (DD) NNNNN-NNNN`, ou `NNNN-NNNN` com 8 dígitos (§ 5.4). */
export function formatarWhatsapp(numero: string): string {
  const local = numero.startsWith('55') ? numero.slice(2) : numero;
  const ddd = local.slice(0, 2);
  const resto = local.slice(2);
  const corte = resto.length - 4;
  return `+55 (${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function linkDoWhatsapp(numero: string): string {
  return `https://wa.me/${numero}`;
}

export function linkDoEmail(email: string): string {
  return `mailto:${email}`;
}

export function temContato(contato: ContatoDaAcademia): boolean {
  return contato.whatsapp !== null || contato.email !== null;
}
