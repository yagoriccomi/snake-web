import { afterEach, describe, expect, it, vi } from 'vitest';

import { enviarACloudinary, EnvioIndisponivel, type UploadAssinado } from '@/lib/envioAssinado';
import { ErroDeEnvio } from '@/lib/erros';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));

const ASSINATURA: UploadAssinado = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/conta/auto/upload',
  apiKey: 'chave',
  timestamp: 1_700_000_000,
  signature: 'assinatura',
  folder: 'justificativas/usuario-1',
  public_id: 'justificativa-1',
  type: 'private',
};

function arquivo(nome = 'atestado.pdf'): File {
  return new File([new Uint8Array(10)], nome, { type: 'application/pdf' });
}

/** Responde a Cloudinary com este status e corpo, e guarda o que foi enviado. */
function cloudinaryResponde(status: number, corpo: unknown): ReturnType<typeof vi.fn> {
  const chamada = vi.fn(() => Promise.resolve(new Response(JSON.stringify(corpo), { status })));
  vi.stubGlobal('fetch', chamada);
  return chamada;
}

function formularioEnviado(chamada: ReturnType<typeof vi.fn>): FormData {
  const [, opcoes] = chamada.mock.calls[0] as [string, RequestInit];
  return opcoes.body as FormData;
}

describe('enviarACloudinary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fica indisponível, sem chamar a rede, quando a conta não está configurada', async () => {
    const chamada = vi.fn();
    vi.stubGlobal('fetch', chamada);

    const falha = await enviarACloudinary(
      { ...ASSINATURA, uploadUrl: 'https://api.cloudinary.com/v1_1/PREENCHER/auto/upload' },
      arquivo(),
    ).catch((e: unknown) => e);

    expect(falha).toBeInstanceOf(EnvioIndisponivel);
    expect(falha).toBeInstanceOf(ErroDeEnvio);
    expect(chamada).not.toHaveBeenCalled();
  });

  it('manda overwrite e allowed_formats quando a assinatura dos anexos os traz', async () => {
    const chamada = cloudinaryResponde(200, { public_id: 'justificativas/usuario-1/justificativa-1' });

    await enviarACloudinary(
      { ...ASSINATURA, overwrite: false, allowed_formats: 'jpg,png,webp,heic,pdf' },
      arquivo(),
    );

    const formulario = formularioEnviado(chamada);
    expect(formulario.get('overwrite')).toBe('false');
    expect(formulario.get('allowed_formats')).toBe('jpg,png,webp,heic,pdf');
    expect(formulario.get('public_id')).toBe('justificativa-1');
  });

  it('não inventa campos que a assinatura do comprovante não traz', async () => {
    const chamada = cloudinaryResponde(200, { public_id: 'x' });

    await enviarACloudinary(ASSINATURA, arquivo());

    const formulario = formularioEnviado(chamada);
    expect(formulario.has('overwrite')).toBe(false);
    expect(formulario.has('allowed_formats')).toBe(false);
  });

  it('devolve o public_id que a Cloudinary gravou', async () => {
    cloudinaryResponde(200, { public_id: 'justificativas/usuario-1/justificativa-1' });

    await expect(enviarACloudinary(ASSINATURA, arquivo())).resolves.toBe(
      'justificativas/usuario-1/justificativa-1',
    );
  });

  it('fala em falha do serviço quando a Cloudinary devolve 5xx', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cloudinaryResponde(502, { error: { message: 'x' } });

    await expect(enviarACloudinary(ASSINATURA, arquivo())).rejects.toThrow(
      'O serviço de arquivos falhou. Tente de novo em instantes.',
    );
  });

  it('fala em arquivo não aceito quando a Cloudinary devolve 4xx, sem o corpo no console', async () => {
    const console_ = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cloudinaryResponde(400, { error: { message: 'justificativas/usuario-1 format' } });

    await expect(enviarACloudinary(ASSINATURA, arquivo())).rejects.toThrow(
      'O arquivo não foi aceito. Tente uma foto menor ou outro formato.',
    );
    expect(String(console_.mock.calls[0]?.[0])).not.toContain('usuario-1');
  });

  it('fala em internet quando o envio nem chega a uma resposta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    await expect(enviarACloudinary(ASSINATURA, arquivo())).rejects.toThrow(
      'Não conseguimos enviar o arquivo. Verifique sua internet e tente de novo.',
    );
  });
});
