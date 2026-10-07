import type { SupabaseClient } from '@supabase/supabase-js';

import type { EtapasDoEnvio } from '@/lib/anexos';
import type { SituacaoDaJustificativa } from '@/lib/aulas';
import { ErroDeValidacao } from '@/lib/erros';
import { criarMotivo, etapasDoMotivo } from '@/lib/motivos';

/**
 * "Eu estava na aula" (contrato § 9.3, D40): o aluno pede a retificação da
 * chamada. Quem pode pedir, em qual aula e até quando, é o banco que decide
 * (`can_contest`, T19); aqui só se manda o motivo, com até 5 anexos, e se
 * acompanha.
 */

/** Limite do banco para o texto do motivo (btrim 1..500). */
export const TAMANHO_MAXIMO_DO_MOTIVO = 500;

/** A frase do banco para o motivo vazio ou longo, conferida antes da rede. */
const MOTIVO_INVALIDO = 'Escreva o motivo, com até 500 caracteres.';

const PEDIDO_ENVIADO ='Pedido enviado. Acompanhe a resposta em Meus pedidos.';

export interface MinhaSolicitacao {
  id: string;
  tituloDaAula: string;
  quandoDaAula: string;
  situacao: SituacaoDaJustificativa;
  /** Só quando aprovada; quem negou nunca aparece (D16). */
  aprovadaPor: string | null;
}

/** O recado do fim; avisa quando algum anexo ficou de fora. */
export function recadoDoPedido(faltouAnexo: boolean): string {
  return faltouAnexo
    ? 'Pedido enviado, sem os anexos que falharam. Acompanhe a resposta em Meus pedidos.'
    : PEDIDO_ENVIADO;
}

/**
 * Nesta ordem (§ 9.3): cria o motivo, e as etapas devolvidas anexam os
 * arquivos e só então abrem o pedido com ele.
 *
 * @param aoConcluir O que a tela faz com o pedido aberto (recado, recarregar).
 */
export async function pedirEuEstavaNaAula(
  cliente: SupabaseClient,
  classId: string,
  texto: string,
  aoConcluir: (faltouAnexo: boolean) => Promise<void>,
): Promise<EtapasDoEnvio> {
  const limpo = texto.trim();
  if (limpo === '' || limpo.length > TAMANHO_MAXIMO_DO_MOTIVO) {
    throw new ErroDeValidacao(MOTIVO_INVALIDO);
  }
  const motivoId = await criarMotivo(cliente, {
    tipo: 'request_evidence',
    classId,
    texto: limpo,
  });

  // Se o pedido abriu e o passo seguinte da tela falhou, o "Tentar de novo"
  // não pode abrir um segundo pedido com o mesmo motivo.
  let aberto = false;
  return etapasDoMotivo(cliente, motivoId, async (faltouAnexo) => {
    if (!aberto) {
      const { error } = await cliente.rpc('abrir_solicitacao', {
        p_kind: 'student_was_present',
        p_class_id: classId,
        p_motivo_id: motivoId,
      });
      if (error !== null) {
        throw error;
      }
      aberto = true;
    }
    await aoConcluir(faltouAnexo);
  });
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
