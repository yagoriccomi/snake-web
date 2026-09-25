import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { verificarAcesso, type Etapa } from '@/lib/guarda';

type Perfil = { name: string | null; role: string; is_first_login: boolean };

type Cenario = {
  logado?: boolean;
  perfil?: Perfil | null;
  erroNoPerfil?: boolean;
  pendentes?: unknown[];
  erroNosDocumentos?: boolean;
};

const ALUNO: Perfil = { name: 'Aluno Sintético', role: 'user', is_first_login: false };
const USER_ID = '00000000-0000-4000-8000-000000000002';

/** Supabase de mentira: sessão, perfil e documentos pendentes configuráveis. */
function clienteFalso(cenario: Cenario = {}) {
  const chamadas: string[] = [];
  const cliente = {
    auth: {
      getSession: async () => ({
        data: { session: cenario.logado === false ? null : { user: { id: USER_ID } } },
      }),
      signOut: async () => {
        chamadas.push('signOut');
        return { error: null };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: cenario.erroNoPerfil === true ? null : (cenario.perfil ?? ALUNO),
            error: cenario.erroNoPerfil === true ? { message: 'rede' } : null,
          }),
        }),
      }),
    }),
    rpc: async (nome: string) => {
      chamadas.push(nome);
      return cenario.erroNosDocumentos === true
        ? { data: null, error: { message: 'rede' } }
        : { data: cenario.pendentes ?? [], error: null };
    },
  };
  return { cliente: cliente as unknown as SupabaseClient, chamadas };
}

const ETAPAS: Etapa[] = ['primeiro-acesso', 'termos', 'aluno'];

describe('verificarAcesso', () => {
  it.each(ETAPAS)('manda para o login quando não há sessão (%s)', async (etapa) => {
    const { cliente } = clienteFalso({ logado: false });
    expect(await verificarAcesso(cliente, etapa)).toEqual({ situacao: 'redirecionar', para: '/' });
  });

  it.each(ETAPAS)('barra e encerra a sessão de quem não é aluno (%s)', async (etapa) => {
    const { cliente, chamadas } = clienteFalso({ perfil: { ...ALUNO, role: 'admin' } });
    expect(await verificarAcesso(cliente, etapa)).toEqual({ situacao: 'nao-e-aluno' });
    expect(chamadas).toContain('signOut');
  });

  it.each(ETAPAS)('mostra erro, sem liberar, quando o perfil não carrega (%s)', async (etapa) => {
    const { cliente } = clienteFalso({ erroNoPerfil: true });
    expect(await verificarAcesso(cliente, etapa)).toEqual({ situacao: 'erro' });
  });

  it('libera /primeiro-acesso para quem ainda não concluiu', async () => {
    const { cliente } = clienteFalso({ perfil: { ...ALUNO, is_first_login: true } });
    expect(await verificarAcesso(cliente, 'primeiro-acesso')).toMatchObject({
      situacao: 'liberado',
    });
  });

  it.each(['termos', 'aluno'] as Etapa[])(
    'manda para o primeiro acesso antes de tudo (%s)',
    async (etapa) => {
      const { cliente, chamadas } = clienteFalso({
        perfil: { ...ALUNO, is_first_login: true },
        pendentes: [{ id: 'politica' }],
      });
      expect(await verificarAcesso(cliente, etapa)).toEqual({
        situacao: 'redirecionar',
        para: '/primeiro-acesso',
      });
      expect(chamadas).not.toContain('documentos_legais_pendentes');
    },
  );

  it('libera /termos mesmo com documento pendente', async () => {
    const { cliente } = clienteFalso({ pendentes: [{ id: 'politica' }] });
    expect(await verificarAcesso(cliente, 'termos')).toMatchObject({ situacao: 'liberado' });
  });

  it('manda para os termos quando há documento pendente', async () => {
    const { cliente } = clienteFalso({ pendentes: [{ id: 'politica' }] });
    expect(await verificarAcesso(cliente, 'aluno')).toEqual({
      situacao: 'redirecionar',
      para: '/termos',
    });
  });

  it('mostra erro, sem liberar, quando os documentos não carregam', async () => {
    const { cliente } = clienteFalso({ erroNosDocumentos: true });
    expect(await verificarAcesso(cliente, 'aluno')).toEqual({ situacao: 'erro' });
  });

  it('libera o aluno em dia, com o id e o nome', async () => {
    const { cliente } = clienteFalso();
    expect(await verificarAcesso(cliente, 'aluno')).toEqual({
      situacao: 'liberado',
      usuario: { id: USER_ID, nome: 'Aluno Sintético' },
    });
  });
});
