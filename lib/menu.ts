import type { SupabaseClient } from '@supabase/supabase-js';

import { chaveDoDia, lerAulaDoAluno, type AulaDoAluno } from '@/lib/aulas';

/**
 * Menu de aulas (contrato § 12.2, D43, T43): `menu_de_aulas(p_semana)`, só
 * esta semana ou a próxima, com as mesmas colunas de `aulas_do_aluno`. Os dias
 * do menu vêm de `academy_settings.class_weekdays` (leitura direta, § 12.2).
 */

/** Sem configuração, os dias que o banco também usa na conta da cota (seg a sáb). */
const DIAS_PADRAO = [1, 2, 3, 4, 5, 6];
const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

export async function buscarMenuDeAulas(
  cliente: SupabaseClient,
  semana: string,
): Promise<AulaDoAluno[]> {
  const { data, error } = await cliente.rpc('menu_de_aulas', { p_semana: semana });
  if (error !== null) {
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[])
    .map(lerAulaDoAluno)
    .sort((a, b) => a.quando.localeCompare(b.quando));
}

/** Dias da semana de aula (0 = domingo … 6 = sábado), como o banco guarda. */
export async function buscarDiasDeAula(cliente: SupabaseClient): Promise<number[]> {
  const { data, error } = await cliente.from('academy_settings').select('class_weekdays').limit(1);
  if (error !== null) {
    throw error;
  }
  const dias = (data?.[0] as { class_weekdays?: unknown } | undefined)?.class_weekdays;
  return Array.isArray(dias) && dias.length > 0 ? dias.map(Number) : DIAS_PADRAO;
}

export interface DiaDoMenu {
  /** `AAAA-MM-DD`. */
  chave: string;
  /** "Seg". */
  semana: string;
  /** "22". */
  dia: string;
  passado: boolean;
  aulas: AulaDoAluno[];
}

function somarDias(data: string, dias: number): string {
  return new Date(Date.parse(`${data}T12:00:00Z`) + dias * UM_DIA_EM_MS).toISOString().slice(0, 10);
}

function nomeCurtoDoDia(data: string): string {
  const nome = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(`${data}T12:00:00Z`))
    .replace('.', '');
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
}

/**
 * Um dia por dia de aula configurado; aula num dia que não está configurado
 * aparece no dia dela (§ 12.2). `segunda`: `AAAA-MM-DD` da segunda da semana.
 */
export function diasDoMenu(
  segunda: string,
  diasDeAula: readonly number[],
  aulas: readonly AulaDoAluno[],
  agora: Date,
): DiaDoMenu[] {
  const hoje = chaveDoDia(agora);
  const porDia = new Map<string, AulaDoAluno[]>();
  for (const dia of diasDeAula) {
    // 0 = domingo: a semana do menu vai de segunda a domingo.
    porDia.set(somarDias(segunda, (dia + 6) % 7), []);
  }
  for (const aula of aulas) {
    const chave = chaveDoDia(new Date(aula.quando));
    porDia.set(chave, [...(porDia.get(chave) ?? []), aula]);
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, lista]) => ({
      chave,
      semana: nomeCurtoDoDia(chave),
      dia: chave.slice(8, 10),
      passado: chave < hoje,
      aulas: lista,
    }));
}

/** O dia aberto ao entrar: hoje, se a semana tem hoje; senão, o primeiro. */
export function diaInicial(dias: readonly DiaDoMenu[], agora: Date): string | null {
  const hoje = chaveDoDia(agora);
  return dias.find((dia) => dia.chave === hoje)?.chave ?? dias[0]?.chave ?? null;
}

/** "2 aulas", "1 aula". */
export function quantasAulas(n: number): string {
  return n === 1 ? '1 aula' : `${n} aulas`;
}
