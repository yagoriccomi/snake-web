import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Aulas do aluno pela RPC `aulas_do_aluno` (contrato § 12).
 *
 * O banco decide quais aulas o aluno vê (a grade efetiva do fixo, as aulas
 * abertas ao livre, as trocas e as extras) e devolve o estado de cada uma. Aqui
 * só se escolhe o rótulo pelas colunas: nada é calculado nesta camada.
 *
 * Recebe o cliente como parâmetro para os rótulos e a leitura serem testados
 * sem rede.
 */

const FUSO = 'America/Sao_Paulo';
// São Paulo não tem horário de verão desde 2019: o início do dia é sempre às 03:00 UTC.
const DESLOCAMENTO_DE_SAO_PAULO = '-03:00';
const COR_EM_HEX = /^#[0-9a-f]{6}$/i;

export type Publico = 'fixed' | 'free' | 'both';
export type Modalidade = 'fixed' | 'free' | 'unlimited';
export type SituacaoDaPresenca = 'present' | 'absent' | 'excused';
export type SituacaoDaJustificativa = 'pending' | 'approved' | 'rejected';
export type SituacaoDaTroca = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface Professor {
  nome: string;
  /** Cor do professor no app; nula quando o banco não traz um hex válido. */
  cor: string | null;
}

export interface Troca {
  tipo: 'once' | 'permanent';
  situacao: SituacaoDaTroca;
  decididaPor: 'review' | 'roll_call' | 'student' | 'system' | null;
  /** `origem`: esta é a aula que ele trocou; `destino`: esta é a aula nova. */
  papel: 'origem' | 'destino';
  /** Data e hora da outra aula da troca. */
  outraQuando: string | null;
}

export interface AulaDoAluno {
  id: string;
  titulo: string;
  quando: string;
  publico: Publico;
  cancelada: boolean;
  declarada: SituacaoDaPresenca | null;
  justificativa: SituacaoDaJustificativa | null;
  modalidade: Modalidade | null;
  professores: Professor[];
  /** Vocabulário da § 7.2 (`turma`, `troca`, `extra`, `trocou`…); nulo = aula que não é dele. */
  origem: string | null;
  troca: Troca | null;
}

/** Cor do selo: cada uma vira um token de tema na folha de estilo. */
export type TomDoSelo = 'cancelada' | 'livres' | 'fixos' | 'sua' | 'troca' | 'pendente' | 'extra' | 'marcada';

export interface Selo {
  texto: string;
  tom: TomDoSelo;
}

// ----------------------------------------------------------------------------
// Leitura
// ----------------------------------------------------------------------------

type Linha = Record<string, unknown>;

function texto(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null;
}

function professores(valor: unknown): Professor[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((item: Linha) => {
    const cor = texto(item.color);
    return {
      nome: texto(item.name) ?? '',
      cor: cor !== null && COR_EM_HEX.test(cor) ? cor : null,
    };
  });
}

function troca(linha: Linha): Troca | null {
  const situacao = texto(linha.swap_status);
  const papel = texto(linha.swap_role);
  if (situacao === null || papel === null) return null;
  return {
    tipo: linha.swap_kind === 'permanent' ? 'permanent' : 'once',
    situacao: situacao as SituacaoDaTroca,
    decididaPor: texto(linha.swap_decided_via) as Troca['decididaPor'],
    papel: papel as Troca['papel'],
    outraQuando: texto(linha.swap_other_date_time),
  };
}

export function lerAulaDoAluno(linha: Linha): AulaDoAluno {
  return {
    id: String(linha.class_id),
    titulo: texto(linha.title) ?? 'Aula',
    quando: String(linha.date_time),
    publico: (texto(linha.audience) ?? 'both') as Publico,
    cancelada: linha.cancelled === true,
    declarada: texto(linha.declared_status) as SituacaoDaPresenca | null,
    justificativa: texto(linha.justification_status) as SituacaoDaJustificativa | null,
    modalidade: texto(linha.schedule_mode) as Modalidade | null,
    professores: professores(linha.teachers),
    origem: texto(linha.origem),
    troca: troca(linha),
  };
}

/** As aulas do próprio aluno entre `de` e `ate`, na ordem do horário. */
export async function buscarAulasDoAluno(
  cliente: SupabaseClient,
  de: Date,
  ate: Date,
): Promise<AulaDoAluno[]> {
  const { data, error } = await cliente.rpc('aulas_do_aluno', {
    p_de: de.toISOString(),
    p_ate: ate.toISOString(),
  });
  if (error !== null) {
    throw error;
  }
  return ((data ?? []) as Linha[])
    .map(lerAulaDoAluno)
    .sort((a, b) => a.quando.localeCompare(b.quando));
}

