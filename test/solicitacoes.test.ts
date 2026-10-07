import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { ErroDeValidacao } from '@/lib/erros';
import {
  buscarMinhasSolicitacoes,
  pedirEuEstavaNaAula,
  recadoDoPedido,
  rotuloDoPedido,
} from '@/lib/solicitacoes';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));

/** Cliente de mentira com uma resposta por RPC, na ordem das chamadas. */
function cliente(respostas: Record<string, { data: unknown; error: unknown }>) {
  const chamadas: [string, unknown][] = [];
  const falso = {
    rpc: async (nome: string, parametros?: unknown) => {
      chamadas.push([nome, parametros]);
      return respostas[nome] ?? { data: null, error: null };
    },
  } as unknown as SupabaseClient;
  return { falso, chamadas };
}

describe('Eu estava na aula (6.7)', () => {
  const nada = (): Promise<void> => Promise.resolve();

  it('cria o motivo primeiro e só abre o pedido ao concluir', async () => {
    const { falso, chamadas } = cliente({
      criar_motivo: { data: 'motivo-1', error: null },
      abrir_solicitacao: { data: 'pedido-1', error: null },
    });
    const aoConcluir = vi.fn(nada);

    const etapas = await pedirEuEstavaNaAula(falso, 'aula-1', '  Cheguei atrasado e fiquei.  ', aoConcluir);
    expect(chamadas).toEqual([
      ['criar_motivo', { p_kind: 'request_evidence', p_class_id: 'aula-1', p_texto: 'Cheguei atrasado e fiquei.' }],
    ]);

    await etapas.concluir(false);

    expect(chamadas[1]).toEqual([
      'abrir_solicitacao',
      { p_kind: 'student_was_present', p_class_id: 'aula-1', p_motivo_id: 'motivo-1' },
    ]);
    expect(aoConcluir).toHaveBeenCalledWith(false);
  });

  it('motivo vazio ou acima de 500 não vai ao banco', async () => {
    const { falso, chamadas } = cliente({});

    await expect(pedirEuEstavaNaAula(falso, 'a', '  ', nada)).rejects.toEqual(
      new ErroDeValidacao('Escreva o motivo, com até 500 caracteres.'),
    );
    await expect(pedirEuEstavaNaAula(falso, 'a', 'x'.repeat(501), nada)).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
    expect(chamadas).toEqual([]);
  });

  it('se o banco recusa o pedido, a recusa sobe com a frase dele e a tela não conclui', async () => {
    const recusa = { code: '23514', message: 'Esta aula foi trocada.' };
    const { falso } = cliente({
      criar_motivo: { data: 'motivo-1', error: null },
      abrir_solicitacao: { data: null, error: recusa },
    });
    const aoConcluir = vi.fn(nada);

    const etapas = await pedirEuEstavaNaAula(falso, 'a', 'Eu fui.', aoConcluir);

    await expect(etapas.concluir(false)).rejects.toBe(recusa);
    expect(aoConcluir).not.toHaveBeenCalled();
  });

  it('o "Tentar de novo" depois do pedido aberto não abre um segundo pedido', async () => {
    const { falso, chamadas } = cliente({
      criar_motivo: { data: 'motivo-1', error: null },
      abrir_solicitacao: { data: 'pedido-1', error: null },
    });
    const aoConcluir = vi
      .fn<(faltouAnexo: boolean) => Promise<void>>()
      .mockRejectedValueOnce(new Error('falhou ao recarregar'))
      .mockResolvedValueOnce(undefined);

    const etapas = await pedirEuEstavaNaAula(falso, 'a', 'Eu fui.', aoConcluir);
    await expect(etapas.concluir(true)).rejects.toThrow('falhou ao recarregar');
    await etapas.concluir(true);

    expect(chamadas.filter(([nome]) => nome === 'abrir_solicitacao')).toHaveLength(1);
    expect(aoConcluir).toHaveBeenCalledTimes(2);
  });

  it('se o motivo falha, o pedido nem é aberto', async () => {
    const falha = { code: '42501', message: 'Operação negada.' };
    const { falso, chamadas } = cliente({ criar_motivo: { data: null, error: falha } });

    await expect(pedirEuEstavaNaAula(falso, 'a', 'Eu fui.', nada)).rejects.toBe(falha);
    expect(chamadas).toHaveLength(1);
  });

  it('o recado diz quando algum anexo ficou de fora', () => {
    expect(recadoDoPedido(false)).toBe('Pedido enviado. Acompanhe a resposta em Meus pedidos.');
    expect(recadoDoPedido(true)).toBe(
      'Pedido enviado, sem os anexos que falharam. Acompanhe a resposta em Meus pedidos.',
    );
  });

  it('Meus pedidos lê só o "Eu estava na aula"', async () => {
    const { falso } = cliente({
      minhas_solicitacoes: {
        data: [
          {
            id: 'p1',
            kind: 'student_was_present',
            class_title: 'Muay Thai',
            class_date_time: '2026-09-30T22:00:00Z',
            status: 'approved',
            approved_by_name: 'Ana',
          },
          { id: 'p2', kind: 'teacher_absence', class_title: 'Outra', status: 'pending' },
        ],
        error: null,
      },
    });

    const pedidos = await buscarMinhasSolicitacoes(falso);

    expect(pedidos.map((p) => p.id)).toEqual(['p1']);
    expect(rotuloDoPedido(pedidos[0])).toBe('Pedido aprovado por Ana');
  });

  it('rótulos do pedido', () => {
    expect(rotuloDoPedido({ situacao: 'pending', aprovadaPor: null })).toBe('Pedido em análise');
    expect(rotuloDoPedido({ situacao: 'approved', aprovadaPor: null })).toBe('Pedido aprovado');
    expect(rotuloDoPedido({ situacao: 'rejected', aprovadaPor: null })).toBe('Pedido negado');
  });
});
