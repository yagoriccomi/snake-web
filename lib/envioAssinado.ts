'use client';

import { env } from '@/lib/env';
import { codigoDoCorpo, ErroDeEnvio, mensagemDoServidor } from '@/lib/erros';
import { supabase } from '@/lib/supabase';

/**
 * Envio de arquivo à Cloudinary com a assinatura do `snake-server`: o
 * comprovante, o anexo da justificativa e os anexos de motivo.
 *
 * Um módulo só porque o caminho tem armadilhas que já custaram caro (o CORS
 * que vira "sem conexão", o corpo da recusa que carrega o id da pessoa), e
 * duas cópias divergiriam na primeira correção. [#6]
 *
 * O arquivo vai **direto** do navegador para a Cloudinary: o servidor só
 * assina. A pasta e o nome vêm NA RESPOSTA, derivados do token verificado — a
 * web não escolhe onde grava. [#55]
 */

/** Resposta de `POST /v1/<módulo>/sign-upload` (contrato § 13). */
export interface UploadAssinado {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  public_id: string;
  type: string;
  /** Só nos anexos (§ 13.1 e § 13.2); o comprovante é assinado sem eles. */
  overwrite?: boolean;
  allowed_formats?: string;
}

/**
 * Marca que o ambiente de desenvolvimento deixa no lugar da conta da
 * Cloudinary (T25). Mandar o arquivo para lá daria um erro que parece culpa
 * do arquivo.
 */
const CLOUDINARY_NAO_CONFIGURADA = 'PREENCHER';

/** Sem Cloudinary, o anexo fica indisponível e nunca vai para o Storage (T25). */
export class EnvioIndisponivel extends ErroDeEnvio {
  constructor() {
    super('O envio de arquivos não está disponível agora.');
    this.name = 'EnvioIndisponivel';
  }
}

/** Tira do nome do arquivo o que a Cloudinary e o Storage recusam. */
export function nomeSeguro(nome: string): string {
  return nome.replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

/**
 * Pede ao servidor a assinatura do envio.
 *
 * @param rota      Ex.: `/v1/justifications/sign-upload`.
 * @param corpo     O JSON da rota (ex.: `{ justificationId }`).
 * @param oQueEnvia Completa "Entre de novo para enviar …" (ex.: "o comprovante").
 */
export async function pedirAssinatura({
  rota,
  corpo,
  oQueEnvia,
}: {
  rota: string;
  corpo: Record<string, string>;
  oQueEnvia: string;
}): Promise<UploadAssinado> {
  const { data: sessao } = await supabase.auth.getSession();
  const token = sessao.session?.access_token;
  if (token === undefined) {
    throw new ErroDeEnvio(`Sua sessão expirou. Entre de novo para enviar ${oQueEnvia}.`);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${env.apiUrl}${rota}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo),
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
    // Um corpo que não é JSON (a Render na frente do servidor, por exemplo)
    // não tem `code`, e quem decide então é o status.
    const corpoDaRecusa: unknown = await resposta.json().catch(() => null);
    throw new ErroDeEnvio(
      mensagemDoServidor(
        { status: resposta.status, code: codigoDoCorpo(corpoDaRecusa) },
        'preparar o envio',
      ),
    );
  }

  return (await resposta.json()) as UploadAssinado;
}

/**
 * Envia o arquivo à Cloudinary com os campos assinados **como vieram**: um
 * campo a mais ou a menos e a assinatura deixa de bater.
 *
 * @returns O `public_id` que a Cloudinary gravou.
 */
export async function enviarACloudinary(assinatura: UploadAssinado, arquivo: File): Promise<string> {
  if (assinatura.uploadUrl.includes(CLOUDINARY_NAO_CONFIGURADA)) {
    throw new EnvioIndisponivel();
  }

  const formulario = new FormData();
  formulario.append('file', arquivo, nomeSeguro(arquivo.name));
  formulario.append('api_key', assinatura.apiKey);
  formulario.append('timestamp', String(assinatura.timestamp));
  formulario.append('signature', assinatura.signature);
  formulario.append('folder', assinatura.folder);
  formulario.append('public_id', assinatura.public_id);
  formulario.append('type', assinatura.type);
  if (assinatura.overwrite !== undefined) {
    formulario.append('overwrite', String(assinatura.overwrite));
  }
  if (assinatura.allowed_formats !== undefined) {
    formulario.append('allowed_formats', assinatura.allowed_formats);
  }

  let envio: Response;
  try {
    envio = await fetch(assinatura.uploadUrl, { method: 'POST', body: formulario });
  } catch {
    throw new ErroDeEnvio(
      'Não conseguimos enviar o arquivo. Verifique sua internet e tente de novo.',
    );
  }

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
  // O esperado é o que o servidor assinou, mas quem manda é a resposta do provedor.
  return enviado.public_id ?? `${assinatura.folder}/${assinatura.public_id}`;
}
