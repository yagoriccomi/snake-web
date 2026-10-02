import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  avisoDeMesAberto,
  buscarFrequenciaDaSemana,
  buscarFrequenciaDoMes,
  buscarSemanasDoMes,
  diaEMesDaData,
  feitasDeEsperadas,
  formatarPercentual,
  nomeDoMes,
  rotulosDaFrequencia,
  somarMeses,
  type FrequenciaDoMes,
} from '@/lib/frequencia';

/** Cliente de mentira que registra a chamada e devolve a resposta dada. */
function cliente(resposta: { data: unknown; error: unknown }) {
  const chamadas: unknown[] = [];
  const falso = {
    rpc: async (nome: string, parametros: unknown) => {
      chamadas.push([nome, parametros]);
      return resposta;
    },
  } as unknown as SupabaseClient;
  return { falso, chamadas };
}

const USUARIO = '00000000-0000-4000-8000-000000000001';

describe('leitura das RPCs de frequência', () => {
  it('frequencia_semanal da semana de hoje, no fuso da academia', async () => {
    const { falso, chamadas } = cliente({
      data: [
        {
          schedule_mode: 'free',
          weekly_target: 3,
          expected: 3,
          attended: 1,
          frequency_percent: 33.33,
        },
      ],
      error: null,
    });

    // 02:00 UTC de 03/10 ainda é 02/10 em São Paulo.
    const semana = await buscarFrequenciaDaSemana(falso, USUARIO, new Date('2026-10-03T02:00:00Z'));

    expect(chamadas).toEqual([
      ['frequencia_semanal', { p_user_ids: [USUARIO], p_de: '2026-10-02', p_ate: '2026-10-02' }],
    ]);
    expect(semana).toEqual({
      modalidade: 'free',
      meta: 3,
      esperadas: 3,
      feitas: 1,
      percentual: 33.33,
    });
  });

  it('percentual nulo continua nulo (esperado zero)', async () => {
    const { falso } = cliente({
      data: [{ schedule_mode: 'fixed', expected: 0, attended: 0, frequency_percent: null }],
      error: null,
    });

    const mes = await buscarFrequenciaDoMes(falso, USUARIO, '2026-10-01');

    expect(mes?.percentual).toBeNull();
    expect(formatarPercentual(mes?.percentual ?? null)).toBe('—');
  });

  it('sem linha, não há frequência', async () => {
    const { falso } = cliente({ data: [], error: null });

    expect(await buscarFrequenciaDaSemana(falso, USUARIO, new Date())).toBeNull();
  });

  it('repassa o erro do banco para a tela', async () => {
    const falha = { code: '42501', message: 'permission denied' };
    const { falso } = cliente({ data: null, error: falha });

    await expect(buscarSemanasDoMes(falso, USUARIO, '2026-10-01')).rejects.toBe(falha);
  });

  it('semanas_do_mes, com a semana extra', async () => {
    const { falso, chamadas } = cliente({
      data: [
        {
          week_start: '2026-06-29',
          week_end: '2026-07-05',
          label: 'Semana extra',
          is_split: true,
          expected_week: 2,
          attended_week: 2,
          week_percent: 100,
          expected_in_month: 1,
          attended_in_month: 1,
        },
      ],
      error: null,
    });

    const semanas = await buscarSemanasDoMes(falso, USUARIO, '2026-07-01');

    expect(chamadas).toEqual([['semanas_do_mes', { p_user_id: USUARIO, p_mes: '2026-07-01' }]]);
    expect(semanas[0]).toMatchObject({ rotulo: 'Semana extra', dividida: true, feitasNoMes: 1 });
  });
});

describe('formatação e rótulos da § 3', () => {
  it('percentual em português, com até uma casa', () => {
    expect(formatarPercentual(37.5)).toBe('37,5%');
    expect(formatarPercentual(150)).toBe('150%');
    expect(formatarPercentual(33.333)).toBe('33,3%');
  });

  it('{a} de {e}', () => {
    expect(feitasDeEsperadas(7, 12)).toBe('7 de 12');
  });

  it('à vontade fala em meta; os outros, em semana e mês', () => {
    expect(rotulosDaFrequencia('unlimited')).toEqual({ semana: 'Meta da semana', mes: 'Meta do mês' });
    expect(rotulosDaFrequencia('fixed')).toEqual({ semana: 'Semana', mes: 'Mês' });
    expect(rotulosDaFrequencia(null)).toEqual({ semana: 'Semana', mes: 'Mês' });
  });

  it('datas e meses sem passar por fuso', () => {
    expect(diaEMesDaData('2026-07-05')).toBe('05/07');
    expect(somarMeses('2026-01-01', -1)).toBe('2025-12-01');
    expect(somarMeses('2026-12-01', 1)).toBe('2027-01-01');
    expect(nomeDoMes('2026-10-01')).toBe('Outubro de 2026');
  });
});

describe('avisoDeMesAberto', () => {
  const junho: FrequenciaDoMes = {
    modalidade: 'free',
    esperadas: 9,
    feitas: 9,
    percentual: 100,
    fechaEm: '2026-07-05',
    fechado: false,
  };

  it('aparece depois do fim do mês, enquanto ele não fechou', () => {
    expect(avisoDeMesAberto(junho, '2026-06-01', new Date('2026-07-02T15:00:00Z'))).toBe(
      'Fecha em 05/07, quando a semana extra terminar',
    );
  });

  it('não aparece no mês corrente comum nem no mês já fechado', () => {
    expect(avisoDeMesAberto(junho, '2026-06-01', new Date('2026-06-20T15:00:00Z'))).toBeNull();
    expect(
      avisoDeMesAberto({ ...junho, fechado: true }, '2026-06-01', new Date('2026-07-02T15:00:00Z')),
    ).toBeNull();
  });

  it('o último dia do mês ainda é o mês, no fuso da academia', () => {
    // 01/07 01:00 UTC ainda é 30/06 em São Paulo.
    expect(avisoDeMesAberto(junho, '2026-06-01', new Date('2026-07-01T01:00:00Z'))).toBeNull();
  });
});
