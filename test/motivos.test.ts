import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import { ErroDeEnvio } from '@/lib/erros';
import { anexarAoMotivo, criarMotivo, etapasDoMotivo } from '@/lib/motivos';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: 'token-de-teste' } } }),
    },
  },
}));

const MOTIVO = '7d1f0a3c-2b4e-4c8a-9f6d-1e2a3b4c5d6e';
const ANEXO = '0b6f1c2e-5c1a-4b8e-9d55-0e7a3f1b2c3d';

function arquivo(nome: string): File {
  return new File([new Uint8Array(10)], nome, { type: 'application/pdf' });
}

function cliente(resposta: { data: unknown; error: unknown } = { data: null, error: null }): {
  rpc: ReturnType<typeof vi.fn>;
} {
  return { rpc: vi.fn(() => Promise.resolve(resposta)) };
}

/** O servidor assina com o `public_id` pedido, e a Cloudinary responde com `statusDaCloudinary`. */
function servidorECloudinary(statusDaCloudinary = 200): ReturnType<typeof vi.fn> {
  const chamada = vi.fn((url: string, opcoes?: RequestInit) => {
    if (!url.endsWith('/sign-upload')) {
      return Promise.resolve(new Response('{}', { status: statusDaCloudinary }));
    }
    const { anexoId } = JSON.parse(opcoes?.body as string) as { anexoId: string };
    return Promise.resolve(
      new Response(
        JSON.stringify({
          uploadUrl: 'https://api.cloudinary.com/v1_1/conta/auto/upload',
          apiKey: 'chave',
          timestamp: 1,
          signature: 's',
          folder: 'motivos/usuario-1',
          public_id: anexoId,
          type: 'private',
          overwrite: false,
        }),
      ),
    );
  });
  vi.stubGlobal('fetch', chamada);
  return chamada;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('criarMotivo', () => {
  it('grava o texto com o tipo e a aula e devolve o id', async () => {
    const banco = cliente({ data: MOTIVO, error: null });

    const id = await criarMotivo(banco as unknown as SupabaseClient, {
      tipo: 'class_swap_evidence',
      classId: null,
      texto: 'Mudei de turno no trabalho.',
    });

    expect(id).toBe(MOTIVO);
    expect(banco.rpc).toHaveBeenCalledWith('criar_motivo', {
      p_kind: 'class_swap_evidence',
      p_class_id: null,
      p_texto: 'Mudei de turno no trabalho.',
    });
  });

  it('lança a recusa do banco', async () => {
    const erro = { code: '42501', message: 'Operação negada.' };

    await expect(
      criarMotivo(cliente({ data: null, error: erro }) as unknown as SupabaseClient, {
        tipo: 'request_evidence',
        classId: 'aula-1',
        texto: 'Eu fui.',
      }),
    ).rejects.toBe(erro);
  });
});

describe('anexarAoMotivo', () => {
  it('pede a assinatura com o motivo e o anexo e registra o anexo no banco', async () => {
    const chamada = servidorECloudinary();
    const banco = cliente();

    await anexarAoMotivo(
      banco as unknown as SupabaseClient,
      { motivoId: MOTIVO, anexoId: ANEXO },
      arquivo('a.pdf'),
    );

    const [rota, opcoes] = chamada.mock.calls[0] as [string, RequestInit];
    expect(rota).toBe('http://localhost:3000/v1/motivos/sign-upload');
    expect(JSON.parse(opcoes.body as string)).toEqual({ motivoId: MOTIVO, anexoId: ANEXO });
    expect(chamada.mock.calls[1]?.[0]).toBe('https://api.cloudinary.com/v1_1/conta/auto/upload');
    expect(banco.rpc).toHaveBeenCalledWith('anexar_ao_motivo', {
      p_motivo_id: MOTIVO,
      p_anexo_id: ANEXO,
    });
  });

  it('não registra no banco se a Cloudinary recusa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    servidorECloudinary(400);
    const banco = cliente();

    await expect(
      anexarAoMotivo(
        banco as unknown as SupabaseClient,
        { motivoId: MOTIVO, anexoId: ANEXO },
        arquivo('a.pdf'),
      ),
    ).rejects.toBeInstanceOf(ErroDeEnvio);
    expect(banco.rpc).not.toHaveBeenCalled();
  });
});

describe('etapasDoMotivo', () => {
  function anexosPedidos(chamada: ReturnType<typeof vi.fn>): string[] {
    return chamada.mock.calls
      .filter(([url]) => String(url).endsWith('/sign-upload'))
      .map(([, opcoes]) => (JSON.parse((opcoes as RequestInit).body as string) as { anexoId: string }).anexoId);
  }

  it('cada arquivo ganha o seu id, e o "Tentar de novo" repete o mesmo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const a = arquivo('a.pdf');
    const b = arquivo('b.pdf');
    const etapas = etapasDoMotivo(cliente() as unknown as SupabaseClient, MOTIVO, () => Promise.resolve());

    servidorECloudinary(500);
    await expect(etapas.anexar(a)).rejects.toBeInstanceOf(ErroDeEnvio);
    const chamada = servidorECloudinary();
    await etapas.anexar(a);
    await etapas.anexar(b);

    const [primeira, segunda] = anexosPedidos(chamada);
    expect(primeira).toMatch(/^[0-9a-f-]{36}$/);
    expect(segunda).not.toBe(primeira);
  });

  it('a nova tentativa usa o id da primeira', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const a = arquivo('a.pdf');
    const etapas = etapasDoMotivo(cliente() as unknown as SupabaseClient, MOTIVO, () => Promise.resolve());

    const falhou = servidorECloudinary(500);
    await expect(etapas.anexar(a)).rejects.toBeInstanceOf(ErroDeEnvio);
    const deu = servidorECloudinary();
    await etapas.anexar(a);

    expect(anexosPedidos(deu)).toEqual(anexosPedidos(falhou));
  });

  it('concluir é o passo de quem usa o motivo', async () => {
    const usar = vi.fn(() => Promise.resolve());
    const etapas = etapasDoMotivo(cliente() as unknown as SupabaseClient, MOTIVO, usar);

    await etapas.concluir(true);

    expect(usar).toHaveBeenCalledWith(true);
  });
});
