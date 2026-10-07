'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

import { enviarACloudinary, EnvioIndisponivel, pedirAssinatura } from '@/lib/envioAssinado';
import { mensagemDaFalha } from '@/lib/erros';

/**
 * Anexos de justificativa e de motivo (T46): o que se aceita e o caminho de
 * cada um até a Cloudinary. Ao contrário do comprovante, anexo **nunca** vai
 * para o Storage (T25): sem Cloudinary, o envio fica indisponível.
 */

/** T46: o teto de cada arquivo, o mesmo da conta da Cloudinary. */
export const TAMANHO_MAXIMO_DO_ANEXO_MB = 10;

/** T46: o pedido "Eu estava na aula" e a troca permanente levam até 5. */
export const MAXIMO_DE_ANEXOS_DO_MOTIVO = 5;

const BYTES_POR_MB = 1024 * 1024;

/**
 * Os formatos que o servidor assina (`allowed_formats=jpg,png,webp,heic,pdf`).
 * A extensão vale tanto quanto o tipo: o Windows e alguns Android entregam a
 * foto HEIC com o tipo vazio.
 */
const TIPOS_DE_ANEXO: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);
const EXTENSOES_DE_ANEXO: ReadonlySet<string> = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf']);

/** O `accept` do seletor de arquivos: a mesma lista, para o celular já filtrar. */
export const ACEITE_DO_ANEXO = [...TIPOS_DE_ANEXO, '.heic'].join(',');

function extensao(nome: string): string {
  const ponto = nome.lastIndexOf('.');
  return ponto < 0 ? '' : nome.slice(ponto + 1).toLowerCase();
}

/** `null` quando o arquivo serve; a frase do problema quando não serve. */
export function problemaNoAnexo(arquivo: File): string | null {
  if (arquivo.size > TAMANHO_MAXIMO_DO_ANEXO_MB * BYTES_POR_MB) {
    return `O arquivo passa de ${TAMANHO_MAXIMO_DO_ANEXO_MB} MB. Tente uma foto menor.`;
  }
  if (!TIPOS_DE_ANEXO.has(arquivo.type) && !EXTENSOES_DE_ANEXO.has(extensao(arquivo.name))) {
    return 'Envie uma foto (JPG, PNG, WEBP ou HEIC) ou um PDF.';
  }
  return null;
}

/**
 * O envio em três tempos (§ 8 e § 9.1): o texto cria o registro, cada anexo
 * vai em seguida, e só então o envio se conclui. Quem chama o formulário
 * devolve isto depois de criar o registro.
 */
export interface EtapasDoEnvio {
  /** Envia um anexo; lança o erro para o formulário mostrar. */
  anexar: (arquivo: File) => Promise<void>;
  /** Fecha o envio; `faltouAnexo` quando a pessoa seguiu sem algum anexo. */
  concluir: (faltouAnexo: boolean) => Promise<void>;
}

export interface FalhaDoAnexo {
  arquivo: File;
  mensagem: string;
}

/**
 * Envia os anexos um por vez, na ordem escolhida, sem parar no primeiro que
 * falha: a pessoa vê de uma vez quais não foram. Só a falta de Cloudinary
 * para tudo, porque ela vale para todos os que faltam.
 *
 * @param aoComecar Avisa qual anexo está indo, para a tela dizer "X de N".
 */
export async function enviarAnexos(
  anexar: (arquivo: File) => Promise<void>,
  arquivos: readonly File[],
  aoComecar: (indice: number, total: number) => void,
): Promise<{ falhas: FalhaDoAnexo[]; indisponivel: boolean }> {
  const falhas: FalhaDoAnexo[] = [];
  for (const [indice, arquivo] of arquivos.entries()) {
    aoComecar(indice, arquivos.length);
    try {
      await anexar(arquivo);
    } catch (falha) {
      if (falha instanceof EnvioIndisponivel) {
        const restantes = arquivos.slice(indice).map((a) => ({ arquivo: a, mensagem: falha.message }));
        return { falhas: [...falhas, ...restantes], indisponivel: true };
      }
      falhas.push({ arquivo, mensagem: mensagemDaFalha(falha, 'enviar') });
    }
  }
  return { falhas, indisponivel: false };
}

/** A justificativa aceita um anexo só (§ 9.1: `proof_public_id`). */
export const MAXIMO_DE_ANEXOS_DA_JUSTIFICATIVA = 1;

/**
 * As etapas depois de gravar o texto de uma justificativa (envio ou reenvio).
 *
 * @param aoConcluir O que a tela faz no fim (recado, recarregar).
 */
export function etapasDaJustificativa(
  cliente: SupabaseClient,
  id: string,
  aoConcluir: (faltouAnexo: boolean) => Promise<void>,
): EtapasDoEnvio {
  return {
    anexar: (arquivo) => anexarAJustificativa(cliente, id, arquivo),
    concluir: aoConcluir,
  };
}

/**
 * Anexa o arquivo a uma justificativa pendente (§ 9.1 e § 13.2): o servidor
 * assina, o arquivo vai à Cloudinary, e só então o banco registra. Se o
 * registro falhar, tentar de novo é seguro: o servidor assina o mesmo nome
 * com `overwrite=false`, e a Cloudinary devolve o arquivo que já está lá.
 *
 * @param id O id que `enviar_justificativa` devolveu, ou o da justificativa reenviada.
 */
export async function anexarAJustificativa(
  cliente: SupabaseClient,
  id: string,
  arquivo: File,
): Promise<void> {
  const assinatura = await pedirAssinatura({
    rota: '/v1/justifications/sign-upload',
    corpo: { justificationId: id },
    oQueEnvia: 'o anexo',
  });
  await enviarACloudinary(assinatura, arquivo);

  // O banco monta o caminho sozinho a partir do id e da tentativa: a web não
  // diz onde o arquivo está, só que ele chegou.
  const { error } = await cliente.rpc('anexar_a_justificativa', { p_id: id });
  if (error !== null) {
    throw error;
  }
}
