'use client';

import { enviarACloudinary, nomeSeguro, pedirAssinatura } from '@/lib/envioAssinado';
import { env } from '@/lib/env';
import { ErroDeEnvio } from '@/lib/erros';
import { supabase } from '@/lib/supabase';

/**
 * Envio do comprovante de pagamento.
 *
 * É a única parte da página que passa pelo backend próprio, e por um motivo:
 * a assinatura do upload exige um segredo da Cloudinary que jamais pode viver
 * no navegador. O servidor assina, e o arquivo vai **direto** do celular da
 * pessoa para a Cloudinary (`lib/envioAssinado.ts`) — sem passar pelo nosso
 * servidor, que é o caminho que o aplicativo já usa.
 */

// A página de pagamento importa o erro daqui desde antes dos anexos.
export { ErroDeEnvio };

/**
 * Envia o comprovante e deixa o pagamento em análise.
 *
 * @param paymentId Mensalidade que está sendo paga.
 * @param arquivo   Imagem ou PDF escolhido pela pessoa.
 */
export async function enviarComprovante(paymentId: string, arquivo: File): Promise<void> {
  // O ambiente de desenvolvimento não tem credenciais da Cloudinary, e mandar
  // o arquivo para lá dá um erro que parece culpa do arquivo. Nele, o envio vai
  // para o Storage, como no aplicativo: só muda onde o arquivo mora, e
  // `proof_provider` registra qual dos dois foi. A escolha é uma variável
  // explícita, não uma palavra dentro da URL assinada: o desvio fica visível.
  // Vale só para o comprovante: anexo nunca vai para o Storage (T25).
  if (env.proofUploadToStorage) {
    await enviarParaStorage(paymentId, arquivo);
    return;
  }

  const assinatura = await pedirAssinatura({
    rota: '/v1/proofs/sign-upload',
    corpo: { paymentId },
    oQueEnvia: 'o comprovante',
  });
  const publicId = await enviarACloudinary(assinatura, arquivo);

  // O pagamento só vira "em análise" DEPOIS que o arquivo está lá. Se a ordem
  // fosse outra, uma falha no upload deixaria a mensalidade em análise sem
  // comprovante nenhum — e o administrador abriria a tela e veria erro.
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'pending_approval',
      proof_provider: 'cloudinary',
      proof_public_id: publicId,
      proof_storage_path: null,
    })
    .eq('id', paymentId);
  if (error !== null) {
    throw new ErroDeEnvio(
      'O arquivo subiu, mas não conseguimos registrar. Fale com a academia antes de enviar de novo.',
    );
  }
}

/**
 * Caminho alternativo: o arquivo vai para o bucket privado do Supabase.
 *
 * É o mesmo lugar que o aplicativo usa quando não há backend configurado, e a
 * RLS do bucket já garante que cada um só alcança a própria pasta.
 */
async function enviarParaStorage(paymentId: string, arquivo: File): Promise<void> {
  const { data: sessao } = await supabase.auth.getSession();
  const usuario = sessao.session?.user;
  if (usuario === undefined) {
    throw new ErroDeEnvio('Sua sessão expirou. Entre de novo para enviar o comprovante.');
  }

  const caminho = `${usuario.id}/${paymentId}_${nomeSeguro(arquivo.name)}`;
  const { error: erroDoEnvio } = await supabase.storage
    .from('payment_proofs')
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });
  if (erroDoEnvio !== null) {
    // Só o status: a mensagem do Storage pode repetir o caminho, que começa
    // pelo id da pessoa.
    console.error(
      `Envio ao Storage recusado (HTTP ${'status' in erroDoEnvio ? String(erroDoEnvio.status) : '?'}).`,
    );
    throw new ErroDeEnvio('Não foi possível enviar o arquivo. Tente de novo.');
  }

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'pending_approval',
      proof_provider: 'supabase_storage',
      proof_storage_path: caminho,
      proof_public_id: null,
    })
    .eq('id', paymentId);
  if (error !== null) {
    throw new ErroDeEnvio(
      'O arquivo subiu, mas não conseguimos registrar. Fale com a academia antes de enviar de novo.',
    );
  }
}

/** Tamanho máximo aceito, alinhado ao que o backend permite. */
export const TAMANHO_MAXIMO_MB = 10;

export const TIPOS_ACEITOS = 'image/jpeg,image/png,image/webp,application/pdf';

/** `null` quando o arquivo serve; a mensagem do problema quando não serve. */
export function problemaNoArquivo(arquivo: File): string | null {
  if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
    return `O arquivo passa de ${TAMANHO_MAXIMO_MB} MB. Tente uma foto menor.`;
  }
  if (!TIPOS_ACEITOS.split(',').includes(arquivo.type)) {
    return 'Envie uma foto (JPG, PNG ou WEBP) ou um PDF.';
  }
  return null;
}
