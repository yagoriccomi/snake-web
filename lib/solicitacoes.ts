import type { SupabaseClient } from '@supabase/supabase-js';

import type { SituacaoDaJustificativa } from '@/lib/aulas';
import { ErroDeValidacao } from '@/lib/erros';

/**
 * "Eu estava na aula" (contrato § 9.3, D40): o aluno pede a retificação da
 * chamada. Quem pode pedir, em qual aula e até quando, é o banco que decide
 * (`can_contest`, T19); aqui só se manda o motivo e se acompanha.
 *
 * Os anexos do pedido esperam o G2 (rota `POST /v1/motivos/sign-upload`).
 */

/** Limite do banco para o texto do motivo (btrim 1..500). */
export const TAMANHO_MAXIMO_DO_MOTIVO = 500;

/** A frase do banco para o motivo vazio ou longo, conferida antes da rede. */
const MOTIVO_INVALIDO = 'Escreva o motivo, com até 500 caracteres.';

export const PEDIDO_ENVIADO = 'Pedido enviado. Acompanhe a resposta em Meus pedidos.';

export interface MinhaSolicitacao {
  id: string;
  tituloDaAula: string;
  quandoDaAula: string;
  situacao: SituacaoDaJustificativa;
  /** Só quando aprovada; quem negou nunca aparece (D16). */
  aprovadaPor: string | null;
}

/** Cria o motivo e abre o pedido, nesta ordem (§ 9.3). Devolve o id do pedido. */
export async function pedirEuEstavaNaAula(
  cliente: SupabaseClient,
  classId: string,
  texto: string,
): Promise<string> {
  const limpo = texto.trim();
  if (limpo === '' || limpo.length > TAMANHO_MAXIMO_DO_MOTIVO) {
    throw new ErroDeValidacao(MOTIVO_INVALIDO);
  }
  const motivo = await cliente.rpc('criar_motivo', {
    p_kind: 'request_evidence',
    p_class_id: classId,
    p_texto: limpo,
  });
  if (motivo.error !== null) {
    throw motivo.error;
  }
  const pedido = await cliente.rpc('abrir_solicitacao', {
    p_kind: 'student_was_present',
    p_class_id: classId,
    p_motivo_id: motivo.data,
  });
  if (pedido.error !== null) {
    throw pedido.error;
  }
  return String(pedido.data);
}

/** Os pedidos do aluno; a web só abre o "Eu estava na aula". */
export async function buscarMinhasSolicitacoes(
  cliente: SupabaseClient,
): Promise<MinhaSolicitacao[]> {
  const { data, error } = await cliente.rpc('minhas_solicitacoes');
  if (error !== null) {
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[])
    .filter((linha) => linha.kind === 'student_was_present')
    .map((linha) => ({
      id: String(linha.id),
      tituloDaAula: typeof linha.class_title === 'string' ? linha.class_title : 'Aula',
      quandoDaAula: String(linha.class_date_time),
      situacao: linha.status as SituacaoDaJustificativa,
      aprovadaPor: typeof linha.approved_by_name === 'string' ? linha.approved_by_name : null,
    }));
}

/** Rótulos do pedido, os mesmos do app (Meus pedidos). */
export function rotuloDoPedido(pedido: Pick<MinhaSolicitacao, 'situacao' | 'aprovadaPor'>): string {
  if (pedido.situacao === 'pending') return 'Pedido em análise';
  if (pedido.situacao === 'approved') {
    return pedido.aprovadaPor !== null ? `Pedido aprovado por ${pedido.aprovadaPor}` : 'Pedido aprovado';
  }
  return 'Pedido negado';
}
