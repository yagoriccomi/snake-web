'use client';

import { supabase } from '@/lib/supabase';

/**
 * As consultas do aluno.
 *
 * São as MESMAS do aplicativo — a RLS já garante que cada um só enxerga o
 * próprio dado, então não há filtro de segurança escrito aqui. Se alguma coisa
 * precisar de conta, a conta é do banco: nenhuma regra de negócio nesta camada.
 */

export interface Frequencia {
  /** Aulas do mês que contam para a frequência. */
  aulasContadas: number;
  presencas: number;
  justificadas: number;
  percentual: number;
}

export interface Mensalidade {
  id: string;
  vencimento: string;
  valorCentavos: number;
  situacao: 'open' | 'overdue' | 'pending_approval' | 'paid';
}

export interface Aula {
  id: string;
  quando: string;
  titulo: string;
  tipo: string;
}

/** Frequência do mês corrente. Mês sem aula nenhuma vale 100%. */
export async function buscarFrequencia(userId: string): Promise<Frequencia | null> {
  const { data, error } = await supabase.rpc('frequencia_mensal', { p_user_ids: [userId] });
  if (error !== null) {
    throw error;
  }
  const linha = (data as Array<Record<string, unknown>> | null)?.[0];
  if (linha === undefined) {
    return null;
  }
  return {
    aulasContadas: Number(linha.counted_classes ?? 0),
    presencas: Number(linha.attended ?? 0),
    justificadas: Number(linha.justified ?? 0),
    percentual: Number(linha.frequency_percent ?? 0),
  };
}

/** Mensalidades em aberto, vencidas ou em análise — as que pedem ação. */
export async function buscarMensalidadesAbertas(userId: string): Promise<Mensalidade[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, due_date, amount_cents, status')
    .eq('user_id', userId)
    .in('status', ['open', 'overdue', 'pending_approval'])
    .order('due_date', { ascending: true });
  if (error !== null) {
    throw error;
  }
  return (data ?? []).map((linha) => ({
    id: String(linha.id),
    vencimento: String(linha.due_date),
    valorCentavos: Number(linha.amount_cents),
    situacao: linha.status as Mensalidade['situacao'],
  }));
}

/** Próximas aulas da turma do aluno. */
export async function buscarProximasAulas(limite = 5): Promise<Aula[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, date_time, title, type')
    .gte('date_time', new Date().toISOString())
    .order('date_time', { ascending: true })
    .limit(limite);
  if (error !== null) {
    throw error;
  }
  return (data ?? []).map((linha) => ({
    id: String(linha.id),
    quando: String(linha.date_time),
    titulo: String(linha.title ?? 'Aula'),
    tipo: String(linha.type ?? 'routine'),
  }));
}

/** Reais a partir de centavos — dinheiro nunca em ponto flutuante na conta. */
export function formatarDinheiro(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  const dia = data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

export const ROTULO_DA_SITUACAO: Record<Mensalidade['situacao'], string> = {
  open: 'Em aberto',
  overdue: 'Vencida',
  pending_approval: 'Em análise',
  paid: 'Paga',
};
