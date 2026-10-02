import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  agruparPorDia,
  buscarAulasDoAluno,
  estadoDaAula,
  formatarDiaEHora,
  inicioDoDia,
  lerAulaDoAluno,
  notaDaTroca,
  selosDaAula,
  type AulaDoAluno,
} from '@/lib/aulas';

/** Linha como `aulas_do_aluno` devolve, com o mínimo preenchido. */
function linha(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    class_id: '00000000-0000-4000-8000-000000000001',
    title: 'Muay Thai — Turma Noite',
    date_time: '2026-09-24T22:00:00+00:00',
    audience: 'both',
    cancelled: false,
    declared_status: null,
    justification_status: null,
    schedule_mode: 'fixed',
    teachers: [],
    origem: null,
    swap_status: null,
    swap_role: null,
    ...extra,
  };
}

function aula(extra: Record<string, unknown> = {}): AulaDoAluno {
  return lerAulaDoAluno(linha(extra));
}

// 24/09/2026 12:00 em São Paulo (quinta-feira).
const OUTRA_AULA = '2026-09-24T15:00:00+00:00';

describe('lerAulaDoAluno', () => {
  it('ignora a cor do professor que não é um hex', () => {
    const lida = aula({
      teachers: [
        { id: 'a', name: 'Ana', color: '#FF6B35' },
        { id: 'b', name: 'Rafael', color: 'red;background:url(x)' },
      ],
    });

    expect(lida.professores).toEqual([
      { nome: 'Ana', cor: '#FF6B35' },
      { nome: 'Rafael', cor: null },
    ]);
  });
});

