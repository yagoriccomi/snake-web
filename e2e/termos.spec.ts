import { banco } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// Roteiro 1.1 da Fase 1: aceite dos documentos.
test.describe('/termos', () => {
  test('aluno com documento pendente lê, aceita, e o aceite fica gravado', async ({
    page,
    novaConta,
  }) => {
    const aluno = await novaConta();
    const vigentes = await banco().from('legal_documents').select('id').eq('is_current', true);

    await entrar(page, aluno);

    await expect(page).toHaveURL('/termos');
    await expect(page.getByRole('heading', { name: 'Antes de continuar' })).toBeVisible();
    const textos = page.getByRole('region');
    await expect(textos).toHaveCount(vigentes.data?.length ?? 0);
    for (const texto of await textos.all()) {
      // A rolagem própria de cada texto chega ao fim.
      const noFim = await texto.evaluate((caixa) => {
        caixa.scrollTop = caixa.scrollHeight;
        return Math.ceil(caixa.scrollTop + caixa.clientHeight) >= caixa.scrollHeight;
      });
      expect(noFim).toBe(true);
    }

    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Aceitar e continuar' }).click();

    await expect(page).toHaveURL('/inicio');
    const aceites = await banco().from('consents').select('document_id').eq('user_id', aluno.id);
    expect(aceites.data?.map((a) => a.document_id).sort()).toEqual(
      vigentes.data?.map((d) => d.id).sort(),
    );

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL('/');
    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
  });

  test('"Sair sem aceitar" encerra a sessão', async ({ page, novaConta }) => {
    const aluno = await novaConta();

    await entrar(page, aluno);
    await expect(page).toHaveURL('/termos');
    await page.getByRole('button', { name: 'Sair sem aceitar' }).click();

    await expect(page).toHaveURL('/');
    await page.goto('/inicio');
    await expect(page).toHaveURL('/');
  });
});
