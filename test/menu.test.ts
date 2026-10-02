import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { lerAulaDoAluno, type AulaDoAluno } from '@/lib/aulas';
import {
  buscarDiasDeAula,
  buscarMenuDeAulas,
  diaInicial,
  diasDoMenu,
  quantasAulas,
} from '@/lib/menu';

function aula(id: string, quando: string): AulaDoAluno {
  return lerAulaDoAluno({ class_id: id, title: 'Aula', date_time: quando, audience: 'both' });
}

describe('menu de aulas (6.12)', () => {
  it('chama menu_de_aulas com a semana e ordena pelo horário', async () => {
    const chamadas: unknown[] = [];
    const cliente = {
      rpc: async (nome: string, parametros: unknown) => {
        chamadas.push([nome, parametros]);
        return {
          data: [
            { class_id: 'b', date_time: '2026-09-23T22:00:00Z', audience: 'free' },
            { class_id: 'a', date_time: '2026-09-22T10:00:00Z', audience: 'both' },
          ],
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const aulas = await buscarMenuDeAulas(cliente, '2026-09-24');

    expect(chamadas).toEqual([['menu_de_aulas', { p_semana: '2026-09-24' }]]);
    expect(aulas.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('a recusa da semana fora do menu sobe com a frase do banco', async () => {
    const recusa = { code: '22023', message: 'Escolha esta semana ou a próxima.' };
    const cliente = { rpc: async () => ({ data: null, error: recusa }) } as unknown as SupabaseClient;

    await expect(buscarMenuDeAulas(cliente, '2026-12-01')).rejects.toBe(recusa);
  });

  it('dias de aula de academy_settings, com o padrão seg a sáb', async () => {
    const consulta = (dados: unknown) =>
      ({
        from: () => ({ select: () => ({ limit: async () => ({ data: dados, error: null }) }) }),
      }) as unknown as SupabaseClient;

    expect(await buscarDiasDeAula(consulta([{ class_weekdays: [1, 3, 5] }]))).toEqual([1, 3, 5]);
    expect(await buscarDiasDeAula(consulta([{ class_weekdays: null }]))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(await buscarDiasDeAula(consulta([]))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('um dia por dia configurado, e a aula fora deles no dia dela', () => {
    // Semana de 21/09/2026 (segunda). Dias: seg, qua; aula num sábado também.
    const dias = diasDoMenu(
      '2026-09-21',
      [1, 3],
      [aula('qua', '2026-09-23T22:00:00Z'), aula('sab', '2026-09-26T13:00:00Z')],
      new Date('2026-09-23T15:00:00Z'),
    );

    expect(dias.map((d) => [d.semana, d.dia, d.passado, d.aulas.map((a) => a.id)])).toEqual([
      ['Seg', '21', true, []],
      ['Qua', '23', false, ['qua']],
      ['Sáb', '26', false, ['sab']],
    ]);
  });

  it('domingo (0) é o último dia da semana do menu', () => {
    const dias = diasDoMenu('2026-09-21', [0, 1], [], new Date('2026-09-21T12:00:00Z'));

    expect(dias.map((d) => d.chave)).toEqual(['2026-09-21', '2026-09-27']);
  });

  it('abre em hoje quando a semana tem hoje; senão, no primeiro dia', () => {
    const dias = diasDoMenu('2026-09-21', [1, 3, 5], [], new Date('2026-09-23T12:00:00Z'));

    expect(diaInicial(dias, new Date('2026-09-23T12:00:00Z'))).toBe('2026-09-23');
    expect(diaInicial(dias, new Date('2026-09-15T12:00:00Z'))).toBe('2026-09-21');
    expect(diaInicial([], new Date())).toBeNull();
  });

  it('quantas aulas', () => {
    expect(quantasAulas(1)).toBe('1 aula');
    expect(quantasAulas(3)).toBe('3 aulas');
  });
});
