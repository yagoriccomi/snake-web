import { criarAula, registrarChamada } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// 6.8: histórico de aulas do aluno em /frequencia, com a marca Editada e sem
// quem editou (D20).

const DUAS_HORAS_ATRAS_EM_MINUTOS = -120;

function mesEmSaoPaulo(data: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(data);
}

test.describe('Histórico de aulas (6.8)', () => {
  test('mostra Presente, Falta e a marca Editada no mês da aula', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const presente = await criarAula(mundo, DUAS_HORAS_ATRAS_EM_MINUTOS, { chamadaFeita: true });
    const falta = await criarAula(mundo, DUAS_HORAS_ATRAS_EM_MINUTOS - 10, { chamadaFeita: true });
    await registrarChamada(aluno.id, presente.id, 'present');
    await registrarChamada(aluno.id, falta.id, 'absent', true);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/frequencia');
    // Logo depois da meia-noite do dia 1, duas horas atrás ainda é o mês anterior.
    const quando = new Date(Date.now() + DUAS_HORAS_ATRAS_EM_MINUTOS * 60_000);
    if (mesEmSaoPaulo(quando) !== mesEmSaoPaulo(new Date())) {
      await page.getByRole('button', { name: 'Mês anterior' }).click();
    }

    await expect(page.getByRole('heading', { name: 'Histórico de aulas' })).toBeVisible();
    const linhaPresente = page.getByRole('listitem').filter({ hasText: presente.titulo });
    await expect(linhaPresente.getByText('Presente', { exact: true })).toBeVisible();
    const linhaFalta = page.getByRole('listitem').filter({ hasText: falta.titulo });
    await expect(linhaFalta.getByText('Falta', { exact: true })).toBeVisible();
    await expect(linhaFalta.getByText('Editada', { exact: true })).toBeVisible();
  });
});
