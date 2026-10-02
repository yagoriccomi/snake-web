import type { Page } from '@playwright/test';

import { banco, criarAula, type AulaSintetica, type Conta } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// 6.14: Desistir da troca (no menu e em Meus pedidos) e as trocas em Meus pedidos.

async function pedirTrocaAvulsa(
  page: Page,
  conta: Conta,
  minha: AulaSintetica,
  nova: AulaSintetica,
): Promise<void> {
  await entrar(page, conta);
  await expect(page).toHaveURL('/inicio');
  await page.goto('/aulas/semana');
  const item = page.getByRole('listitem').filter({ hasText: nova.titulo });
  await item.getByRole('button', { name: 'Trocar para esta' }).click();
  await item.getByRole('radio', { name: new RegExp(minha.titulo) }).check();
  await item.getByRole('button', { name: 'Pedir troca' }).click();
  await expect(item.getByText('Troca pendente', { exact: true })).toBeVisible();
}

async function situacaoDaTroca(userId: string, paraId: string) {
  const { data } = await banco()
    .from('class_swaps')
    .select('status, decided_via')
    .eq('user_id', userId)
    .eq('to_class_id', paraId)
    .single();
  return data;
}

test.describe('Desistir da troca e Meus pedidos (6.14)', () => {
  test('no menu: Desistir da troca pede confirmação e cancela a troca', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const minha = await criarAula(mundo, 60);
    const nova = await criarAula(mundo, 90, { daOutraTurma: true });
    await pedirTrocaAvulsa(page, aluno, minha, nova);

    const item = page.getByRole('listitem').filter({ hasText: nova.titulo });
    await item.getByRole('button', { name: 'Desistir da troca' }).click();
    await expect(item.getByRole('heading', { name: 'Desistir da troca?' })).toBeVisible();
    await expect(
      item.getByText(/Você volta a ter a aula original, e a troca não pode ser retomada\.$/),
    ).toBeVisible();
    await item.getByRole('button', { name: 'Desistir da troca' }).last().click();

    await expect(page.getByRole('status')).toHaveText('Você desistiu da troca.');
    expect(await situacaoDaTroca(aluno.id, nova.id)).toEqual({
      status: 'cancelled',
      decided_via: 'student',
    });
  });

  test('Meus pedidos mostra a troca pendente e deixa desistir dela', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const minha = await criarAula(mundo, 60);
    const nova = await criarAula(mundo, 90, { daOutraTurma: true });
    await pedirTrocaAvulsa(page, aluno, minha, nova);

    await page.getByRole('link', { name: /Meus pedidos/ }).click();
    await expect(page).toHaveURL('/pedidos');
    await expect(page.getByRole('heading', { name: 'Trocas de aula' })).toBeVisible();
    const cartao = page.getByRole('listitem').filter({ hasText: nova.titulo });
    await expect(cartao.getByText(`Sai: ${minha.titulo}`, { exact: false })).toBeVisible();
    await expect(cartao.getByText(`Entra: ${nova.titulo}`, { exact: false })).toBeVisible();
    await expect(cartao.getByText('Troca pendente', { exact: true })).toBeVisible();

    await cartao.getByRole('button', { name: 'Desistir da troca' }).click();
    await cartao.getByRole('button', { name: 'Desistir da troca' }).last().click();

    await expect(page.getByRole('status')).toHaveText('Você desistiu da troca.');
    await expect(cartao.getByText('Você desistiu da troca', { exact: true })).toBeVisible();
    await expect(cartao.getByRole('button', { name: 'Desistir da troca' })).toHaveCount(0);
  });
});
