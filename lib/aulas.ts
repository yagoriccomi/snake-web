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
  /** Evento: qualquer aluno declara, sem olhar público nem turma (§ 9.2). */
  evento: boolean;
  quando: string;
  publico: Publico;
  cancelada: boolean;
  declarada: SituacaoDaPresenca | null;
  /** Presença pela chamada do professor; nula sem chamada. */
  presenca: SituacaoDaPresenca | null;
  justificativa: SituacaoDaJustificativa | null;
  /** Fixo: a aula ainda aceita justificativa (prazo, grade, troca: o banco decide). */
  podeJustificar: boolean;
  /** "Eu estava na aula": chamada feita, ele sem presença, dentro do prazo (T19). */
  podeContestar: boolean;
  modalidade: Modalidade | null;
  /** Cota (livre) ou meta (à vontade) da semana da aula; nula no fixo. */
  meta: number | null;
  professores: Professor[];
  /** Vocabulário da § 7.2 (`turma`, `troca`, `extra`, `trocou`…); nulo = aula que não é dele. */
  origem: string | null;
  /** Fixo: pode marcar "Vou (extra)" agora (§ 9.5). */
  podeMarcarExtra: boolean;
  /** Fixo: pode ser a aula original de uma troca só nesta semana (§ 9.4). */
  podeTrocarDe: boolean;
  /** Fixo: pode ser a aula original de uma troca permanente. */
  podeTrocarDePermanente: boolean;
  /** Fixo: pode ser a aula nova de uma troca (os dois tipos). */
  podeTrocarPara: boolean;
  /** Veio da grade semanal: pode ser destino de troca permanente. */
  recorrente: boolean;
  /** `AAAA-MM-DD`: último dia do horário, quando ele tem fim. */
  horarioTerminaEm: string | null;
  /** A troca mais recente desta aula (a que o "Desistir da troca" desfaz). */
  trocaId: string | null;
  /** Ele ainda pode desistir dela (§ 9.4, T36): o banco decide. */
  podeDesistirDaTroca: boolean;
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
    evento: linha.type === 'event',
    quando: String(linha.date_time),
    publico: (texto(linha.audience) ?? 'both') as Publico,
    cancelada: linha.cancelled === true,
    declarada: texto(linha.declared_status) as SituacaoDaPresenca | null,
    presenca: texto(linha.status) as SituacaoDaPresenca | null,
    justificativa: texto(linha.justification_status) as SituacaoDaJustificativa | null,
    podeJustificar: linha.can_justify === true,
    podeContestar: linha.can_contest === true,
    modalidade: texto(linha.schedule_mode) as Modalidade | null,
    meta: typeof linha.weekly_target === 'number' ? linha.weekly_target : null,
    professores: professores(linha.teachers),
    origem: texto(linha.origem),
    podeMarcarExtra: linha.can_mark_extra === true,
    podeTrocarDe: linha.can_swap_from === true,
    podeTrocarDePermanente: linha.can_swap_from_permanent === true,
    podeTrocarPara: linha.can_swap_to === true,
    recorrente: linha.is_recurring === true,
    horarioTerminaEm: texto(linha.schedule_ends_on),
    trocaId: texto(linha.swap_id),
    podeDesistirDaTroca: linha.can_cancel_swap === true,
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

