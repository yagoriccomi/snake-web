import type { Page } from '@playwright/test';

import { banco, criarAula, marcarExtra, type Conta } from './apoio/banco';
import { avisoDaTela, entrar, expect, test } from './apoio/teste';

// 6.2: declarar pela declarar_aula, com as ações da tabela da § 12.2.

async function abrirAulas(page: Page, conta: Conta): Promise<void> {
  await entrar(page, conta);
  await expect(page).toHaveURL('/inicio');
  await page.goto('/aulas');
}

async function declarada(userId: string, classId: string): Promise<string | null> {
  const { data } = await banco()
    .from('attendance')
    .select('declared_status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .maybeSingle();
  return data === null ? null : (data.declared_status as string | null);
}

test.describe('Declarar (6.2)', () => {
  test('livre: Vou vira Marcada com Desmarcar, e Desmarcar limpa', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true, livre: true });
    const aula = await criarAula(mundo, 30);

    await abrirAulas(page, aluno);
    const item = page.getByRole('listitem').filter({ hasText: aula.titulo });
    await item.getByRole('button', { name: 'Vou', exact: true }).click();

    await expect(item.getByText('Marcada')).toBeVisible();
    expect(await declarada(aluno.id, aula.id)).toBe('present');

    await item.getByRole('button', { name: 'Desmarcar' }).click();
    await expect(page.getByRole('status')).toHaveText('Marcação desfeita.');
    await expect(item.getByRole('button', { name: 'Vou', exact: true })).toBeVisible();
    expect(await declarada(aluno.id, aula.id)).toBeNull();
  });

  test('livre acima da cota: o aviso não bloqueia, e Desfazer desmarca', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true, livre: true });
    const primeira = await criarAula(mundo, 30);
    const segunda = await criarAula(mundo, 40);

    await abrirAulas(page, aluno);
    await page
      .getByRole('listitem')
      .filter({ hasText: primeira.titulo })
      .getByRole('button', { name: 'Vou', exact: true })
      .click();
    await expect(page.getByRole('status')).toHaveText('Avisamos que você vem.');
    await page
      .getByRole('listitem')
      .filter({ hasText: segunda.titulo })
      .getByRole('button', { name: 'Vou', exact: true })
      .click();

    const aviso = page.getByRole('status');
    await expect(aviso).toContainText('Marcada, acima do plano');
    await expect(aviso).toContainText(
      'Você marcou 2 aulas nesta semana e seu plano é 1x. Pode ir: fica registrado acima do plano.',
    );
    expect(await declarada(aluno.id, segunda.id)).toBe('present');

    await aviso.getByRole('button', { name: 'Desfazer' }).click();
    await expect(page.getByRole('status')).toHaveText('Marcação desfeita.');
    expect(await declarada(aluno.id, segunda.id)).toBeNull();
    expect(await declarada(aluno.id, primeira.id)).toBe('present');
  });

  test('a recusa do banco aparece com a frase dele (duas aulas no mesmo horário)', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true, livre: true });
    const quando = new Date(Date.now() + 50 * 60_000);
    quando.setSeconds(0, 0);
    const uma = await criarAula(mundo, 0, { quando });
    const outra = await criarAula(mundo, 0, { quando });

    await abrirAulas(page, aluno);
    await page
      .getByRole('listitem')
      .filter({ hasText: uma.titulo })
      .getByRole('button', { name: 'Vou', exact: true })
      .click();
    await expect(page.getByRole('status')).toHaveText('Avisamos que você vem.');
    await page
      .getByRole('listitem')
      .filter({ hasText: outra.titulo })
      .getByRole('button', { name: 'Vou', exact: true })
      .click();

    await expect(avisoDaTela(page)).toHaveText('Você já marcou outra aula neste horário.');
    expect(await declarada(aluno.id, outra.id)).toBeNull();
  });

  test('fixo: a extra marcada aparece como Extra, e Desmarcar volta ao Vou (extra)', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const deOutraTurma = await criarAula(mundo, 30, { daOutraTurma: true });
    await marcarExtra(aluno.id, deOutraTurma.id);

    await abrirAulas(page, aluno);
    const item = page.getByRole('listitem').filter({ hasText: deOutraTurma.titulo });
    await expect(item.getByText('Extra', { exact: true })).toBeVisible();
    await item.getByRole('button', { name: 'Desmarcar' }).click();

    await expect(page.getByRole('status')).toHaveText('Marcação desfeita.');
    // A linha continua (aulas_do_aluno traz "as aulas em que já tem linha"), sem a marca.
    await expect(item.getByText('Extra', { exact: true })).toHaveCount(0);
    await expect(item.getByRole('button', { name: 'Vou (extra)' })).toBeVisible();
    expect(await declarada(aluno.id, deOutraTurma.id)).toBeNull();
  });

  test('aula que já começou não tem botão', async ({ page, mundo, novaConta }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const comecou = await criarAula(mundo, -5);

    await abrirAulas(page, aluno);
    const item = page.getByRole('listitem').filter({ hasText: comecou.titulo });

    await expect(item.getByText('Sua aula')).toBeVisible();
    await expect(item.getByRole('button')).toHaveCount(0);
  });
});
