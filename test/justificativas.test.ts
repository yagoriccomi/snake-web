import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { ErroDeValidacao } from '@/lib/erros';
import {
  assuntoDaJustificativa,
  buscarMinhasJustificativas,
  enviarJustificativa,
  NEGADA_PELA_SEGUNDA_VEZ,
  reenviarJustificativa,
  rotuloDaJustificativa,
  type MinhaJustificativa,
} from '@/lib/justificativas';

function cliente(resposta: { data: unknown; error: unknown }) {
  const chamadas: unknown[] = [];
  const falso = {
    rpc: async (nome: string, parametros?: unknown) => {
      chamadas.push([nome, parametros]);
      return resposta;
    },
  } as unknown as SupabaseClient;
  return { falso, chamadas };
}

function justificativa(extra: Partial<MinhaJustificativa> = {}): MinhaJustificativa {
  return {
    id: 'j1',
    escopo: 'class',
    tituloDaAula: 'Muay Thai — Turma Noite',
    quandoDaAula: '2026-09-23T22:00:00Z',
    semana: '2026-09-21',
    mensagem: 'Consulta médica.',
    situacao: 'pending',
    tentativa: 1,
    aprovadaPor: null,
    podeReenviar: false,
    reenviarAte: null,
    ...extra,
  };
}

describe('envio e reenvio (6.6)', () => {
  it('justificativa da aula: escopo class, sem semana, texto aparado', async () => {
    const { falso, chamadas } = cliente({ data: 'j-nova', error: null });

    const id = await enviarJustificativa(falso, {
      escopo: 'class',
      classId: 'aula-1',
      texto: '  Consulta médica.  ',
    });

    expect(id).toBe('j-nova');
    expect(chamadas).toEqual([
      [
        'enviar_justificativa',
        { p_scope: 'class', p_class_id: 'aula-1', p_week_start: null, p_texto: 'Consulta médica.' },
      ],
    ]);
  });

  it('justificativa da semana do livre: escopo week, sem aula', async () => {
    const { falso, chamadas } = cliente({ data: 'j-semana', error: null });

    await enviarJustificativa(falso, { escopo: 'week', semana: '2026-09-21', texto: 'Viagem.' });

    expect(chamadas[0]).toEqual([
      'enviar_justificativa',
      { p_scope: 'week', p_class_id: null, p_week_start: '2026-09-21', p_texto: 'Viagem.' },
    ]);
  });

  it('texto vazio não vai ao banco e diz o que fazer', async () => {
    const { falso, chamadas } = cliente({ data: null, error: null });

    await expect(
      enviarJustificativa(falso, { escopo: 'class', classId: 'a', texto: '   ' }),
    ).rejects.toEqual(new ErroDeValidacao('Escreva o motivo da falta.'));
    expect(chamadas).toEqual([]);
  });

  it('texto acima de 255 é recusado antes da rede', async () => {
    const { falso } = cliente({ data: null, error: null });

    await expect(reenviarJustificativa(falso, 'j1', 'a'.repeat(256))).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
  });

  it('a recusa do banco sobe com o código e a frase', async () => {
    const recusa = { code: '23514', message: 'O prazo para justificar esta aula terminou.' };
    const { falso } = cliente({ data: null, error: recusa });

    await expect(
      enviarJustificativa(falso, { escopo: 'class', classId: 'a', texto: 'Motivo.' }),
    ).rejects.toBe(recusa);
  });

  it('reenvio chama reenviar_justificativa com o texto novo', async () => {
    const { falso, chamadas } = cliente({ data: null, error: null });

    await reenviarJustificativa(falso, 'j1', 'Agora com o atestado no papel.');

    expect(chamadas).toEqual([
      ['reenviar_justificativa', { p_id: 'j1', p_texto: 'Agora com o atestado no papel.' }],
    ]);
  });

  it('minhas_justificativas vira a lista da tela', async () => {
    const { falso } = cliente({
      data: [
        {
          id: 'j1',
          scope: 'week',
          class_id: null,
          class_title: null,
          class_date_time: null,
          week_start: '2026-09-21',
          message: 'Viagem.',
          has_attachment: false,
          status: 'rejected',
          attempt: 1,
          approved_by_name: null,
          can_resend: true,
          resend_until: '2026-10-01T02:59:59Z',
        },
      ],
      error: null,
    });

    const [lida] = await buscarMinhasJustificativas(falso);

    expect(lida).toMatchObject({ escopo: 'week', semana: '2026-09-21', podeReenviar: true });
  });
});

describe('rótulos da § 3', () => {
  it('em análise e aprovada por {nome}', () => {
    expect(rotuloDaJustificativa(justificativa())).toBe('Justificativa em análise');
    expect(rotuloDaJustificativa(justificativa({ situacao: 'approved', aprovadaPor: 'Rafael' }))).toBe(
      'Justificativa aprovada por Rafael',
    );
    expect(rotuloDaJustificativa(justificativa({ situacao: 'approved' }))).toBe(
      'Justificativa aprovada',
    );
  });

  it('negada pela 1ª vez, com o prazo do reenvio no fuso da academia', () => {
    expect(
      rotuloDaJustificativa(
        justificativa({
          situacao: 'rejected',
          podeReenviar: true,
          reenviarAte: '2026-10-01T02:59:59Z',
        }),
      ),
    ).toBe('Justificativa negada · você pode reenviar até 30/09');
  });

  it('negada sem prazo de reenvio e negada pela 2ª vez', () => {
    expect(rotuloDaJustificativa(justificativa({ situacao: 'rejected' }))).toBe(
      'Justificativa negada',
    );
    expect(rotuloDaJustificativa(justificativa({ situacao: 'rejected', tentativa: 2 }))).toBe(
      NEGADA_PELA_SEGUNDA_VEZ,
    );
  });

  it('o assunto: a aula com data e hora, ou a semana', () => {
    expect(assuntoDaJustificativa(justificativa())).toBe('Muay Thai — Turma Noite · 23/09 19:00');
    expect(
      assuntoDaJustificativa(justificativa({ escopo: 'week', quandoDaAula: null, tituloDaAula: null })),
    ).toBe('Semana de 21/09');
  });
});
