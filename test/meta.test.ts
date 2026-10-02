import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  buscarMetaDaSemana,
  definirMetaSemanal,
  proximaSegunda,
  segundaEmTexto,
  textoDaMudanca,
} from '@/lib/meta';

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

describe('meta semanal do à vontade (6.5)', () => {
  it('definir_meta_semanal devolve a meta e a segunda em que vale', async () => {
    const { falso, chamadas } = cliente({
      data: { meta: 5, vale_a_partir: '2026-10-05' },
      error: null,
    });

    expect(await definirMetaSemanal(falso, 5)).toEqual({ meta: 5, valeAPartir: '2026-10-05' });
    expect(chamadas).toEqual([['definir_meta_semanal', { p_meta: 5 }]]);
  });

  it('a recusa do banco (sem plano à vontade) sobe com o código e a frase', async () => {
    const recusa = { code: '23514', message: 'Só quem tem o plano à vontade define meta.' };
    const { falso } = cliente({ data: null, error: recusa });

    await expect(definirMetaSemanal(falso, 3)).rejects.toBe(recusa);
  });

  it('meta_da_semana da semana pedida', async () => {
    const { falso, chamadas } = cliente({ data: 4, error: null });

    expect(await buscarMetaDaSemana(falso, 'u1', '2026-10-05')).toBe(4);
    expect(chamadas).toEqual([['meta_da_semana', { p_user_id: 'u1', p_week_start: '2026-10-05' }]]);
  });

  it('a próxima segunda, no fuso da academia, mesmo no domingo à noite', () => {
    // Domingo, 04/10/2026, 23:30 em São Paulo.
    expect(proximaSegunda(new Date('2026-10-05T02:30:00Z'))).toBe('2026-10-05');
    // Sexta, 02/10.
    expect(proximaSegunda(new Date('2026-10-02T15:00:00Z'))).toBe('2026-10-05');
  });

  it('textos da § 3', () => {
    expect(segundaEmTexto('2026-10-05')).toBe('seg 05/10');
    expect(textoDaMudanca('2026-10-05', 4)).toBe(
      'Vale a partir de seg 05/10. A meta desta semana continua 4x.',
    );
  });
});
