import { entrar, expect, test } from './apoio/teste';

// Roteiro 1.5 da Fase 1: só aluno entra.
test.describe('Barreiras', () => {
  test('professor que entra tem a sessão encerrada, com a explicação', async ({ page, novaConta }) => {
    const professor = await novaConta({ papel: 'professor' });

    await entrar(page, professor);

    await expect(page.getByRole('heading', { name: 'Esta página é só para alunos' })).toBeVisible();
    await page.goto('/aulas');
    await expect(page).toHaveURL('/');
  });

  test('sem sessão, uma página logada volta para o login', async ({ page }) => {
    await page.goto('/aulas');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});
