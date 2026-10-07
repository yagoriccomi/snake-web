import type { SupabaseClient } from '@supabase/supabase-js';

import type { EtapasDoEnvio } from '@/lib/anexos';
import { formatarDiaEHora, type AulaDoAluno } from '@/lib/aulas';
import { ErroDeValidacao } from '@/lib/erros';
import { criarMotivo, etapasDoMotivo } from '@/lib/motivos';

/**
 * Troca de aula (contrato § 9.4, D44–D47): a folha "Trocar aula" sai da aula
 * nova. As opções vêm só das colunas (`can_swap_from`,
 * `can_swap_from_permanent`, `can_swap_to`, `is_recurring`); as recusas, do
 * banco, com a frase dele. Textos da § 3, os mesmos do app
 * (`snake-thai/src/utils/trocas.ts`).
 */

export type TipoDeTroca = 'once' | 'permanent';

export const ROTULO_DO_TIPO: Record<TipoDeTroca, string> = {
  once: 'Só nesta semana',
  permanent: 'Permanente',
};

export const TEXTOS_DA_TROCA = {
  pergunta: 'Qual aula sua você quer trocar por esta?',
  campoDaPermanente: 'Por que você precisa mudar de horário?',
  avisoDaPermanente:
    'A troca permanente muda a sua grade a partir da próxima aula depois da aprovação.',
  semOpcao: 'Nenhuma aula sua nesta semana pode ser trocada por esta.',
  pedida: 'Pedido de troca enviado. A aula nova fica como Troca pendente até a decisão.',
  pedidaSemAnexos:
    'Pedido de troca enviado, sem os anexos que falharam. A aula nova fica como Troca pendente até a decisão.',
  desistiu: 'Você desistiu da troca.',
  confirmarDesistencia: 'Você volta a ter a aula original, e a troca não pode ser retomada.',
} as const;

/** Limite do banco para a justificativa da permanente (`action_reasons.body`). */
export const TAMANHO_MAXIMO_DA_JUSTIFICATIVA_DA_TROCA = 500;

/** A frase do banco para a justificativa da permanente que falta. */
const JUSTIFICATIVA_OBRIGATORIA = 'Para a troca permanente, escreva a justificativa.';

/** Os tipos que esta aula nova aceita, com as aulas dele da semana (§ 12.2, folha). */
export function tiposPossiveis(nova: AulaDoAluno, semana: readonly AulaDoAluno[]): TipoDeTroca[] {
  const tipos: TipoDeTroca[] = [];
  if (semana.some((aula) => aula.id !== nova.id && aula.podeTrocarDe)) tipos.push('once');
  if (nova.recorrente && semana.some((aula) => aula.id !== nova.id && aula.podeTrocarDePermanente)) {
    tipos.push('permanent');
  }
  return tipos;
}

/** As aulas dele que podem sair na troca daquele tipo. A nova nunca entra. */
export function opcoesDeOrigem(
  semana: readonly AulaDoAluno[],
  nova: AulaDoAluno,
  tipo: TipoDeTroca,
): AulaDoAluno[] {
  return semana.filter(
    (aula) => aula.id !== nova.id && (tipo === 'once' ? aula.podeTrocarDe : aula.podeTrocarDePermanente),
  );
}

/** Reposição: a aula original já começou (§ 9.4, `is_makeup`). Nunca na permanente. */
export function ehReposicao(original: AulaDoAluno, agora: Date): boolean {
  return new Date(original.quando) <= agora;
}

/** "Este horário termina em dd/mm." (§ 3), a partir de `AAAA-MM-DD`. */
export function textoDoFimDoHorario(fim: string): string {
  return `Este horário termina em ${fim.slice(8, 10)}/${fim.slice(5, 7)}.`;
}

export interface PedidoDeTroca {
  de: string;
  para: string;
  tipo: TipoDeTroca;
  /** Obrigatório na permanente; proibido na avulsa (P19). */
  justificativa?: string;
}

/** O recado do fim; avisa quando algum anexo da permanente ficou de fora. */
export function recadoDaTroca(faltouAnexo: boolean): string {
  return faltouAnexo ? TEXTOS_DA_TROCA.pedidaSemAnexos : TEXTOS_DA_TROCA.pedida;
}

async function registrarTroca(
  cliente: SupabaseClient,
  pedido: PedidoDeTroca,
  motivoId: string | null,
): Promise<void> {
  const { error } = await cliente.rpc('pedir_troca_de_aula', {
    p_de: pedido.de,
    p_para: pedido.para,
    p_tipo: pedido.tipo,
    p_motivo_id: motivoId,
  });
  if (error !== null) {
    throw error;
  }
}

