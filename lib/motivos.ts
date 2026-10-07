'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { EtapasDoEnvio } from '@/lib/anexos';
import { enviarACloudinary, pedirAssinatura } from '@/lib/envioAssinado';

/**
 * Motivos (§ 8): o texto que acompanha o "Eu estava na aula" e a troca
 * permanente, com até 5 anexos. O motivo nasce sozinho, recebe os anexos e só
 * depois é usado pelo pedido: com o pedido aberto, o banco não aceita mais
 * anexo (`pode_anexar_ao_motivo`).
 */

export type TipoDeMotivo = 'request_evidence' | 'class_swap_evidence';

/** Grava o texto do motivo e devolve o `motivoId`. Quem chama já validou o texto. */
export async function criarMotivo(
  cliente: SupabaseClient,
  motivo: { tipo: TipoDeMotivo; classId: string | null; texto: string },
): Promise<string> {
  const { data, error } = await cliente.rpc('criar_motivo', {
    p_kind: motivo.tipo,
    p_class_id: motivo.classId,
    p_texto: motivo.texto,
  });
  if (error !== null) {
    throw error;
  }
  return String(data);
}

/**
 * Anexa um arquivo ao motivo: o servidor assina, o arquivo vai à Cloudinary,
 * e só então o banco registra. O `anexoId` é o nome do arquivo lá; repetir o
 * mesmo id numa nova tentativa é seguro, porque o servidor assina com
 * `overwrite=false`.
 */
export async function anexarAoMotivo(
  cliente: SupabaseClient,
  anexo: { motivoId: string; anexoId: string },
  arquivo: File,
): Promise<void> {
  const assinatura = await pedirAssinatura({
    rota: '/v1/motivos/sign-upload',
    corpo: anexo,
    oQueEnvia: 'o anexo',
  });
  await enviarACloudinary(assinatura, arquivo);

  // O banco deriva o caminho do autor e do anexoId: a web não diz onde o arquivo está.
  const { error } = await cliente.rpc('anexar_ao_motivo', {
    p_motivo_id: anexo.motivoId,
    p_anexo_id: anexo.anexoId,
  });
  if (error !== null) {
    throw error;
  }
}

/**
 * As etapas depois de criar o motivo. Cada arquivo ganha o seu `anexoId` na
 * primeira tentativa e o mantém nas seguintes: um id novo a cada "Tentar de
 * novo" deixaria na Cloudinary uma cópia órfã do arquivo que já tinha subido.
 *
 * @param usar O que fecha o envio com o motivo pronto (abrir o pedido, pedir a troca).
 */
export function etapasDoMotivo(
  cliente: SupabaseClient,
  motivoId: string,
  usar: (faltouAnexo: boolean) => Promise<void>,
): EtapasDoEnvio {
  const ids = new Map<File, string>();
  return {
    anexar: (arquivo) => {
      const anexoId = ids.get(arquivo) ?? crypto.randomUUID();
      ids.set(arquivo, anexoId);
      return anexarAoMotivo(cliente, { motivoId, anexoId }, arquivo);
    },
    concluir: usar,
  };
}
