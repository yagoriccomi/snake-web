import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  atrasoDaChamada,
  buscarHistoricoDoAluno,
  situacaoNoHistorico,
  tomDaSituacao,
  type AulaDoHistorico,
} from '@/lib/historico';

function aula(extra: Partial<AulaDoHistorico> = {}): AulaDoHistorico {
  return {
    id: 'a1',
    quando: '2026-09-23T22:00:00Z',
    titulo: 'Muay Thai — Turma Noite',
    cancelada: false,
    presenca: null,
    origem: 'turma',
    justificativa: null,
    editada: false,
    diasDeAtraso: null,
    outraQuando: null,
    ...extra,
  };
}

describe('histórico do aluno (6.8)', () => {
  it('chama historico_de_aulas_do_aluno e ordena do mais recente', async () => {
    const chamadas: unknown[] = [];
    const cliente = {
      rpc: async (nome: string, parametros: unknown) => {
        chamadas.push([nome, parametros]);
        return {
          data: [
            { class_id: 'velha', date_time: '2026-09-01T22:00:00Z', title: 'A', edited: false },
            {
              class_id: 'nova',
              date_time: '2026-09-20T22:00:00Z',
              title: 'B',
              edited: true,
              edited_by_name: 'Não deveria aparecer',
              previous_status: 'absent',
              attendance_delay_days: 2,
            },
          ],
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const historico = await buscarHistoricoDoAluno(cliente, 'u1', '2026-09-01', '2026-09-30');

    expect(chamadas).toEqual([
      ['historico_de_aulas_do_aluno', { p_user_id: 'u1', p_de: '2026-09-01', p_ate: '2026-09-30' }],
    ]);
    expect(historico.map((a) => a.id)).toEqual(['nova', 'velha']);
    expect(historico[0]).toMatchObject({ editada: true, diasDeAtraso: 2 });
    // D20: quem editou e o valor anterior nunca entram no modelo da tela.
    expect(Object.keys(historico[0])).not.toContain('editadaPor');
    expect(JSON.stringify(historico[0])).not.toContain('Não deveria aparecer');
  });

  it('repassa o erro do banco', async () => {
    const falha = { code: '42501', message: 'permission denied' };
    const cliente = { rpc: async () => ({ data: null, error: falha }) } as unknown as SupabaseClient;

    await expect(buscarHistoricoDoAluno(cliente, 'u1', 'a', 'b')).rejects.toBe(falha);
  });

  it('situações com a leitura do app', () => {
    expect(situacaoNoHistorico(aula({ presenca: 'present' }))).toBe('Presente');
    expect(situacaoNoHistorico(aula({ presenca: 'absent' }))).toBe('Falta');
    expect(situacaoNoHistorico(aula({ presenca: 'absent', justificativa: 'approved' }))).toBe(
      'Falta justificada',
    );
    expect(situacaoNoHistorico(aula({ cancelada: true, presenca: 'absent' }))).toBe('Cancelada');
    expect(situacaoNoHistorico(aula())).toBe('Sem registro');
  });

  it('a aula que ele trocou mostra Trocou para, nunca Falta', () => {
    const trocada = aula({ origem: 'trocou', presenca: 'absent', outraQuando: '2026-09-24T15:00:00Z' });

    expect(situacaoNoHistorico(trocada)).toBe('Trocou para qui 24/09 12:00');
    expect(tomDaSituacao(trocada)).toBe('neutro');
  });

  it('atraso da chamada (T14)', () => {
    expect(atrasoDaChamada(null)).toBeNull();
    expect(atrasoDaChamada(1)).toBe('Feita 1 dia depois');
    expect(atrasoDaChamada(3)).toBe('Feita 3 dias depois');
  });
});
