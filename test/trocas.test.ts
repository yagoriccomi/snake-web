import type { SupabaseClient } from '@supabase/supabase-js';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { FolhaDeTroca } from '@/components/FolhaDeTroca';

import { lerAulaDoAluno, type AulaDoAluno } from '@/lib/aulas';
import { ErroDeValidacao } from '@/lib/erros';
import {
  buscarMinhasTrocas,
  descricaoDaAulaDaTroca,
  desistirDaTroca,
  ehReposicao,
  opcoesDeOrigem,
  pedirTroca,
  recadoDaTroca,
  rotuloDaTroca,
  textoDoFimDoHorario,
  tiposPossiveis,
} from '@/lib/trocas';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));

const nada = (): Promise<void> => Promise.resolve();

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
  const chamadas: [string, unknown][] = [];
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

  it('avulsa: só pedir_troca_de_aula, sem motivo nem etapas', async () => {
    const { falso, chamadas } = cliente({ pedir_troca_de_aula: { data: 'troca-1', error: null } });
    const aoConcluir = vi.fn(nada);

    expect(await pedirTroca(falso, { de: 'a', para: 'nova', tipo: 'once' }, aoConcluir)).toBeUndefined();
    expect(chamadas).toEqual([
      ['pedir_troca_de_aula', { p_de: 'a', p_para: 'nova', p_tipo: 'once', p_motivo_id: null }],
    ]);
    expect(aoConcluir).toHaveBeenCalledWith(false);
  });

  it('permanente: o motivo class_swap_evidence sem aula, e o pedido com ele só ao concluir', async () => {
    const { falso, chamadas } = cliente({
      criar_motivo: { data: 'motivo-1', error: null },
      pedir_troca_de_aula: { data: 'troca-2', error: null },
    });
    const aoConcluir = vi.fn(nada);

    const etapas = await pedirTroca(
      falso,
      { de: 'a', para: 'nova', tipo: 'permanent', justificativa: '  Mudei de turno no trabalho.  ' },
      aoConcluir,
    );
    expect(chamadas).toEqual([
      ['criar_motivo', { p_kind: 'class_swap_evidence', p_class_id: null, p_texto: 'Mudei de turno no trabalho.' }],
    ]);

    await etapas?.concluir(true);

    expect(chamadas[1]).toEqual([
      'pedir_troca_de_aula',
      { p_de: 'a', p_para: 'nova', p_tipo: 'permanent', p_motivo_id: 'motivo-1' },
    ]);
    expect(aoConcluir).toHaveBeenCalledWith(true);
  });

  it('o "Tentar de novo" depois da troca pedida não pede uma segunda', async () => {
    const { falso, chamadas } = cliente({
      criar_motivo: { data: 'motivo-1', error: null },
      pedir_troca_de_aula: { data: 'troca-2', error: null },
    });
    const aoConcluir = vi
      .fn<(faltouAnexo: boolean) => Promise<void>>()
      .mockRejectedValueOnce(new Error('falhou ao recarregar'))
      .mockResolvedValueOnce(undefined);

    const etapas = await pedirTroca(
      falso,
      { de: 'a', para: 'nova', tipo: 'permanent', justificativa: 'Mudei de turno.' },
      aoConcluir,
    );
    await expect(etapas?.concluir(false)).rejects.toThrow('falhou ao recarregar');
    await etapas?.concluir(false);

    expect(chamadas.filter(([nome]) => nome === 'pedir_troca_de_aula')).toHaveLength(1);
    expect(aoConcluir).toHaveBeenCalledTimes(2);
  });

  it('permanente sem justificativa não vai ao banco', async () => {
    const { falso, chamadas } = cliente({});

    await expect(
      pedirTroca(falso, { de: 'a', para: 'nova', tipo: 'permanent', justificativa: ' ' }, nada),
    ).rejects.toEqual(new ErroDeValidacao('Para a troca permanente, escreva a justificativa.'));
    expect(chamadas).toEqual([]);
  });

  it('a recusa do banco sobe com a frase dele, e a tela não conclui', async () => {
    const recusa = { code: '23514', message: 'Você já tem aula neste horário.' };
    const { falso } = cliente({ pedir_troca_de_aula: { data: null, error: recusa } });
    const aoConcluir = vi.fn(nada);

    await expect(pedirTroca(falso, { de: 'a', para: 'nova', tipo: 'once' }, aoConcluir)).rejects.toBe(
      recusa,
    );
    expect(aoConcluir).not.toHaveBeenCalled();
  });

  it('o campo de anexo (até 5) aparece só na permanente', () => {
    const folha = (semana: AulaDoAluno[]): string =>
      renderToStaticMarkup(
        createElement(FolhaDeTroca, {
          nova,
          semana,
          onPedir: () => Promise.resolve(),
          onFechar: () => undefined,
        }),
      );

    expect(folha([aula('a', { can_swap_from_permanent: true })])).toContain('Até 5 arquivos.');
    expect(folha([aula('a', { can_swap_from: true })])).not.toContain('Anexar arquivo');
  });

  it('o recado diz quando algum anexo da permanente ficou de fora', () => {
    expect(recadoDaTroca(false)).toBe(
      'Pedido de troca enviado. A aula nova fica como Troca pendente até a decisão.',
    );
    expect(recadoDaTroca(true)).toBe(
      'Pedido de troca enviado, sem os anexos que falharam. A aula nova fica como Troca pendente até a decisão.',
    );
  });
});

