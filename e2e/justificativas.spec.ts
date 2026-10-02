import type { Page } from '@playwright/test';

import { banco, criarAula, negarJustificativa, type Conta } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// 6.6: justificativa pelas RPCs novas, Minhas justificativas e o reenvio (D42).

const MOTIVO = 'Consulta médica no horário da aula.';

async function justificarPeloNaoVou(page: Page, conta: Conta, titulo: string): Promise<void> {
  await entrar(page, conta);
  await expect(page).toHaveURL('/inicio');
  await page.goto('/aulas');
  const item = page.getByRole('listitem').filter({ hasText: titulo });
  await item.getByRole('button', { name: 'Não vou' }).click();
  await item.getByLabel('Motivo da falta').fill(MOTIVO);
  await item.getByRole('button', { name: 'Enviar justificativa' }).click();
  await expect(page.getByRole('status')).toHaveText('Justificativa enviada. A academia vai analisar.');
}

test.describe('Justificativas (6.6)', () => {
  test('a justificativa da aula aparece em Minhas justificativas, em análise', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, 30);

    await justificarPeloNaoVou(page, aluno, aula.titulo);
    await page.getByRole('link', { name: /Minhas justificativas/ }).click();

    await expect(page).toHaveURL('/justificativas');
    const cartao = page.getByRole('listitem').filter({ hasText: aula.titulo });
    await expect(cartao.getByText(MOTIVO)).toBeVisible();
    await expect(cartao.getByText('Justificativa em análise', { exact: true })).toBeVisible();
    const gravada = await banco()
      .from('absence_justifications')
      .select('scope, status, attempt')
      .eq('user_id', aluno.id)
      .eq('class_id', aula.id)
      .single();
    expect(gravada.data).toEqual({ scope: 'class', status: 'pending', attempt: 1 });
  });

  test('negada pela 1ª vez reenvia; negada pela 2ª, só resta procurar a academia', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, 30);
    await justificarPeloNaoVou(page, aluno, aula.titulo);
    await negarJustificativa(aluno.id, aula.id);

    await page.goto('/justificativas');
    const cartao = page.getByRole('listitem').filter({ hasText: aula.titulo });
    await expect(cartao.getByText(/^Justificativa negada · você pode reenviar até \d{2}\/\d{2}$/)).toBeVisible();
    await cartao.getByRole('button', { name: /^Reenviar até \d{2}\/\d{2}$/ }).click();
    await expect(cartao.getByText(/é a última tentativa\.$/)).toBeVisible();
    await cartao.getByLabel('Motivo da falta').fill('Segue o motivo com mais detalhe.');
    await cartao.getByRole('button', { name: 'Reenviar', exact: true }).click();

    await expect(page.getByRole('status')).toHaveText('Justificativa reenviada. A academia vai analisar.');
    await expect(cartao.getByText('Justificativa em análise', { exact: true })).toBeVisible();

    await negarJustificativa(aluno.id, aula.id);
    await page.reload();
    await expect(
      cartao.getByText(
        'Justificativa negada. Para mais informações, procure o professor da aula ou a administração da academia.',
      ),
    ).toBeVisible();
    await expect(cartao.getByRole('button', { name: /Reenviar/ })).toHaveCount(0);
  });
});
