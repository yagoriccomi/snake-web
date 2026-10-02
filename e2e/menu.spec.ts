import { banco, criarAula } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// 6.12: Aulas da semana (menu_de_aulas), com as ações só pelas colunas.

const UMA_SEMANA_EM_MINUTOS = 7 * 24 * 60;

function diaEmSaoPaulo(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit' }).format(
    data,
  );
}

test.describe('Aulas da semana (6.12)', () => {
  test('fixo marca Vou (extra) numa aula de outra turma, que vira Extra', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const deOutra = await criarAula(mundo, 30, { daOutraTurma: true });

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/aulas');
    await page.getByRole('link', { name: 'Escolher aulas' }).click();

    await expect(page).toHaveURL('/aulas/semana');
    await expect(page.getByRole('tab', { name: 'Esta semana' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const item = page.getByRole('listitem').filter({ hasText: deOutra.titulo });
    await item.getByRole('button', { name: 'Vou (extra)' }).click();

    await expect(page.getByRole('status')).toHaveText('Avisamos que você vem.');
    await expect(item.getByText('Extra', { exact: true })).toBeVisible();
    await expect(item.getByRole('button', { name: 'Desmarcar' })).toBeVisible();
    const presenca = await banco()
      .from('attendance')
      .select('declared_status')
      .eq('class_id', deOutra.id)
      .eq('user_id', aluno.id)
      .single();
    expect(presenca.data?.declared_status).toBe('present');
  });

  test('a próxima semana mostra a aula no dia dela', async ({ page, mundo, novaConta }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const quando = new Date(Date.now() + UMA_SEMANA_EM_MINUTOS * 60_000);
    const daProxima = await criarAula(mundo, UMA_SEMANA_EM_MINUTOS);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/aulas/semana');
    // Troca de aba com a primeira leitura ainda no ar, de propósito: a resposta
    // atrasada de "Esta semana" não pode tomar o lugar da próxima.
    await page.getByRole('tab', { name: 'Próxima semana' }).click();
    await page.getByRole('tab', { name: new RegExp(`^\\S+ ${diaEmSaoPaulo(quando)},`) }).click();

    const item = page.getByRole('listitem').filter({ hasText: daProxima.titulo });
    await expect(item.getByText('Sua aula')).toBeVisible();
    await expect(item.getByRole('button', { name: 'Vou', exact: true })).toBeVisible();
  });
});
