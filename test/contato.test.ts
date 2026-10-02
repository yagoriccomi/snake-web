import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  buscarContatoDaAcademia,
  formatarWhatsapp,
  linkDoEmail,
  linkDoWhatsapp,
  temContato,
} from '@/lib/contato';

function cliente(resposta: { data: unknown; error: unknown }) {
  const chamadas: unknown[] = [];
  const falso = {
    rpc: async (nome: string) => {
      chamadas.push(nome);
      return resposta;
    },
  } as unknown as SupabaseClient;
  return { falso, chamadas };
}

describe('contato da academia (6.15)', () => {
  it('lê só pela RPC contato_da_academia', async () => {
    const { falso, chamadas } = cliente({
      data: { whatsapp: '5511912345678', email: 'contato@academia.com.br' },
      error: null,
    });

    expect(await buscarContatoDaAcademia(falso)).toEqual({
      whatsapp: '5511912345678',
      email: 'contato@academia.com.br',
    });
    expect(chamadas).toEqual(['contato_da_academia']);
  });

  it('sem contato cadastrado, os dois vêm nulos', async () => {
    const { falso } = cliente({ data: { whatsapp: null, email: '' }, error: null });

    const contato = await buscarContatoDaAcademia(falso);

    expect(contato).toEqual({ whatsapp: null, email: null });
    expect(temContato(contato)).toBe(false);
  });

  it('repassa o erro do banco', async () => {
    const falha = { code: '42501', message: 'permission denied' };
    const { falso } = cliente({ data: null, error: falha });

    await expect(buscarContatoDaAcademia(falso)).rejects.toBe(falha);
  });

  it('WhatsApp como +55 (DD) NNNNN-NNNN, ou NNNN-NNNN com 8 dígitos', () => {
    expect(formatarWhatsapp('5511912345678')).toBe('+55 (11) 91234-5678');
    expect(formatarWhatsapp('551132345678')).toBe('+55 (11) 3234-5678');
  });

  it('links do WhatsApp e do e-mail', () => {
    expect(linkDoWhatsapp('5511912345678')).toBe('https://wa.me/5511912345678');
    expect(linkDoEmail('contato@academia.com.br')).toBe('mailto:contato@academia.com.br');
  });
});
