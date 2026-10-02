import { entrar, expect, test } from './apoio/teste';

// 6.3: frequência pelas RPCs do contrato. Os números são do banco (testados lá);
// aqui se confere que a tela os mostra e que a régua de 70% copiada saiu.

const MESES = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

function nomeDoMes(data: Date): string {
  const nome = MESES.format(data);
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
}

test.describe('Frequência (6.3)', () => {
  test('a inicial mostra Semana e Mês, sem a régua de 70%, e leva às semanas do mês', async ({
    page,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    const cartao = page.getByRole('link', { name: /Ver as semanas do mês/ });
    await expect(cartao).toContainText('Semana');
    await expect(cartao).toContainText('Mês');
    await expect(page.getByText(/Abaixo de 70%/)).toHaveCount(0);

    await cartao.click();

    await expect(page).toHaveURL('/frequencia');
    await expect(page.getByRole('heading', { name: 'Frequência' })).toBeVisible();
    const hoje = new Date();
    await expect(page.getByText(nomeDoMes(hoje), { exact: true })).toBeVisible();
    await expect(page.getByRole('table')).toContainText('S1');
    await expect(page.getByText('Horário fixo', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
  });

  test('o mês anterior abre com o nome dele', async ({ page, novaConta }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const hoje = new Date();
    const anterior = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 15, 15));

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/frequencia');
    await page.getByRole('button', { name: 'Mês anterior' }).click();

    await expect(page.getByText(nomeDoMes(anterior), { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeEnabled();
  });
});
