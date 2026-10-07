import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { motivoDaFalhaDeLeitura } from '@/lib/erros';
import { buscarMensalidadeParaPagar } from '@/lib/pagamento';

interface Resposta {
  data: unknown;
  error: unknown;
}

const PAGAMENTO = {
  id: 'p1',
  due_date: '2026-10-10',
  amount_cents: 15000,
  status: 'open',
};

function cliente(pagamento: Resposta, configuracao: Resposta): SupabaseClient {
  return {
    from: (tabela: string) => {
      const resposta = tabela === 'payments' ? pagamento : configuracao;
      const consulta = {
        select: () => consulta,
        eq: () => consulta,
        maybeSingle: async () => resposta,
      };
      return consulta;
    },
  } as unknown as SupabaseClient;
}

describe('leitura da página de pagar (D32)', () => {
  it('mensalidade e chave lidas devolvem os dados da tela', async () => {
    const lida = await buscarMensalidadeParaPagar(
      cliente({ data: PAGAMENTO, error: null }, { data: { pix_key: 'pix@academia' }, error: null }),
      'p1',
    );

    expect(lida).toEqual({
      id: 'p1',
      vencimento: '2026-10-10',
      valorCentavos: 15000,
      emAnalise: false,
      chavePix: 'pix@academia',
    });
  });

  it('comprovante já enviado marca a mensalidade em análise', async () => {
    const lida = await buscarMensalidadeParaPagar(
      cliente(
        { data: { ...PAGAMENTO, status: 'pending_approval' }, error: null },
        { data: { pix_key: 'pix@academia' }, error: null },
      ),
      'p1',
    );

    expect(lida?.emAnalise).toBe(true);
  });

  it('banco sem a mensalidade devolve null (não encontrada)', async () => {
    const lida = await buscarMensalidadeParaPagar(
      cliente({ data: null, error: null }, { data: { pix_key: 'pix@academia' }, error: null }),
      'p1',
    );

    expect(lida).toBeNull();
  });

  it('chave vazia ou ausente vira null (a academia não cadastrou)', async () => {
    const semConfiguracao = await buscarMensalidadeParaPagar(
      cliente({ data: PAGAMENTO, error: null }, { data: null, error: null }),
      'p1',
    );
    const emBranco = await buscarMensalidadeParaPagar(
      cliente({ data: PAGAMENTO, error: null }, { data: { pix_key: '  ' }, error: null }),
      'p1',
    );

    expect(semConfiguracao?.chavePix).toBeNull();
    expect(emBranco?.chavePix).toBeNull();
  });

  it('falha de rede na mensalidade sobe como erro, e a tela pede para conferir a internet', async () => {
    const rede = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' };

    const leitura = buscarMensalidadeParaPagar(
      cliente({ data: null, error: rede }, { data: { pix_key: 'pix@academia' }, error: null }),
      'p1',
    );

    await expect(leitura).rejects.toBe(rede);
    expect(motivoDaFalhaDeLeitura(rede)).toBe('Verifique sua internet e tente de novo.');
  });

  it('falha na leitura da chave sobe como erro, em vez de "a academia não cadastrou"', async () => {
    const recusa = { code: '42501', message: 'permission denied for table academy_settings' };

    await expect(
      buscarMensalidadeParaPagar(cliente({ data: PAGAMENTO, error: null }, { data: null, error: recusa }), 'p1'),
    ).rejects.toBe(recusa);
  });
});