/**
 * Avulsa: só o pedido, e a troca já acabou (sem etapas). Permanente, nesta
 * ordem (§ 9.4): o motivo `class_swap_evidence` com a justificativa, e as
 * etapas devolvidas anexam até 5 arquivos e só então pedem a troca com ele.
 *
 * @param aoConcluir O que a tela faz com a troca pedida (recado, recarregar).
 */
export async function pedirTroca(
  cliente: SupabaseClient,
  pedido: PedidoDeTroca,
  aoConcluir: (faltouAnexo: boolean) => Promise<void>,
): Promise<EtapasDoEnvio | void> {
  if (pedido.tipo === 'once') {
    await registrarTroca(cliente, pedido, null);
    await aoConcluir(false);
    return;
  }

  const texto = (pedido.justificativa ?? '').trim();
  if (texto === '' || texto.length > TAMANHO_MAXIMO_DA_JUSTIFICATIVA_DA_TROCA) {
    throw new ErroDeValidacao(JUSTIFICATIVA_OBRIGATORIA);
  }
  const motivoId = await criarMotivo(cliente, { tipo: 'class_swap_evidence', classId: null, texto });

  // Se a troca foi pedida e o passo seguinte da tela falhou, o "Tentar de
  // novo" não pode pedir de novo com o mesmo motivo.
  let pedida = false;
  return etapasDoMotivo(cliente, motivoId, async (faltouAnexo) => {
    if (!pedida) {
      await registrarTroca(cliente, pedido, motivoId);
      pedida = true;
    }
    await aoConcluir(faltouAnexo);
  });
}

/** Desfaz a troca pendente, ou a avulsa aprovada antes das duas aulas (T36). */
export async function desistirDaTroca(cliente: SupabaseClient, id: string): Promise<void> {
  const { error } = await cliente.rpc('desistir_da_troca', { p_id: id });
  if (error !== null) {
    throw error;
  }
}

export type SituacaoDaTroca = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface MinhaTroca {
  id: string;
  tipo: TipoDeTroca;
  situacao: SituacaoDaTroca;
  decididaPor: string | null;
  tituloDe: string | null;
  quandoDe: string | null;
  tituloPara: string | null;
  quandoPara: string | null;
  reposicao: boolean;
  /** Só na permanente: o texto que ele mesmo escreveu. */
  motivo: string | null;
  /** Só quando aprovada (D16); nulo quando quem decidiu foi o sistema (T50). */
  aprovadaPor: string | null;
  podeDesistir: boolean;
}

function textoOuNulo(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null;
}

/** Últimos 60 dias e as futuras (os padrões de `minhas_trocas`). */
export async function buscarMinhasTrocas(cliente: SupabaseClient): Promise<MinhaTroca[]> {
  const { data, error } = await cliente.rpc('minhas_trocas');
  if (error !== null) {
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[]).map((linha) => ({
    id: String(linha.id),
    tipo: linha.kind === 'permanent' ? 'permanent' : 'once',
    situacao: linha.status as SituacaoDaTroca,
    decididaPor: textoOuNulo(linha.decided_via),
    tituloDe: textoOuNulo(linha.from_title),
    quandoDe: textoOuNulo(linha.from_date_time),
    tituloPara: textoOuNulo(linha.to_title),
    quandoPara: textoOuNulo(linha.to_date_time),
    reposicao: linha.is_makeup === true,
    motivo: textoOuNulo(linha.motivo_texto),
    aprovadaPor: textoOuNulo(linha.approved_by_name),
    podeDesistir: linha.can_cancel === true,
  }));
}

/** O rótulo do acompanhamento (§ 3). Quem negou nunca aparece (D16). */
export function rotuloDaTroca(
  troca: Pick<MinhaTroca, 'situacao' | 'decididaPor' | 'aprovadaPor'>,
): string {
  switch (troca.situacao) {
    case 'pending':
      return 'Troca pendente';
    case 'approved':
      if (troca.decididaPor === 'system') return 'Troca abonada: a aula nova foi cancelada';
      return troca.aprovadaPor !== null ? `Troca aprovada por ${troca.aprovadaPor}` : 'Troca aprovada';
    case 'rejected':
      return 'Troca negada';
    case 'expired':
      return 'Troca expirada · vale a aula original';
    case 'cancelled':
      return troca.decididaPor === 'student' ? 'Você desistiu da troca' : 'Troca cancelada';
  }
}

/** "Muay Thai · seg 06/10 19:00", ou "Aula removida" quando a aula foi apagada. */
export function descricaoDaAulaDaTroca(titulo: string | null, quando: string | null): string {
  if (titulo === null || quando === null) return 'Aula removida';
  return `${titulo} · ${formatarDiaEHora(quando)}`;
}
