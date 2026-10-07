import { describe, expect, it } from 'vitest';

import { problemaNoArquivo, TAMANHO_MAXIMO_MB } from '@/lib/comprovante';

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
