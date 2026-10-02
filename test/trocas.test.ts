import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { lerAulaDoAluno, type AulaDoAluno } from '@/lib/aulas';
import { ErroDeValidacao } from '@/lib/erros';
import {
  ehReposicao,
  opcoesDeOrigem,
  pedirTroca,
  textoDoFimDoHorario,
  tiposPossiveis,
} from '@/lib/trocas';

function aula(id: string, extra: Record<string, unknown> = {}): AulaDoAluno {
  return lerAulaDoAluno({
    class_id: id,
    title: `Aula ${id}`,
    date_time: '2026-09-24T22:00:00Z',
    audience: 'both',
    ...extra,
  });
}

function cliente(respostas: Record<string, { data: unknown; error: unknown }>) {
  const chamadas: unknown[] = [];
  const falso = {
    rpc: async (nome: string, parametros?: unknown) => {
      chamadas.push([nome, parametros]);
      return respostas[nome] ?? { data: null, error: null };
    },
  } as unknown as SupabaseClient;
  return { falso, chamadas };
}

describe('folha Trocar aula (6.13)', () => {
  const nova = aula('nova', { can_swap_to: true, is_recurring: true });

  it('os tipos saem das colunas: avulsa com can_swap_from; permanente com a nova recorrente', () => {
    expect(tiposPossiveis(nova, [nova, aula('a', { can_swap_from: true })])).toEqual(['once']);
    expect(
      tiposPossiveis(nova, [aula('a', { can_swap_from: true, can_swap_from_permanent: true })]),
    ).toEqual(['once', 'permanent']);
    expect(
      tiposPossiveis(aula('n2', { can_swap_to: true }), [aula('a', { can_swap_from_permanent: true })]),
    ).toEqual([]);
  });

  it('as aulas de origem de cada tipo, nunca a própria aula nova', () => {
    const semana = [
      { ...nova, podeTrocarDe: true },
      aula('so-avulsa', { can_swap_from: true }),
      aula('so-permanente', { can_swap_from_permanent: true }),
    ];

    expect(opcoesDeOrigem(semana, nova, 'once').map((a) => a.id)).toEqual(['so-avulsa']);
    expect(opcoesDeOrigem(semana, nova, 'permanent').map((a) => a.id)).toEqual(['so-permanente']);
  });

  it('reposição é a original que já começou', () => {
    const original = aula('a', { date_time: '2026-09-22T22:00:00Z' });

    expect(ehReposicao(original, new Date('2026-09-23T12:00:00Z'))).toBe(true);
    expect(ehReposicao(original, new Date('2026-09-22T12:00:00Z'))).toBe(false);
  });

  it('texto do fim do horário', () => {
    expect(textoDoFimDoHorario('2026-12-19')).toBe('Este horário termina em 19/12.');
  });

  it('avulsa: só pedir_troca_de_aula, sem motivo', async () => {
    const { falso, chamadas } = cliente({ pedir_troca_de_aula: { data: 'troca-1', error: null } });

    expect(await pedirTroca(falso, { de: 'a', para: 'nova', tipo: 'once' })).toBe('troca-1');
    expect(chamadas).toEqual([
      ['pedir_troca_de_aula', { p_de: 'a', p_para: 'nova', p_tipo: 'once', p_motivo_id: null }],
    ]);
  });

  it('permanente: o motivo class_swap_evidence sem aula e depois o pedido com ele', async () => {
    const { falso, chamadas } = cliente({
      criar_motivo: { data: 'motivo-1', error: null },
      pedir_troca_de_aula: { data: 'troca-2', error: null },
    });

    await pedirTroca(falso, {
      de: 'a',
      para: 'nova',
      tipo: 'permanent',
      justificativa: '  Mudei de turno no trabalho.  ',
    });

    expect(chamadas).toEqual([
      ['criar_motivo', { p_kind: 'class_swap_evidence', p_class_id: null, p_texto: 'Mudei de turno no trabalho.' }],
      [
        'pedir_troca_de_aula',
        { p_de: 'a', p_para: 'nova', p_tipo: 'permanent', p_motivo_id: 'motivo-1' },
      ],
    ]);
  });

  it('permanente sem justificativa não vai ao banco', async () => {
    const { falso, chamadas } = cliente({});

    await expect(
      pedirTroca(falso, { de: 'a', para: 'nova', tipo: 'permanent', justificativa: ' ' }),
    ).rejects.toEqual(new ErroDeValidacao('Para a troca permanente, escreva a justificativa.'));
    expect(chamadas).toEqual([]);
  });

  it('a recusa do banco sobe com a frase dele', async () => {
    const recusa = { code: '23514', message: 'Você já tem aula neste horário.' };
    const { falso } = cliente({ pedir_troca_de_aula: { data: null, error: recusa } });

    await expect(pedirTroca(falso, { de: 'a', para: 'nova', tipo: 'once' })).rejects.toBe(recusa);
  });
});