describe('Meus pedidos e Desistir da troca (6.14)', () => {
  it('desistir_da_troca com o id da troca', async () => {
    const { falso, chamadas } = cliente({});

    await desistirDaTroca(falso, 'troca-1');

    expect(chamadas).toEqual([['desistir_da_troca', { p_id: 'troca-1' }]]);
  });

  it('a recusa da desistência sobe com a frase do banco', async () => {
    const recusa = { code: '23514', message: 'Não dá mais para desistir: uma das aulas já começou.' };
    const { falso } = cliente({ desistir_da_troca: { data: null, error: recusa } });

    await expect(desistirDaTroca(falso, 'troca-1')).rejects.toBe(recusa);
  });

  it('minhas_trocas vira a lista, com o texto da permanente', async () => {
    const { falso } = cliente({
      minhas_trocas: {
        data: [
          {
            id: 't1',
            kind: 'permanent',
            status: 'pending',
            decided_via: null,
            from_title: 'Turma Noite',
            from_date_time: '2026-09-24T22:00:00Z',
            to_title: null,
            to_date_time: null,
            is_makeup: false,
            motivo_texto: 'Mudei de turno.',
            approved_by_name: null,
            can_cancel: true,
          },
        ],
        error: null,
      },
    });

    const [troca] = await buscarMinhasTrocas(falso);

    expect(troca).toMatchObject({ tipo: 'permanent', motivo: 'Mudei de turno.', podeDesistir: true });
    expect(descricaoDaAulaDaTroca(troca.tituloPara, troca.quandoPara)).toBe('Aula removida');
    expect(descricaoDaAulaDaTroca(troca.tituloDe, troca.quandoDe)).toBe(
      'Turma Noite · qui 24/09 19:00',
    );
  });

  it('rótulos da § 3, sem nunca mostrar quem negou', () => {
    const r = (
      situacao: Parameters<typeof rotuloDaTroca>[0]['situacao'],
      extra: { decididaPor?: string; aprovadaPor?: string } = {},
    ) => rotuloDaTroca({ situacao, decididaPor: null, aprovadaPor: null, ...extra });

    expect(r('pending')).toBe('Troca pendente');
    expect(r('approved', { aprovadaPor: 'Ana' })).toBe('Troca aprovada por Ana');
    expect(r('approved', { decididaPor: 'system' })).toBe('Troca abonada: a aula nova foi cancelada');
    expect(r('rejected')).toBe('Troca negada');
    expect(r('expired')).toBe('Troca expirada · vale a aula original');
    expect(r('cancelled', { decididaPor: 'student' })).toBe('Você desistiu da troca');
    expect(r('cancelled', { decididaPor: 'system' })).toBe('Troca cancelada');
  });
});