// ----------------------------------------------------------------------------
// Datas, sempre no fuso da academia
// ----------------------------------------------------------------------------

/** `AAAA-MM-DD` do dia em São Paulo. */
export function chaveDoDia(instante: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/** 00:00 de hoje em São Paulo. */
export function inicioDoDia(agora: Date): Date {
  return new Date(`${chaveDoDia(agora)}T00:00:00${DESLOCAMENTO_DE_SAO_PAULO}`);
}

function diaDaSemana(instante: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'short' })
    .format(instante)
    .replace('.', '');
}

function diaEMes(instante: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' }).format(
    instante,
  );
}

export function formatarHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** `{dia dd/mm hh:mm}` da § 3, como em "Trocou para qua 24/09 12:00". */
export function formatarDiaEHora(iso: string): string {
  const instante = new Date(iso);
  return `${diaDaSemana(instante)} ${diaEMes(instante)} ${formatarHora(iso)}`;
}

export interface DiaDeAulas {
  chave: string;
  /** "Hoje · ter 23/09" ou "Qua 24/09", como nos mockups. */
  rotulo: string;
  aulas: AulaDoAluno[];
}

export function agruparPorDia(aulas: readonly AulaDoAluno[], agora: Date): DiaDeAulas[] {
  const hoje = chaveDoDia(agora);
  const dias = new Map<string, DiaDeAulas>();
  for (const aula of aulas) {
    const instante = new Date(aula.quando);
    const chave = chaveDoDia(instante);
    let dia = dias.get(chave);
    if (dia === undefined) {
      const semana = diaDaSemana(instante);
      const data = diaEMes(instante);
      const rotulo =
        chave === hoje
          ? `Hoje · ${semana} ${data}`
          : `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${data}`;
      dia = { chave, rotulo, aulas: [] };
      dias.set(chave, dia);
    }
    dia.aulas.push(aula);
  }
  return [...dias.values()];
}

// ----------------------------------------------------------------------------
// Rótulos da § 3, escolhidos só pelas colunas
// ----------------------------------------------------------------------------

const SELO_DA_ORIGEM: Record<string, Selo> = {
  turma: { texto: 'Sua aula', tom: 'sua' },
  permanente: { texto: 'Troca permanente', tom: 'troca' },
  troca: { texto: 'Troca', tom: 'troca' },
};

const SELO_DO_PUBLICO: Partial<Record<Publico, Selo>> = {
  free: { texto: 'Livres', tom: 'livres' },
  fixed: { texto: 'Fixos', tom: 'fixos' },
};

/** O que a aula é: fica junto do título. Cancelada fala sozinha. */
export function selosDaAula(aula: AulaDoAluno): Selo[] {
  if (aula.cancelada) return [{ texto: 'Cancelada', tom: 'cancelada' }];
  const selos: Selo[] = [];
  const daOrigem = aula.origem === null ? undefined : SELO_DA_ORIGEM[aula.origem];
  if (daOrigem !== undefined) selos.push(daOrigem);
  const doPublico = SELO_DO_PUBLICO[aula.publico];
  if (doPublico !== undefined) selos.push(doPublico);
  return selos;
}

/** O que o aluno fez nela: fica à direita, onde depois entram os botões. */
export function estadoDaAula(aula: AulaDoAluno): Selo | null {
  if (aula.cancelada) return null;
  if (aula.origem === 'troca_pendente') return { texto: 'Troca pendente', tom: 'pendente' };
  if (aula.origem === 'extra') return { texto: 'Extra', tom: 'extra' };
  if (aula.modalidade !== 'fixed' && aula.declarada === 'present') {
    return { texto: 'Marcada', tom: 'marcada' };
  }
  return null;
}

/** A frase da troca mais recente desta aula (§ 3), quando há uma. */
export function notaDaTroca(aula: AulaDoAluno): string | null {
  const { troca: t } = aula;
  if (t === null) return null;
  const outra = t.outraQuando === null ? null : formatarDiaEHora(t.outraQuando);

  if (t.situacao === 'rejected') return 'Troca negada';
  if (t.situacao === 'expired') return 'Troca expirada · vale a aula original';
  if (t.situacao === 'cancelled') {
    return t.decididaPor === 'student' ? 'Você desistiu da troca' : 'Troca cancelada';
  }
  if (outra === null || t.tipo === 'permanent') return null;
  if (t.papel === 'origem') {
    return t.situacao === 'pending' ? `Troca pendente para ${outra}` : `Trocou para ${outra}`;
  }
  return t.situacao === 'approved' ? `no lugar de ${outra}` : null;
}
