import { banco, criarAula } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// 6.7: "Eu estava na aula" numa aula que já teve chamada, e Meus pedidos.

const DOIS_DIAS_ATRAS_EM_MINUTOS = -2 * 24 * 60;

test.describe('Eu estava na aula (6.7)', () => {
  test('o pedido sai de Para conferir e aparece em Meus pedidos, em análise', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, DOIS_DIAS_ATRAS_EM_MINUTOS, { chamadaFeita: true });

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/aulas');
    await expect(page.getByRole('heading', { name: 'Para conferir' })).toBeVisible();
    const item = page.getByRole('listitem').filter({ hasText: aula.titulo });
    await item.getByRole('button', { name: 'Eu estava na aula' }).click();
    await expect(item.getByText(/Se o professor aprovar, a sua presença entra na chamada\.$/)).toBeVisible();
    await item.getByLabel('O que aconteceu').fill('Fiz a aula inteira; a chamada saiu sem mim.');
    await item.getByRole('button', { name: 'Enviar pedido' }).click();

    await expect(page.getByRole('status')).toHaveText(
      'Pedido enviado. Acompanhe a resposta em Meus pedidos.',
    );
    await expect(page.getByText(aula.titulo)).toHaveCount(0);
    const pedido = await banco()
      .from('roll_call_requests')
      .select('kind, status')
      .eq('class_id', aula.id)
      .eq('subject_id', aluno.id)
      .single();
    expect(pedido.data).toEqual({ kind: 'student_was_present', status: 'pending' });

    await page.getByRole('link', { name: /Meus pedidos/ }).click();
    await expect(page).toHaveURL('/pedidos');
    const cartao = page.getByRole('listitem').filter({ hasText: aula.titulo });
    await expect(cartao.getByText('Pedido em análise', { exact: true })).toBeVisible();
  });

  test('sem chamada concluída, a aula não entra em Para conferir', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, DOIS_DIAS_ATRAS_EM_MINUTOS);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/aulas');
    await expect(page.getByRole('heading', { name: 'Aulas' })).toBeVisible();

    await expect(page.getByText(aula.titulo)).toHaveCount(0);
  });
});
