import type { SupabaseClient } from '@supabase/supabase-js';

import { chaveDoDia, type Modalidade } from '@/lib/aulas';

/**
 * Frequência pelas RPCs do contrato (§ 11.6): `frequencia_semanal`,
 * `frequencia_do_mes` e `semanas_do_mes`.
 *
 * Toda conta é do banco — esperado, feitas, abono, percentual, semana extra e
 * fechamento. Aqui só se formata e se escolhe o rótulo da § 3. A régua de 70%
 * que a web copiava saiu: o risco (T10) é regra do banco, e o aluno não recebe
 * essa coluna.
 */

type Linha = Record<string, unknown>;

export interface FrequenciaDaSemana {
  modalidade: Modalidade | null;
  /** Cota (livre) ou meta (à vontade); nula no fixo. */
  meta: number | null;
  esperadas: number;
  feitas: number;
  /** Nulo com esperado zero: a tela mostra "—". */
  percentual: number | null;
}

export interface FrequenciaDoMes {
  modalidade: Modalidade | null;
  esperadas: number;
  feitas: number;
  percentual: number | null;
  /** `AAAA-MM-DD`: domingo da última semana do mês, ou da semana extra final. */
  fechaEm: string | null;
  fechado: boolean;
}

export interface SemanaDoMes {
  inicio: string;
  fim: string;
  /** "S1" a "S5" ou "Semana extra". */
  rotulo: string;
  dividida: boolean;
  esperadasNaSemana: number;
  feitasNaSemana: number;
  percentualDaSemana: number | null;
  esperadasNoMes: number;
  feitasNoMes: number;
  /** Só livre: a semana ainda aceita justificativa (prazo e teto T17 do banco). */
  podeJustificar: boolean;
  justificarAte: string | null;
  justificativasRestantes: number | null;
  justificativas: JustificativaDaSemana[];
}

export interface JustificativaDaSemana {
  id: string;
  situacao: 'pending' | 'approved' | 'rejected';
  tentativa: number;
  aprovadaPor: string | null;
}

function numero(valor: unknown): number {
  return Number(valor ?? 0);
}

function numeroOuNulo(valor: unknown): number | null {
  return valor === null || valor === undefined ? null : Number(valor);
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null;
}

function exigirSemErro<T>(resposta: { data: T; error: unknown }): T {
  if (resposta.error !== null && resposta.error !== undefined) {
    throw resposta.error;
  }
  return resposta.data;
}

/** A semana de hoje (seg–dom), no fuso da academia. */
export async function buscarFrequenciaDaSemana(
  cliente: SupabaseClient,
  userId: string,
  hoje: Date,
): Promise<FrequenciaDaSemana | null> {
  const dia = chaveDoDia(hoje);
  const linhas = exigirSemErro(
    await cliente.rpc('frequencia_semanal', { p_user_ids: [userId], p_de: dia, p_ate: dia }),
  ) as Linha[] | null;
  const linha = linhas?.[0];
  if (linha === undefined) return null;
  return {
    modalidade: texto(linha.schedule_mode) as Modalidade | null,
    meta: numeroOuNulo(linha.weekly_target),
    esperadas: numero(linha.expected),
    feitas: numero(linha.attended),
    percentual: numeroOuNulo(linha.frequency_percent),
  };
}

/** `mes`: qualquer dia do mês, `AAAA-MM-DD`. */
export async function buscarFrequenciaDoMes(
  cliente: SupabaseClient,
  userId: string,
  mes: string,
): Promise<FrequenciaDoMes | null> {
  const linhas = exigirSemErro(
    await cliente.rpc('frequencia_do_mes', { p_user_ids: [userId], p_mes: mes }),
  ) as Linha[] | null;
  const linha = linhas?.[0];
  if (linha === undefined) return null;
  return {
    modalidade: texto(linha.schedule_mode) as Modalidade | null,
    esperadas: numero(linha.expected),
    feitas: numero(linha.attended),
    percentual: numeroOuNulo(linha.frequency_percent),
    fechaEm: texto(linha.closes_on),
    fechado: linha.is_closed === true,
  };
}

