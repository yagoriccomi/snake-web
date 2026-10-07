import { entrar, expect, test } from './apoio/teste';

// D35: o olho mostra e oculta a senha, sem enviar o formulário.
test.describe('mostrar e ocultar a senha', () => {
  test('no login, o olho alterna a senha e o nome do botão, e não entra', async ({ page }) => {
    await page.goto('/');
    const senha = page.getByLabel('Senha', { exact: true });
    await senha.fill('senha-de-teste');

    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(senha).toHaveAttribute('type', 'text');
    await expect(senha).toHaveAttribute('autocomplete', 'current-password');
    await expect(page.getByRole('button', { name: 'Ocultar senha' })).toBeFocused();

    await page.getByRole('button', { name: 'Ocultar senha' }).click();
    await expect(senha).toHaveAttribute('type', 'password');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  });

  test('no primeiro acesso, cada campo tem o seu olho', async ({ page, novaConta }) => {
    const aluno = await novaConta({ primeiroAcesso: true, termosAceitos: true });
    await entrar(page, aluno);
    await expect(page).toHaveURL('/primeiro-acesso');

    const nova = page.getByLabel('Nova senha');
    const repita = page.getByLabel('Repita a senha');
    const olhos = page.getByRole('button', { name: 'Mostrar senha' });
    await expect(olhos).toHaveCount(2);

    await olhos.first().click();
    await expect(nova).toHaveAttribute('type', 'text');
    await expect(repita).toHaveAttribute('type', 'password');
    await expect(nova).toHaveAttribute('autocomplete', 'new-password');
    await expect(page).toHaveURL('/primeiro-acesso');
  });
});
