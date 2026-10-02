import { createClient } from '@supabase/supabase-js';

import { lerAmbientePublico } from './apoio/ambiente';
import { entrar, expect, test } from './apoio/teste';
import type { Conta } from './apoio/banco';

// 5.1 e 6.15: cabeçalho Início · Aulas · Sair e "Falar com a academia".
// O contato é configuração da academia inteira: o teste não o muda. Lê o que
// o banco local tem, pela mesma RPC que a página usa, e confere de acordo.

async function contatoDoBanco(conta: Conta): Promise<{ whatsapp: unknown; email: unknown }> {
  const { url, anonKey } = lerAmbientePublico();
  const cliente = createClient(url, anonKey, { auth: { persistSession: false } });
  await cliente.auth.signInWithPassword({ email: conta.email, password: conta.senha });
  const { data } = await cliente.rpc('contato_da_academia');
  return (data ?? {}) as { whatsapp: unknown; email: unknown };
}

test.describe('Cabeçalho e contato da academia (5.1 e 6.15)', () => {
  test('o cabeçalho marca a seção atual e leva a Aulas', async ({ page, novaConta }) => {
    const aluno = await novaConta({ termosAceitos: true });

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    const navegacao = page.getByRole('navigation', { name: 'Principal' });
    await expect(navegacao.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');

    await navegacao.getByRole('link', { name: 'Aulas' }).click();

    await expect(page).toHaveURL('/aulas');
    await expect(navegacao.getByRole('link', { name: 'Aulas' })).toHaveAttribute('aria-current', 'page');
    await expect(navegacao.getByRole('button', { name: 'Sair' })).toBeVisible();
  });

  test('"Falar com a academia" mostra o contato, ou o aviso de que não há', async ({
    page,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const contato = await contatoDoBanco(aluno);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.getByRole('button', { name: 'Falar com a academia' }).click();

    const rodape = page.getByRole('contentinfo');
    if (contato.whatsapp === null && contato.email === null) {
      await expect(
        rodape.getByText('A academia ainda não cadastrou um contato. Procure a recepção.'),
      ).toBeVisible();
    } else {
      await expect(rodape.getByRole('link', { name: /WhatsApp|E-mail/ }).first()).toBeVisible();
    }
  });

  test('a tela de login não mostra o contato', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByText('Falar com a academia')).toHaveCount(0);
  });
});
