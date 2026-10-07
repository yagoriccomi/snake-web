import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import { CampoDeAnexos, dicaDosAnexos, juntarAnexos } from '@/components/CampoDeAnexos';
import { avisoDosAnexos } from '@/components/EnvioComAnexos';
import {
  anexarAJustificativa,
  enviarAnexos,
  problemaNoAnexo,
  TAMANHO_MAXIMO_DO_ANEXO_MB,
} from '@/lib/anexos';
import { EnvioIndisponivel } from '@/lib/envioAssinado';
import { ErroDeEnvio } from '@/lib/erros';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: 'token-de-teste' } } }),
    },
  },
}));

const UM_MB = 1024 * 1024;

function arquivo(nome: string, tipo: string, bytes = 10): File {
  return new File([new Uint8Array(bytes)], nome, { type: tipo });
}

describe('problemaNoAnexo', () => {
  it.each([
    ['foto.jpg', 'image/jpeg'],
    ['foto.png', 'image/png'],
    ['foto.webp', 'image/webp'],
    ['foto.heic', 'image/heic'],
    ['atestado.pdf', 'application/pdf'],
  ])('aceita %s', (nome, tipo) => {
    expect(problemaNoAnexo(arquivo(nome, tipo))).toBeNull();
  });

  it('aceita HEIC pela extensão quando o aparelho entrega o tipo vazio', () => {
    expect(problemaNoAnexo(arquivo('IMG_0001.HEIC', ''))).toBeNull();
  });

  it('aceita arquivo com exatamente o limite', () => {
    expect(problemaNoAnexo(arquivo('a.pdf', 'application/pdf', TAMANHO_MAXIMO_DO_ANEXO_MB * UM_MB))).toBeNull();
  });

  it('recusa arquivo acima do limite, dizendo o tamanho', () => {
    expect(
      problemaNoAnexo(arquivo('a.pdf', 'application/pdf', TAMANHO_MAXIMO_DO_ANEXO_MB * UM_MB + 1)),
    ).toBe('O arquivo passa de 10 MB. Tente uma foto menor.');
  });

  it('recusa formato fora da lista, dizendo quais servem', () => {
    expect(problemaNoAnexo(arquivo('animacao.gif', 'image/gif'))).toBe(
      'Envie uma foto (JPG, PNG, WEBP ou HEIC) ou um PDF.',
    );
  });
});

describe('enviarAnexos', () => {
  const a = arquivo('a.pdf', 'application/pdf');
  const b = arquivo('b.pdf', 'application/pdf');
  const c = arquivo('c.pdf', 'application/pdf');

  it('envia na ordem escolhida e avisa qual está indo', async () => {
    const enviados: string[] = [];
    const comecos: string[] = [];

    const resultado = await enviarAnexos(
      (f) => {
        enviados.push(f.name);
        return Promise.resolve();
      },
      [a, b, c],
      (indice, total) => comecos.push(`${indice + 1}/${total}`),
    );

    expect(resultado).toEqual({ falhas: [], indisponivel: false });
    expect(enviados).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
    expect(comecos).toEqual(['1/3', '2/3', '3/3']);
  });

  it('não para no primeiro que falha: junta as falhas e segue com os outros', async () => {
    const enviados: string[] = [];

    const resultado = await enviarAnexos(
      (f) => {
        if (f === b) return Promise.reject(new ErroDeEnvio('O serviço de arquivos falhou.'));
        enviados.push(f.name);
        return Promise.resolve();
      },
      [a, b, c],
      () => undefined,
    );

    expect(enviados).toEqual(['a.pdf', 'c.pdf']);
    expect(resultado.indisponivel).toBe(false);
    expect(resultado.falhas).toEqual([{ arquivo: b, mensagem: 'O serviço de arquivos falhou.' }]);
  });

  it('sem Cloudinary, para e marca como falha todos os que faltavam', async () => {
    const tentou = vi.fn(() => Promise.reject(new EnvioIndisponivel()));

    const resultado = await enviarAnexos(tentou, [a, b], () => undefined);

    expect(tentou).toHaveBeenCalledTimes(1);
    expect(resultado.indisponivel).toBe(true);
    expect(resultado.falhas.map((f) => f.arquivo)).toEqual([a, b]);
  });
});

