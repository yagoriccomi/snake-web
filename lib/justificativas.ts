import type { SupabaseClient } from '@supabase/supabase-js';

import { diaEMesDoInstante, type SituacaoDaJustificativa } from '@/lib/aulas';
import { ErroDeValidacao } from '@/lib/erros';

/**
 * Justificativas pelas RPCs do contrato (§ 9.1): `enviar_justificativa`,
 * `reenviar_justificativa` e `minhas_justificativas`. Prazo, teto da semana,
 * grade e reenvio são do banco; os rótulos são os da § 3, com a mesma leitura
 * do app (`snake-thai/src/utils/justificativas.ts`).
 *
 * O anexo (atestado) vai depois do texto, pelo `lib/anexos.ts`: o banco só
 * aceita anexo numa justificativa que já existe.
 */

/** Limite do banco para o texto (btrim 1..255). */
export const TAMANHO_MAXIMO_DA_JUSTIFICATIVA = 255;

/** A frase do banco para o texto vazio, verificada aqui antes de ir à rede. */
const TEXTO_OBRIGATORIO = 'Escreva o motivo da falta.';

/** § 3: a 2ª negada encerra o caminho (D42); vem com o bloco de contato (6.15). */
export const NEGADA_PELA_SEGUNDA_VEZ =
  'Justificativa negada. Para mais informações, procure o professor da aula ou a administração da academia.';

/**
 * O recado depois do envio. Sem o anexo, ele diz isso: a pessoa pode ter
 * escolhido seguir sem um arquivo que achava que tinha ido.
 */
export function recadoDaJustificativa(
  envio: 'enviada' | 'reenviada',
  faltouAnexo: boolean,
): string {
  const semAnexo = faltouAnexo ? ', sem o anexo' : '';
  return `Justificativa ${envio}${semAnexo}. A academia vai analisar.`;
}

export type EnvioDeJustificativa =
  | { escopo: 'class'; classId: string; texto: string }
  | { escopo: 'week'; semana: string; texto: string };

export interface MinhaJustificativa {
  id: string;
  escopo: 'class' | 'week';
  tituloDaAula: string | null;
  quandoDaAula: string | null;
  /** `AAAA-MM-DD`, a segunda da semana. */
  semana: string;
  mensagem: string | null;
  situacao: SituacaoDaJustificativa;
  tentativa: number;
  /** Só quando aprovada (D16). */
  aprovadaPor: string | null;
  podeReenviar: boolean;
  reenviarAte: string | null;
}

function textoValidado(texto: string): string {
  const limpo = texto.trim();
  if (limpo === '') throw new ErroDeValidacao(TEXTO_OBRIGATORIO);
  if (limpo.length > TAMANHO_MAXIMO_DA_JUSTIFICATIVA) {
    throw new ErroDeValidacao(
      `A justificativa pode ter até ${TAMANHO_MAXIMO_DA_JUSTIFICATIVA} caracteres.`,
    );
  }
  return limpo;
}

/** Devolve o id da justificativa nova. */
export async function enviarJustificativa(
  cliente: SupabaseClient,
  envio: EnvioDeJustificativa,
): Promise<string> {
  const { data, error } = await cliente.rpc('enviar_justificativa', {
    p_scope: envio.escopo,
    p_class_id: envio.escopo === 'class' ? envio.classId : null,
    p_week_start: envio.escopo === 'week' ? envio.semana : null,
    p_texto: textoValidado(envio.texto),
  });
  if (error !== null) {
    throw error;
  }
  return String(data);
}

export async function reenviarJustificativa(
  cliente: SupabaseClient,
  id: string,
  texto: string,
): Promise<void> {
  const { error } = await cliente.rpc('reenviar_justificativa', {
    p_id: id,
    p_texto: textoValidado(texto),
  });
  if (error !== null) {
    throw error;
  }
}

export async function buscarMinhasJustificativas(
  cliente: SupabaseClient,
): Promise<MinhaJustificativa[]> {
  const { data, error } = await cliente.rpc('minhas_justificativas');
  if (error !== null) {
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[]).map((linha) => ({
    id: String(linha.id),
    escopo: linha.scope === 'week' ? 'week' : 'class',
    tituloDaAula: typeof linha.class_title === 'string' ? linha.class_title : null,
    quandoDaAula: typeof linha.class_date_time === 'string' ? linha.class_date_time : null,
    semana: String(linha.week_start),
    mensagem: typeof linha.message === 'string' ? linha.message : null,
    situacao: linha.status as SituacaoDaJustificativa,
    tentativa: Number(linha.attempt ?? 1),
    aprovadaPor: typeof linha.approved_by_name === 'string' ? linha.approved_by_name : null,
    podeReenviar: linha.can_resend === true,
    reenviarAte: typeof linha.resend_until === 'string' ? linha.resend_until : null,
  }));
}

// ----------------------------------------------------------------------------
// Rótulos da § 3
// ----------------------------------------------------------------------------

export function negadaPelaSegundaVez(j: Pick<MinhaJustificativa, 'situacao' | 'tentativa'>): boolean {
  return j.situacao === 'rejected' && j.tentativa >= 2;
}

/** O rótulo completo, como em Minhas justificativas. */
export function rotuloDaJustificativa(
  j: Pick<MinhaJustificativa, 'situacao' | 'tentativa' | 'aprovadaPor' | 'podeReenviar' | 'reenviarAte'>,
): string {
  if (j.situacao === 'pending') return 'Justificativa em análise';
  if (j.situacao === 'approved') {
    // D16: quem aprovou aparece; sem o nome (conta excluída), o rótulo fica sem ele.
    return j.aprovadaPor !== null
      ? `Justificativa aprovada por ${j.aprovadaPor}`
      : 'Justificativa aprovada';
  }
  if (negadaPelaSegundaVez(j)) return NEGADA_PELA_SEGUNDA_VEZ;
  // Passado o prazo do reenvio, a data não tem mais o que prometer.
  if (j.podeReenviar && j.reenviarAte !== null) {
    return `Justificativa negada · você pode reenviar até ${diaEMesDoInstante(j.reenviarAte)}`;
  }
  return 'Justificativa negada';
}

/**
 * O selo curto na linha da aula, que só traz a situação (`aulas_do_aluno` não
 * traz o nome de quem aprovou nem a tentativa). O detalhe fica em Minhas
 * justificativas.
 */
export const SELO_DA_JUSTIFICATIVA: Record<SituacaoDaJustificativa, string> = {
  pending: 'Justificativa em análise',
  approved: 'Justificativa aprovada',
  rejected: 'Justificativa negada',
};

/** Do que trata a justificativa: a aula perdida ou a semana do livre. */
export function assuntoDaJustificativa(j: MinhaJustificativa): string {
  if (j.quandoDaAula !== null) {
    const quando = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(j.quandoDaAula));
    return `${j.tituloDaAula ?? 'Aula'} · ${quando.replace(',', '')}`;
  }
  return `Semana de ${j.semana.slice(8, 10)}/${j.semana.slice(5, 7)}`;
}
