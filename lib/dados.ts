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

// ----------------------------------------------------------------------------
// Política de Privacidade e Termos de Uso
// ----------------------------------------------------------------------------

export type TipoDeDocumento = 'privacy_policy' | 'terms_of_use';

export interface DocumentoLegal {
  id: string;
  tipo: TipoDeDocumento;
  versao: string;
  /** Só vem na consulta com texto. */
  conteudo?: string;
}

const NOME_DO_DOCUMENTO: Record<TipoDeDocumento, string> = {
  privacy_policy: 'a Política de Privacidade',
  terms_of_use: 'os Termos de Uso',
};

/** Política antes dos Termos — a mesma ordem do aplicativo. */
function ordenar<T extends { tipo: TipoDeDocumento }>(documentos: T[]): T[] {
  const peso: Record<TipoDeDocumento, number> = { privacy_policy: 0, terms_of_use: 1 };
  return [...documentos].sort((a, b) => peso[a.tipo] - peso[b.tipo]);
}

/** O que a pessoa precisa aceitar antes de usar. Vazio = está em dia. */
export async function buscarDocumentosPendentes(): Promise<DocumentoLegal[]> {
  const { data, error } = await supabase.rpc('documentos_legais_pendentes');
  if (error !== null) {
    throw error;
  }
  return ordenar(
    ((data ?? []) as Array<Record<string, unknown>>).map((linha) => ({
      id: String(linha.id),
      tipo: linha.tipo as TipoDeDocumento,
      versao: String(linha.versao),
    })),
  );
}

/** Documentos vigentes COM o texto, para a pessoa ler antes de aceitar. */
export async function buscarDocumentosComTexto(): Promise<DocumentoLegal[]> {
  const { data, error } = await supabase.rpc('documentos_legais_vigentes');
  if (error !== null) {
    throw error;
  }
  return ordenar(
    ((data ?? []) as Array<Record<string, unknown>>).map((linha) => ({
      id: String(linha.id),
      tipo: linha.tipo as TipoDeDocumento,
      versao: String(linha.versao),
      conteudo: String(linha.conteudo ?? ''),
    })),
  );
}

/**
 * Registra o aceite. O banco carimba quem, quando e qual versão — é essa linha
 * que prova o consentimento, então ela nunca é escrita pela interface.
 */
export async function aceitarDocumentos(ids: readonly string[]): Promise<void> {
  const { error } = await supabase.rpc('aceitar_documentos_legais', { p_documentos: [...ids] });
  if (error !== null) {
    throw error;
  }
}

export function rotuloDoAceite(documentos: readonly { tipo: TipoDeDocumento }[]): string {
  if (documentos.length === 0) {
    return 'Li e concordo com os Termos de Uso e a Política de Privacidade.';
  }
  const nomes = ordenar([...documentos]).map((documento) => NOME_DO_DOCUMENTO[documento.tipo]);
  return `Li e concordo com ${nomes.join(' e ')}.`;
}

export const TITULO_DO_DOCUMENTO: Record<TipoDeDocumento, string> = {
  privacy_policy: 'Política de Privacidade',
  terms_of_use: 'Termos de Uso',
};