describe('buscarAulasDoAluno', () => {
  it('chama aulas_do_aluno com o período e devolve na ordem do horário', async () => {
    const chamadas: unknown[] = [];
    const cliente = {
      rpc: async (nome: string, parametros: unknown) => {
        chamadas.push([nome, parametros]);
        return {
          data: [
            linha({ class_id: 'b', date_time: '2026-09-25T10:00:00+00:00' }),
            linha({ class_id: 'a', date_time: '2026-09-24T10:00:00+00:00' }),
          ],
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const aulas = await buscarAulasDoAluno(
      cliente,
      new Date('2026-09-24T03:00:00Z'),
      new Date('2026-10-01T03:00:00Z'),
    );

    expect(chamadas).toEqual([
      [
        'aulas_do_aluno',
        { p_de: '2026-09-24T03:00:00.000Z', p_ate: '2026-10-01T03:00:00.000Z' },
      ],
    ]);
    expect(aulas.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('repassa o erro do banco para a tela mostrar o estado de erro', async () => {
    const falha = { code: '42501', message: 'permission denied' };
    const cliente = {
      rpc: async () => ({ data: null, error: falha }),
    } as unknown as SupabaseClient;

    await expect(buscarAulasDoAluno(cliente, new Date(), new Date())).rejects.toBe(falha);
  });
});

describe('selosDaAula', () => {
  it('aula cancelada mostra só Cancelada', () => {
    expect(selosDaAula(aula({ cancelled: true, origem: 'turma', audience: 'free' }))).toEqual([
      { texto: 'Cancelada', tom: 'cancelada' },
    ]);
  });

  it('aula da grade do fixo mostra Sua aula, e ambos os públicos não têm selo', () => {
    expect(selosDaAula(aula({ origem: 'turma' }))).toEqual([{ texto: 'Sua aula', tom: 'sua' }]);
  });

  it('público só livres ou só fixos ganha o selo', () => {
    expect(selosDaAula(aula({ audience: 'free' }))).toEqual([{ texto: 'Livres', tom: 'livres' }]);
    expect(selosDaAula(aula({ audience: 'fixed' }))).toEqual([{ texto: 'Fixos', tom: 'fixos' }]);
  });

  it('troca permanente e troca avulsa aprovada têm selo próprio', () => {
    expect(selosDaAula(aula({ origem: 'permanente' }))[0].texto).toBe('Troca permanente');
    expect(selosDaAula(aula({ origem: 'troca', audience: 'free' }))).toEqual([
      { texto: 'Troca', tom: 'troca' },
      { texto: 'Livres', tom: 'livres' },
    ]);
  });
});

describe('estadoDaAula', () => {
  it('livre que avisou que vem vê Marcada', () => {
    expect(estadoDaAula(aula({ schedule_mode: 'free', declared_status: 'present' }))).toEqual({
      texto: 'Marcada',
      tom: 'marcada',
    });
  });

  it('fixo que avisou que vem na aula dele não vê Marcada', () => {
    expect(estadoDaAula(aula({ origem: 'turma', declared_status: 'present' }))).toBeNull();
  });

  it('extra e troca pendente do fixo', () => {
    expect(estadoDaAula(aula({ origem: 'extra' }))?.texto).toBe('Extra');
    expect(estadoDaAula(aula({ origem: 'troca_pendente' }))?.texto).toBe('Troca pendente');
  });

  it('aula cancelada não tem estado', () => {
    expect(estadoDaAula(aula({ cancelled: true, origem: 'extra' }))).toBeNull();
  });
});

describe('notaDaTroca', () => {
  const troca = (extra: Record<string, unknown>) =>
    aula({ swap_kind: 'once', swap_other_date_time: OUTRA_AULA, ...extra });

  it('na aula que ele trocou: Trocou para ou Troca pendente para', () => {
    expect(notaDaTroca(troca({ swap_status: 'approved', swap_role: 'origem' }))).toBe(
      'Trocou para qui 24/09 12:00',
    );
    expect(notaDaTroca(troca({ swap_status: 'pending', swap_role: 'origem' }))).toBe(
      'Troca pendente para qui 24/09 12:00',
    );
  });

  it('na aula nova aprovada: no lugar de', () => {
    expect(notaDaTroca(troca({ swap_status: 'approved', swap_role: 'destino' }))).toBe(
      'no lugar de qui 24/09 12:00',
    );
  });

  it('negada, expirada e cancelada usam os rótulos da § 3', () => {
    expect(notaDaTroca(troca({ swap_status: 'rejected', swap_role: 'destino' }))).toBe(
      'Troca negada',
    );
    expect(notaDaTroca(troca({ swap_status: 'expired', swap_role: 'destino' }))).toBe(
      'Troca expirada · vale a aula original',
    );
    expect(
      notaDaTroca(
        troca({ swap_status: 'cancelled', swap_role: 'origem', swap_decided_via: 'student' }),
      ),
    ).toBe('Você desistiu da troca');
    expect(
      notaDaTroca(troca({ swap_status: 'cancelled', swap_role: 'origem', swap_decided_via: 'system' })),
    ).toBe('Troca cancelada');
  });

  it('sem troca ou na permanente vigente, não há nota', () => {
    expect(notaDaTroca(aula())).toBeNull();
    expect(
      notaDaTroca(troca({ swap_kind: 'permanent', swap_status: 'approved', swap_role: 'destino' })),
    ).toBeNull();
  });
});

describe('datas no fuso da academia', () => {
  it('formata {dia dd/mm hh:mm} em São Paulo', () => {
    expect(formatarDiaEHora('2026-09-23T22:00:00Z')).toBe('qua 23/09 19:00');
  });

  it('o início do dia é 00:00 em São Paulo, mesmo depois das 21:00', () => {
    expect(inicioDoDia(new Date('2026-09-24T01:30:00Z')).toISOString()).toBe(
      '2026-09-23T03:00:00.000Z',
    );
  });

  it('agrupa por dia, com Hoje no primeiro', () => {
    const agora = new Date('2026-09-23T12:00:00Z');
    const dias = agruparPorDia(
      [
        aula({ class_id: 'a', date_time: '2026-09-23T10:00:00Z' }),
        aula({ class_id: 'b', date_time: '2026-09-23T22:00:00Z' }),
        aula({ class_id: 'c', date_time: '2026-09-24T15:00:00Z' }),
      ],
      agora,
    );

    expect(dias.map((d) => [d.rotulo, d.aulas.map((a) => a.id)])).toEqual([
      ['Hoje · qua 23/09', ['a', 'b']],
      ['Qui 24/09', ['c']],
    ]);
  });
});
