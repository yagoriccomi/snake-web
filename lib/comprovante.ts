'use client';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/**
 * Envio do comprovante de pagamento.
 *
 * É a única parte da página que passa pelo backend próprio, e por um motivo:
 * a assinatura do upload exige um segredo da Cloudinary que jamais pode viver
 * no navegador. O servidor assina, e o arquivo vai **direto** do celular da
 * pessoa para a Cloudinary — sem passar pelo nosso servidor, que é o caminho
 * que o aplicativo já usa.
 */

interface UploadAssinado {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  public_id: string;
  type: string;
}

/** Erro com mensagem pronta para a tela — sem detalhe técnico. */
export class ErroDeEnvio extends Error {}

/** Tira do nome do arquivo o que a Cloudinary e o Storage recusam. */
function nomeSeguro(nome: string): string {
  return nome.replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

async function pedirAssinatura(paymentId: string): Promise<UploadAssinado> {
  const { data: sessao } = await supabase.auth.getSession();
  const token = sessao.session?.access_token;
  if (token === undefined) {
    throw new ErroDeEnvio('Sua sessão expirou. Entre de novo para enviar o comprovante.');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${env.apiUrl}/v1/proofs/sign-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentId }),
    });
  } catch {
    // Falha de rede aqui inclui o CORS: o navegador recusa a resposta e o
    // fetch rejeita sem status. Dizer "sem conexão" seria mentira cômoda,
    // então a mensagem admite que pode ser o servidor.
    throw new ErroDeEnvio(
      'Não conseguimos falar com o servidor. Verifique sua internet e tente de novo.',
    );
  }

  if (!resposta.ok) {
    // O servidor hiberna e a primeira chamada do dia demora; um 5xx aqui é
    // quase sempre isso, e a pessoa precisa saber que vale insistir.
    const mensagem =
      resposta.status >= 500
        ? 'O servidor está acordando. Tente de novo em alguns segundos.'
        : 'Não foi possível preparar o envio. Tente de novo.';
    throw new ErroDeEnvio(mensagem);
  }

  return (await resposta.json()) as UploadAssinado;
}

/**
 * Envia o comprovante e deixa o pagamento em análise.
 *
 * @param paymentId Mensalidade que está sendo paga.
 * @param arquivo   Imagem ou PDF escolhido pela pessoa.
 */
export async function enviarComprovante(paymentId: string, arquivo: File): Promise<void> {
  const assinatura = await pedirAssinatura(paymentId);

  // Ambiente sem credenciais da Cloudinary (o de desenvolvimento) assina com
  // `PREENCHER_...` no lugar do nome da conta. Mandar o arquivo para lá dá um
  // erro que parece culpa do arquivo. O aplicativo cai para o Storage nesse
  // caso, e aqui é a mesma coisa: o envio funciona, só muda onde o arquivo
  // mora — e `proof_provider` registra qual dos dois foi.
  if (assinatura.uploadUrl.includes('PREENCHER')) {
    await enviarParaStorage(paymentId, arquivo);
    return;
  }

  const formulario = new FormData();
  formulario.append('file', arquivo, nomeSeguro(arquivo.name));
  formulario.append('api_key', assinatura.apiKey);
  formulario.append('timestamp', String(assinatura.timestamp));
  formulario.append('signature', assinatura.signature);
  formulario.append('folder', assinatura.folder);
  formulario.append('public_id', assinatura.public_id);
  formulario.append('type', assinatura.type);

  const envio = await fetch(assinatura.uploadUrl, { method: 'POST', body: formulario });
  if (!envio.ok) {
    // Só o status vai para o console. O corpo da recusa pode trazer o
    // public_id, que carrega o id da pessoa, e o console do navegador não é
    // lugar de dado pessoal. O status basta para separar conta mal
    // configurada (4xx) de falha do provedor (5xx).
    console.error(`Upload recusado pela Cloudinary (HTTP ${envio.status}).`);
    throw new ErroDeEnvio(
      envio.status >= 500
        ? 'O serviço de arquivos falhou. Tente de novo em instantes.'
        : 'O arquivo não foi aceito. Tente uma foto menor ou outro formato.',
    );
  }
  const enviado = (await envio.json()) as { public_id?: string };

  // O pagamento só vira "em análise" DEPOIS que o arquivo está lá. Se a ordem
  // fosse outra, uma falha no upload deixaria a mensalidade em análise sem
  // comprovante nenhum — e o administrador abriria a tela e veria erro.
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'pending_approval',
      proof_provider: 'cloudinary',
      proof_public_id: enviado.public_id ?? `${assinatura.folder}/${assinatura.public_id}`,
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