export async function buscarSemanasDoMes(
  cliente: SupabaseClient,
  userId: string,
  mes: string,
): Promise<SemanaDoMes[]> {
  const linhas = exigirSemErro(
    await cliente.rpc('semanas_do_mes', { p_user_id: userId, p_mes: mes }),
  ) as Linha[] | null;
  return (linhas ?? []).map((linha) => ({
    inicio: String(linha.week_start),
    fim: String(linha.week_end),
    rotulo: texto(linha.label) ?? '',
    dividida: linha.is_split === true,
    esperadasNaSemana: numero(linha.expected_week),
    feitasNaSemana: numero(linha.attended_week),
    percentualDaSemana: numeroOuNulo(linha.week_percent),
    esperadasNoMes: numero(linha.expected_in_month),
    feitasNoMes: numero(linha.attended_in_month),
    podeJustificar: linha.can_justify === true,
    justificarAte: texto(linha.justify_until),
    justificativasRestantes: numeroOuNulo(linha.justifications_left),
    justificativas: (Array.isArray(linha.justificativas) ? (linha.justificativas as Linha[]) : []).map(
      (j) => ({
        id: String(j.id),
        situacao: j.status as JustificativaDaSemana['situacao'],
        tentativa: numero(j.attempt),
        aprovadaPor: texto(j.approved_by_name),
      }),
    ),
  }));
}

// ----------------------------------------------------------------------------
// Formatação e rótulos da § 3
// ----------------------------------------------------------------------------

const FORMATO_DO_PERCENTUAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** "37,5%"; sem esperado, "—" (§ 3). */
export function formatarPercentual(percentual: number | null): string {
  return percentual === null ? '—' : `${FORMATO_DO_PERCENTUAL.format(percentual)}%`;
}

/** "{a} de {e}" da § 3. */
export function feitasDeEsperadas(feitas: number, esperadas: number): string {
  return `${feitas} de ${esperadas}`;
}

/** Rótulo da modalidade (§ 3); sem plano conta como fixo (T5). */
export const ROTULO_DA_MODALIDADE: Record<Modalidade, string> = {
  fixed: 'Horário fixo',
  free: 'Horário livre',
  unlimited: 'À vontade',
};

export function rotuloDaModalidade(modalidade: Modalidade | null): string {
  return ROTULO_DA_MODALIDADE[modalidade ?? 'fixed'];
}

/** À vontade: "Meta da semana" e "Meta do mês"; os outros: "Semana" e "Mês". */
export function rotulosDaFrequencia(modalidade: Modalidade | null): { semana: string; mes: string } {
  return modalidade === 'unlimited'
    ? { semana: 'Meta da semana', mes: 'Meta do mês' }
    : { semana: 'Semana', mes: 'Mês' };
}

/** `AAAA-MM-DD` → `dd/mm`, sem passar por fuso: a data já vem do banco. */
export function diaEMesDaData(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/** Primeiro dia do mês, `AAAA-MM-01`. */
export function primeiroDiaDoMes(data: string): string {
  return `${data.slice(0, 7)}-01`;
}

/** Último dia do mês de `mes` (`AAAA-MM-…`), `AAAA-MM-DD`. */
export function ultimoDiaDoMes(mes: string): string {
  const ano = Number(mes.slice(0, 4));
  const mesNumero = Number(mes.slice(5, 7));
  const dias = new Date(Date.UTC(ano, mesNumero, 0)).getUTCDate();
  return `${mes.slice(0, 7)}-${String(dias).padStart(2, '0')}`;
}

/** Soma `meses` a `AAAA-MM-01`. */
export function somarMeses(mes: string, meses: number): string {
  const ano = Number(mes.slice(0, 4));
  const indice = Number(mes.slice(5, 7)) - 1 + meses;
  const data = new Date(Date.UTC(ano, indice, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/** "Outubro de 2026". */
export function nomeDoMes(mes: string): string {
  const nome = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${primeiroDiaDoMes(mes)}T12:00:00Z`));
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
}

/**
 * "Fecha em {dd/mm}, quando a semana extra terminar" (§ 3): só depois do fim
 * do mês, enquanto o banco disser que ele ainda não fechou.
 */
export function avisoDeMesAberto(
  frequencia: FrequenciaDoMes,
  mes: string,
  hoje: Date,
): string | null {
  if (frequencia.fechado || frequencia.fechaEm === null) return null;
  if (chaveDoDia(hoje) <= ultimoDiaDoMes(mes)) return null;
  return `Fecha em ${diaEMesDaData(frequencia.fechaEm)}, quando a semana extra terminar`;
}

/** "resta 1 justificativa" / "restam 2 justificativas", como no app. */
export function textoDasQueRestam(restam: number): string {
  return restam === 1 ? 'resta 1 justificativa' : `restam ${restam} justificativas`;
}

/** As semanas que entram no bloco de justificativas: as que aceitam ou já têm alguma. */
export function semanasParaJustificar(semanas: readonly SemanaDoMes[]): SemanaDoMes[] {
  return semanas.filter((semana) => semana.podeJustificar || semana.justificativas.length > 0);
}