describe('anexarAJustificativa', () => {
  const ID = '0b6f1c2e-5c1a-4b8e-9d55-0e7a3f1b2c3d';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function cliente(erro: unknown = null): { rpc: ReturnType<typeof vi.fn> } {
    return { rpc: vi.fn(() => Promise.resolve({ data: null, error: erro })) };
  }

  /** O servidor assina, e a Cloudinary aceita. */
  function servidorECloudinaryAceitam(): ReturnType<typeof vi.fn> {
    const chamada = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith('/sign-upload')
          ? new Response(
              JSON.stringify({
                uploadUrl: 'https://api.cloudinary.com/v1_1/conta/auto/upload',
                apiKey: 'chave',
                timestamp: 1,
                signature: 's',
                folder: 'justificativas/usuario-1',
                public_id: ID,
                type: 'private',
                overwrite: false,
                allowed_formats: 'jpg,png,webp,heic,pdf',
              }),
            )
          : new Response(JSON.stringify({ public_id: `justificativas/usuario-1/${ID}` })),
      ),
    );
    vi.stubGlobal('fetch', chamada);
    return chamada;
  }

  it('pede a assinatura com o id da justificativa e registra o anexo no banco', async () => {
    const chamada = servidorECloudinaryAceitam();
    const banco = cliente();

    await anexarAJustificativa(banco as unknown as SupabaseClient, ID, arquivo('a.pdf', 'application/pdf'));

    const [rota, opcoes] = chamada.mock.calls[0] as [string, RequestInit];
    expect(rota).toBe('http://localhost:3000/v1/justifications/sign-upload');
    expect(JSON.parse(opcoes.body as string)).toEqual({ justificationId: ID });
    expect(chamada.mock.calls[1]?.[0]).toBe('https://api.cloudinary.com/v1_1/conta/auto/upload');
    expect(banco.rpc).toHaveBeenCalledWith('anexar_a_justificativa', { p_id: ID });
  });

  it('não registra no banco se a Cloudinary recusa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith('/sign-upload')
            ? new Response(
                JSON.stringify({
                  uploadUrl: 'https://api.cloudinary.com/v1_1/conta/auto/upload',
                  apiKey: 'k',
                  timestamp: 1,
                  signature: 's',
                  folder: 'f',
                  public_id: ID,
                  type: 'private',
                }),
              )
            : new Response('{}', { status: 400 }),
        ),
      ),
    );
    const banco = cliente();

    await expect(
      anexarAJustificativa(banco as unknown as SupabaseClient, ID, arquivo('a.pdf', 'application/pdf')),
    ).rejects.toBeInstanceOf(ErroDeEnvio);
    expect(banco.rpc).not.toHaveBeenCalled();
  });

  it('lança o erro do banco quando o registro falha', async () => {
    servidorECloudinaryAceitam();
    const erro = { code: 'P0001', message: 'x' };

    await expect(
      anexarAJustificativa(cliente(erro) as unknown as SupabaseClient, ID, arquivo('a.pdf', 'application/pdf')),
    ).rejects.toBe(erro);
  });
});

describe('juntarAnexos', () => {
  const pdf = (nome: string): File => arquivo(nome, 'application/pdf');

  it('junta os escolhidos aos que já estavam', () => {
    const atual = pdf('a.pdf');
    const novo = pdf('b.pdf');
    expect(juntarAnexos([atual], [novo], 5)).toEqual({ arquivos: [atual, novo], problema: null });
  });

  it('deixa de fora o arquivo que não serve, dizendo qual e por quê', () => {
    const bom = pdf('a.pdf');
    const resultado = juntarAnexos([], [arquivo('video.mp4', 'video/mp4'), bom], 5);
    expect(resultado.arquivos).toEqual([bom]);
    expect(resultado.problema).toBe('video.mp4: Envie uma foto (JPG, PNG, WEBP ou HEIC) ou um PDF.');
  });

  it('para no máximo e avisa quantos cabem', () => {
    const resultado = juntarAnexos([pdf('a.pdf')], [pdf('b.pdf')], 1);
    expect(resultado.arquivos.map((f) => f.name)).toEqual(['a.pdf']);
    expect(resultado.problema).toBe('Você pode anexar até 1 arquivo.');
  });
});

describe('CampoDeAnexos', () => {
  function html(arquivos: File[], maximo: number): string {
    return renderToStaticMarkup(
      createElement(CampoDeAnexos, { arquivos, maximo, onMudar: () => undefined }),
    );
  }

  it('a dica diz formatos, tamanho e, quando cabe mais de um, quantos', () => {
    expect(dicaDosAnexos(1)).toBe('Opcional. JPG, PNG, WEBP, HEIC ou PDF, até 10 MB.');
    expect(dicaDosAnexos(5)).toBe('Opcional. JPG, PNG, WEBP, HEIC ou PDF, até 10 MB. Até 5 arquivos.');
  });

  it('vazio: só o botão "Anexar arquivo", que não envia o formulário', () => {
    const vazio = html([], 1);
    expect(vazio).toMatch(/<button[^>]*type="button"[^>]*>.*Anexar arquivo<\/button>/);
    expect(vazio).not.toContain('<ul');
  });

  it('o seletor só aceita os formatos do anexo e só escolhe vários quando cabem', () => {
    expect(html([], 1)).toMatch(/<input[^>]*accept="image\/jpeg,image\/png,image\/webp,image\/heic,application\/pdf,\.heic"/);
    expect(html([], 1)).not.toMatch(/<input[^>]*multiple/);
    expect(html([], 5)).toMatch(/<input[^>]*multiple/);
  });

  it('cheio: some o "Anexar arquivo" e cada arquivo tem o seu "Remover" com o nome', () => {
    const cheio = html([arquivo('atestado.pdf', 'application/pdf')], 1);
    expect(cheio).not.toContain('Anexar arquivo');
    expect(cheio).toContain('aria-label="Remover atestado.pdf"');
    expect(cheio).toMatch(/<svg[^>]*aria-hidden="true"/);
  });
});

describe('avisoDosAnexos', () => {
  it('sem Cloudinary, diz que o texto foi e que dá para seguir sem o anexo', () => {
    expect(avisoDosAnexos(1, true)).toBe(
      'O envio de arquivos não está disponível agora. O texto já foi registrado e pode seguir sem o anexo.',
    );
  });

  it('um anexo que falhou', () => {
    expect(avisoDosAnexos(1, false)).toBe(
      'O texto já foi registrado, mas um anexo não foi enviado.',
    );
  });

  it('vários anexos que falharam, com a contagem', () => {
    expect(avisoDosAnexos(2, false)).toBe(
      'O texto já foi registrado, mas 2 anexos não foram enviados.',
    );
  });
});