/** 00:00 da segunda-feira desta semana em São Paulo (a semana vai de seg a dom). */
export function inicioDaSemana(agora: Date): Date {
  const hoje = inicioDoDia(agora);
  const domingoEhZero = new Date(`${chaveDoDia(agora)}T12:00:00Z`).getUTCDay();
  const diasDesdeSegunda = (domingoEhZero + 6) % 7;
  return new Date(hoje.getTime() - diasDesdeSegunda * 24 * 60 * 60 * 1000);
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

/** "dd/mm" de um instante, no fuso da academia. */
export function diaEMesDoInstante(iso: string): string {
  return diaEMes(new Date(iso));
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

// ----------------------------------------------------------------------------
// Declarar (§ 9.2, § 9.5 e a tabela de ações da § 12.2)
// ----------------------------------------------------------------------------

export interface AcaoDeDeclarar {
  rotulo: 'Vou' | 'Não vou' | 'Vou (extra)' | 'Desmarcar';
  /** O que vai para `declarar_aula(p_class_id, p_vou)`. */
  vou: boolean;
  /** Vou / Não vou do fixo: qual dos dois ele já avisou. */
  escolhido?: boolean;
}

/** As origens em que a aula é da grade do fixo e ele avisa Vou / Não vou. */
const ORIGENS_DA_GRADE = new Set(['turma', 'permanente', 'troca']);

function ehLivre(aula: AulaDoAluno): boolean {
  // Sem plano conta como fixo (T5): só livre e à vontade saem do caminho do fixo.
  return aula.modalidade === 'free' || aula.modalidade === 'unlimited';
}

/** Na aula que ele trocou, ou com troca pendente, a ação é desistir da troca (6.14). */
function emTroca(aula: AulaDoAluno): boolean {
  if (aula.origem === 'trocou' || aula.origem === 'troca_pendente') return true;
  return aula.troca?.papel === 'origem' && aula.troca.situacao === 'pending';
}

/**
 * Os botões de declarar, só pelas colunas. Depois do início não há botão: o
 * banco recusa a declaração (T26), e um botão que sempre falha não ajuda.
 */
export function acoesDeDeclarar(aula: AulaDoAluno, agora: Date): AcaoDeDeclarar[] {
  if (aula.cancelada || new Date(aula.quando) <= agora || emTroca(aula)) return [];
  const marcada = aula.declarada === 'present';

  if (aula.evento || ehLivre(aula)) {
    if (!aula.evento && aula.publico === 'fixed') return [];
    return marcada ? [{ rotulo: 'Desmarcar', vou: false }] : [{ rotulo: 'Vou', vou: true }];
  }

  if (aula.origem !== null && ORIGENS_DA_GRADE.has(aula.origem)) {
    return [
      { rotulo: 'Vou', vou: true, escolhido: marcada },
      { rotulo: 'Não vou', vou: false, escolhido: aula.declarada === 'absent' },
    ];
  }
  if (aula.origem === 'extra') return [{ rotulo: 'Desmarcar', vou: false }];
  if (aula.podeMarcarExtra) return [{ rotulo: 'Vou (extra)', vou: true }];
  return [];
}

export interface Declaracao {
  marcadasNaSemana: number;
  cota: number | null;
  acimaDaCota: boolean;
}

export async function declararAula(
  cliente: SupabaseClient,
  classId: string,
  vou: boolean,
): Promise<Declaracao> {
  const { data, error } = await cliente.rpc('declarar_aula', { p_class_id: classId, p_vou: vou });
  if (error !== null) {
    throw error;
  }
  const resposta = (data ?? {}) as Linha;
  return {
    marcadasNaSemana: Number(resposta.marcadas_na_semana ?? 0),
    cota: typeof resposta.cota === 'number' ? resposta.cota : null,
    acimaDaCota: resposta.acima_da_cota === true,
  };
}

/** O aviso que não bloqueia (§ 3), com os números que o banco devolveu. */
export function avisoDeCota(declaracao: Declaracao): string | null {
  if (!declaracao.acimaDaCota || declaracao.cota === null) return null;
  return `Você marcou ${declaracao.marcadasNaSemana} aulas nesta semana e seu plano é ${declaracao.cota}x. Pode ir: fica registrado acima do plano.`;
}

// ----------------------------------------------------------------------------
// "Esta semana" (6.4), com a mesma leitura das colunas que o app usa
// ----------------------------------------------------------------------------

export interface ResumoDaSemana {
  modalidade: Modalidade | null;
  /** Cota (livre) ou meta (à vontade); nula no fixo. */
  meta: number | null;
  /** Presenças confirmadas pela chamada, em aula de rotina. */
  feitas: number;
  /** "Vou" ainda sem chamada. */
  marcadas: number;
}

/** A partir das aulas da semana (seg a dom); nulo sem aula nenhuma. */
export function resumoDaSemana(aulas: readonly AulaDoAluno[]): ResumoDaSemana | null {
  const primeira = aulas[0];
  if (primeira === undefined) return null;
  const rotina = aulas.filter((aula) => !aula.evento && !aula.cancelada);
  return {
    modalidade: primeira.modalidade,
    meta: primeira.meta,
    feitas: rotina.filter((aula) => aula.presenca === 'present').length,
    marcadas: rotina.filter((aula) => aula.declarada === 'present' && aula.presenca === null).length,
  };
}

/** "1 feita", "2 marcadas". */
export function contagem(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
