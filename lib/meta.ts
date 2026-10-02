import type { SupabaseClient } from '@supabase/supabase-js';

import { chaveDoDia, inicioDaSemana } from '@/lib/aulas';

/**
 * Meta semanal do à vontade (contrato § 5.3, D36–D38). Vale a partir da
 * próxima segunda; a desta semana continua. Quem decide a data é o banco.
 */

/** Faixa da meta (`weekly_goals`: de 1 a 6), a mesma do app. */
export const META_MINIMA = 1;
export const META_MAXIMA = 6;

const UMA_SEMANA_EM_MS = 7 * 24 * 60 * 60 * 1000;

export interface MetaDefinida {
  meta: number;
  /** `AAAA-MM-DD`, a segunda em que a meta passa a valer. */
  valeAPartir: string;
}

export async function definirMetaSemanal(
  cliente: SupabaseClient,
  meta: number,
): Promise<MetaDefinida> {
  const { data, error } = await cliente.rpc('definir_meta_semanal', { p_meta: meta });
  if (error !== null) {
    throw error;
  }
  const resposta = (data ?? {}) as Record<string, unknown>;
  return { meta: Number(resposta.meta ?? meta), valeAPartir: String(resposta.vale_a_partir) };
}

/** A meta de uma semana (a mais recente que já vale, ou a padrão da academia). */
export async function buscarMetaDaSemana(
  cliente: SupabaseClient,
  userId: string,
  segunda: string,
): Promise<number> {
  const { data, error } = await cliente.rpc('meta_da_semana', {
    p_user_id: userId,
    p_week_start: segunda,
  });
  if (error !== null) {
    throw error;
  }
  return Number(data);
}

/** A segunda que vem, `AAAA-MM-DD`, no fuso da academia. */
export function proximaSegunda(agora: Date): string {
  return chaveDoDia(new Date(inicioDaSemana(agora).getTime() + UMA_SEMANA_EM_MS));
}

/** `{seg dd/mm}` da § 3 a partir de `AAAA-MM-DD`. */
export function segundaEmTexto(data: string): string {
  const instante = new Date(`${data}T12:00:00Z`);
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(instante)
    .replace('.', '');
  return `${semana} ${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/** "Vale a partir de {seg dd/mm}. A meta desta semana continua {n}x." (§ 3) */
export function textoDaMudanca(valeAPartir: string, metaDestaSemana: number): string {
  return `Vale a partir de ${segundaEmTexto(valeAPartir)}. A meta desta semana continua ${metaDestaSemana}x.`;
}
