import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  enviarComprovante,
  ErroDeEnvio,
  problemaNoArquivo,
  TAMANHO_MAXIMO_MB,
} from '@/lib/comprovante';

// A sessão é o único pedaço do Supabase que o pedido da assinatura usa.
const sessao = vi.hoisted(() => ({
  token: 'token-de-teste' as string | undefined,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: sessao.token === undefined ? null : { access_token: sessao.token },
          },
        }),
    },
  },
}));

const UM_MB = 1024 * 1024;

function arquivo(tipo: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], 'comprovante', { type: tipo });
}

describe('problemaNoArquivo', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])(
    'aceita %s dentro do limite',
    (tipo) => {
      expect(problemaNoArquivo(arquivo(tipo, UM_MB))).toBeNull();
    },
  );

  it('aceita arquivo com exatamente o limite', () => {
    expect(problemaNoArquivo(arquivo('image/png', TAMANHO_MAXIMO_MB * UM_MB))).toBeNull();
  });

  it('recusa arquivo acima do limite, dizendo o tamanho', () => {
    expect(problemaNoArquivo(arquivo('image/png', TAMANHO_MAXIMO_MB * UM_MB + 1))).toContain(
      `${String(TAMANHO_MAXIMO_MB)} MB`,
    );
  });

  it('recusa tipo fora da lista, dizendo quais servem', () => {
    expect(problemaNoArquivo(arquivo('image/gif', 10))).toBe(
      'Envie uma foto (JPG, PNG ou WEBP) ou um PDF.',
    );
  });
});

describe('enviarComprovante — pedido da assinatura ao servidor', () => {
  const PAGAMENTO = 'pagamento-1';
  const GENERICA = 'Não foi possível preparar o envio. Tente de novo em instantes.';

  /** Responde o primeiro `fetch` (o da assinatura) com este status e corpo. */
  function servidorResponde(status: number, corpo: string): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(corpo, { status }))),
    );
  }

  async function falhaDoEnvio(): Promise<unknown> {
    return enviarComprovante(PAGAMENTO, arquivo('image/png', 10)).then(
      () => null,
      (falha: unknown) => falha,
    );
  }

  beforeEach(() => {
    sessao.token = 'token-de-teste';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pede para entrar de novo, sem chamar o servidor, quando não há sessão', async () => {
    sessao.token = undefined;
    const chamada = vi.fn();
    vi.stubGlobal('fetch', chamada);

    const falha = await falhaDoEnvio();

    expect(falha).toBeInstanceOf(ErroDeEnvio);
    expect((falha as Error).message).toBe(
      'Sua sessão expirou. Entre de novo para enviar o comprovante.',
    );
    expect(chamada).not.toHaveBeenCalled();
  });

  it('fala em internet e servidor quando o fetch nem chega a uma resposta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    expect(((await falhaDoEnvio()) as Error).message).toBe(
      'Não conseguimos falar com o servidor. Verifique sua internet e tente de novo.',
    );
  });

  it('mostra a frase do code quando o servidor recusa com o corpo da § 13.6', async () => {
    servidorResponde(
      429,
      JSON.stringify({
        error: 'Too many requests',
        code: 'rate_limited',
        traceId: 't-1',
      }),
    );

    const falha = await falhaDoEnvio();

    expect(falha).toBeInstanceOf(ErroDeEnvio);
    expect((falha as Error).message).toBe(
      'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
    );
  });

  it('não mostra o texto do servidor, que não é escrito para o aluno', async () => {
    servidorResponde(
      400,
      JSON.stringify({
        error: 'paymentId must be a uuid',
        code: 'bad_input',
        traceId: 't-2',
      }),
    );

    expect(((await falhaDoEnvio()) as Error).message).toBe(
      'A página enviou um dado que não é válido. Atualize a página e tente de novo.',
    );
  });

  it('mostra a frase do Supabase fora do ar quando o code é supabase_unreachable', async () => {
    servidorResponde(
      503,
      JSON.stringify({
        error: 'x',
        code: 'supabase_unreachable',
        traceId: 't-3',
      }),
    );

    expect(((await falhaDoEnvio()) as Error).message).toBe(
      'Não conseguimos falar com o servidor de dados. Tente de novo em instantes.',
    );
  });

  it('cai na genérica, sem palpite de servidor acordando, no internal_error', async () => {
    servidorResponde(500, JSON.stringify({ error: 'x', code: 'internal_error', traceId: 't-4' }));

    expect(((await falhaDoEnvio()) as Error).message).toBe(GENERICA);
  });

  it('decide pelo status quando o corpo não é JSON e o status tem um sentido só', async () => {
    servidorResponde(401, 'Unauthorized');

    expect(((await falhaDoEnvio()) as Error).message).toBe(
      'Sua sessão não vale mais. Entre de novo para continuar.',
    );
  });

  it('cai na genérica quando o corpo não é JSON e o status é um 5xx', async () => {
    servidorResponde(502, '<html>Bad Gateway</html>');

    expect(((await falhaDoEnvio()) as Error).message).toBe(GENERICA);
  });
});
