import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { concluirPrimeiroAcesso, type DadosDoPrimeiroAcesso } from '@/lib/primeiroAcesso';

type Erro = { message: string; code?: string } | null;

type Respostas = {
  perfil?: Erro;
  senha?: Erro;
  conclusao?: Erro;
};

/**
 * Supabase de mentira: registra, em ordem, cada gravação em `profiles` e cada
 * troca de senha, e devolve o erro configurado para cada passo.
 */
function clienteFalso(respostas: Respostas = {}) {
  const chamadas: string[] = [];
  const gravacoes: Record<string, unknown>[] = [];
  const cliente = {
    from: (tabela: string) => ({
      update: (valores: Record<string, unknown>) => ({
        eq: async () => {
          gravacoes.push(valores);
          const ehConclusao = 'is_first_login' in valores;
          chamadas.push(`${tabela}:${ehConclusao ? 'conclusao' : 'perfil'}`);
          return { error: (ehConclusao ? respostas.conclusao : respostas.perfil) ?? null };
        },
      }),
    }),
    auth: {
      updateUser: async () => {
        chamadas.push('senha');
        return { data: {}, error: respostas.senha ?? null };
      },
    },
  };
  return { cliente: cliente as unknown as SupabaseClient, chamadas, gravacoes };
}

const DADOS: DadosDoPrimeiroAcesso = {
  userId: '00000000-0000-4000-8000-000000000001',
  nome: 'Aluno Sintético',
  cpf: '52998224725',
  celular: '11987654321',
  nascimentoIso: '1990-01-31',
  senha: 'Senha-Forte-123',
};

describe('concluirPrimeiroAcesso', () => {
  it('grava os dados, troca a senha e só então marca a conclusão', async () => {
    const { cliente, chamadas } = clienteFalso();

    await concluirPrimeiroAcesso(cliente, DADOS);

    expect(chamadas).toEqual(['profiles:perfil', 'senha', 'profiles:conclusao']);
  });

  it('nunca grava is_first_login junto com os dados', async () => {
    const { cliente, gravacoes } = clienteFalso();

    await concluirPrimeiroAcesso(cliente, DADOS);

    expect(gravacoes[0]).not.toHaveProperty('is_first_login');
    expect(gravacoes[1]).toEqual({ is_first_login: false });
  });

  it('mantém o primeiro acesso pendente quando a troca de senha falha', async () => {
    const { cliente, chamadas } = clienteFalso({
      senha: { message: 'Password should be stronger', code: 'weak_password' },
    });

    await expect(concluirPrimeiroAcesso(cliente, DADOS)).rejects.toMatchObject({
      code: 'weak_password',
    });
    expect(chamadas).not.toContain('profiles:conclusao');
  });

  it('não troca a senha quando a gravação dos dados falha', async () => {
    const { cliente, chamadas } = clienteFalso({ perfil: { message: 'rede' } });

    await expect(concluirPrimeiroAcesso(cliente, DADOS)).rejects.toMatchObject({
      message: 'rede',
    });
    expect(chamadas).toEqual(['profiles:perfil']);
  });

  it('conclui na segunda tentativa quando a senha já tinha sido trocada', async () => {
    const { cliente, chamadas } = clienteFalso({
      senha: { message: 'New password should be different', code: 'same_password' },
    });

    await concluirPrimeiroAcesso(cliente, DADOS);

    expect(chamadas).toEqual(['profiles:perfil', 'senha', 'profiles:conclusao']);
  });

  it('lança o erro quando a marcação da conclusão falha', async () => {
    const { cliente } = clienteFalso({ conclusao: { message: 'rede' } });

    await expect(concluirPrimeiroAcesso(cliente, DADOS)).rejects.toMatchObject({
      message: 'rede',
    });
  });
});
