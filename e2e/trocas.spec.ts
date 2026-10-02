import type { Page } from '@playwright/test';

import { banco, criarAula, type Conta } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// 6.13: folha "Trocar aula", avulsa e permanente (sem anexos até o G2).

async function abrirMenu(page: Page, conta: Conta): Promise<void> {
  await entrar(page, conta);
  await expect(page).toHaveURL('/inicio');
  await page.goto('/aulas/semana');
}

async function trocaGravada(userId: string, paraId: string) {
  const { data } = await banco()
    .from('class_swaps')
    .select('kind, status, from_class_id, motivo_id')
    .eq('user_id', userId)
    .eq('to_class_id', paraId)
    .single();
  return data;
}

test.describe('Trocar aula (6.13)', () => {
  test('só nesta semana: a aula de outra turma vira Troca pendente', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const minha = await criarAula(mundo, 60);
    const nova = await criarAula(mundo, 90, { daOutraTurma: true });

    await abrirMenu(page, aluno);
    const item = page.getByRole('listitem').filter({ hasText: nova.titulo });
    await item.getByRole('button', { name: 'Trocar para esta' }).click();

    await expect(item.getByRole('heading', { name: 'Trocar aula' })).toBeVisible();
    await expect(item.getByText('Qual aula sua você quer trocar por esta?')).toBeVisible();
    // Aulas de outros testes da mesma turma também podem sair: escolhe a dele pelo nome.
    await item.getByRole('radio', { name: new RegExp(minha.titulo) }).check();
    await item.getByRole('button', { name: 'Pedir troca' }).click();

    await expect(page.getByRole('status')).toHaveText(
      'Pedido de troca enviado. A aula nova fica como Troca pendente até a decisão.',
    );
    await expect(item.getByText('Troca pendente', { exact: true })).toBeVisible();
    expect(await trocaGravada(aluno.id, nova.id)).toEqual({
      kind: 'once',
      status: 'pending',
      from_class_id: minha.id,
      motivo_id: null,
    });
  });

  test('permanente: pede a justificativa, e o pedido leva o motivo', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const minha = await criarAula(mundo, 60, { recorrente: true });
    const nova = await criarAula(mundo, 90, { daOutraTurma: true, recorrente: true });

    await abrirMenu(page, aluno);
    const item = page.getByRole('listitem').filter({ hasText: nova.titulo });
    await item.getByRole('button', { name: 'Trocar para esta' }).click();
    await item.getByRole('radio', { name: 'Permanente' }).check();
    await item.getByRole('radio', { name: new RegExp(minha.titulo) }).check();

    const pedir = item.getByRole('button', { name: 'Pedir troca' });
    await expect(pedir).toBeDisabled();
    await expect(
      item.getByText('A troca permanente muda a sua grade a partir da próxima aula depois da aprovação.'),
    ).toBeVisible();
    await item
      .getByLabel('Por que você precisa mudar de horário? (obrigatório)')
      .fill('Mudei de turno no trabalho.');
    await pedir.click();

    await expect(page.getByRole('status')).toHaveText(
      'Pedido de troca enviado. A aula nova fica como Troca pendente até a decisão.',
    );
    const troca = await trocaGravada(aluno.id, nova.id);
    expect(troca).toMatchObject({ kind: 'permanent', status: 'pending', from_class_id: minha.id });
    expect(troca?.motivo_id).not.toBeNull();
  });
});
