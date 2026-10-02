import { banco, criarAula } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// 6.5: a meta do à vontade, com Mudar e a folha "Meta da próxima semana".

test.describe('Meta do à vontade (6.5)', () => {
  test('Mudar grava a meta da próxima semana, e a desta continua', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true, aVontade: true });
    await criarAula(mundo, 30);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    const titulo = page.getByText(/^Meta: \d+x por semana$/);
    await expect(titulo).toBeVisible();
    const metaDestaSemana = Number((await titulo.innerText()).match(/\d+/)?.[0]);

    await page.getByRole('button', { name: 'Mudar' }).click();
    await expect(page.getByRole('heading', { name: 'Meta da próxima semana' })).toBeVisible();
    const aumentar = page.getByRole('button', { name: 'Aumentar a meta' });
    const novaMeta = (await aumentar.isEnabled()) ? metaDestaSemana + 1 : metaDestaSemana - 1;
    await page
      .getByRole('button', { name: novaMeta > metaDestaSemana ? 'Aumentar a meta' : 'Diminuir a meta' })
      .click();
    await page.getByRole('button', { name: 'Salvar meta' }).click();

    await expect(page.getByRole('status')).toHaveText(
      new RegExp(
        String.raw`^Vale a partir de seg \d{2}/\d{2}\. A meta desta semana continua ${metaDestaSemana}x\.$`,
      ),
    );
    await expect(titulo).toHaveText(`Meta: ${metaDestaSemana}x por semana`);
    const gravada = await banco().from('weekly_goals').select('goal').eq('user_id', aluno.id).single();
    expect(gravada.data?.goal).toBe(novaMeta);
  });

  test('livre não vê o Mudar', async ({ page, mundo, novaConta }) => {
    const aluno = await novaConta({ termosAceitos: true, livre: true });
    await criarAula(mundo, 30);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await expect(page.getByText('Esta semana', { exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Mudar' })).toHaveCount(0);
  });
});
