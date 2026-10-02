import { criarAula, marcarVou } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// 6.4: "Esta semana" na inicial, só para o livre e o à vontade.

test.describe('Esta semana (6.4)', () => {
  test('livre vê a cota com feitas e marcadas', async ({ page, mundo, novaConta }) => {
    const aluno = await novaConta({ termosAceitos: true, livre: true });
    const aula = await criarAula(mundo, 30);
    await marcarVou(aluno.id, aula.id);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');

    await expect(page.getByText('Esta semana', { exact: true })).toBeVisible();
    await expect(page.getByText('cota 1x', { exact: true })).toBeVisible();
    await expect(page.getByText('0 feitas · 1 marcada', { exact: true })).toBeVisible();
  });

  test('fixo não tem o cartão', async ({ page, mundo, novaConta }) => {
    const aluno = await novaConta({ termosAceitos: true });
    await criarAula(mundo, 30);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await expect(page.getByRole('link', { name: /Ver as semanas do mês/ })).toBeVisible();

    await expect(page.getByText('Esta semana', { exact: true })).toHaveCount(0);
  });
});
