import { banco, criarAula } from './apoio/banco';
import { entrar, expect, test } from './apoio/teste';

// Roteiro 1.4 da Fase 1 e, desde o 6.1, a lista de aulas_do_aluno. O professor
// vendo o aviso no app DEV continua no roteiro manual.

const LIMITE_DA_JUSTIFICATIVA = 255;
const MINUTOS_ATE_A_AULA = 30;

test.describe('/aulas', () => {
  test('mostra só as aulas do aluno, com o selo Sua aula, e nunca as de outra turma', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const daTurma = await criarAula(mundo, MINUTOS_ATE_A_AULA);
    const deOutra = await criarAula(mundo, MINUTOS_ATE_A_AULA, { daOutraTurma: true });

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/aulas');

    const item = page.getByRole('listitem').filter({ hasText: daTurma.titulo });
    await expect(item.getByText('Sua aula')).toBeVisible();
    await expect(page.getByText(deOutra.titulo)).toHaveCount(0);
  });

  test('aula cancelada aparece riscada, com o selo Cancelada e sem botões', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const cancelada = await criarAula(mundo, MINUTOS_ATE_A_AULA, { cancelada: true });

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/aulas');

    const item = page.getByRole('listitem').filter({ hasText: cancelada.titulo });
    await expect(item.getByText('Cancelada')).toBeVisible();
    await expect(item.getByText(cancelada.titulo)).toHaveCSS('text-decoration-line', 'line-through');
    await expect(item.getByRole('button')).toHaveCount(0);
  });

  test('Vou grava a intenção em declared_status, nunca em status', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, MINUTOS_ATE_A_AULA);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/aulas');
    const item = page.getByRole('listitem').filter({ hasText: aula.titulo });
    await item.getByRole('button', { name: 'Vou', exact: true }).click();

    await expect(page.getByRole('status')).toHaveText('Avisamos que você vem.');
    const presenca = await banco()
      .from('attendance')
      .select('declared_status, status')
      .eq('class_id', aula.id)
      .eq('user_id', aluno.id)
      .single();
    expect(presenca.data).toEqual({ declared_status: 'present', status: null });
  });

  test('Não vou abre a justificativa: vazio não envia, o limite é 255 e o texto válido grava', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, MINUTOS_ATE_A_AULA);
    const motivo = 'Consulta médica no horário da aula.';

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto('/aulas');
    const item = page.getByRole('listitem').filter({ hasText: aula.titulo });
    await item.getByRole('button', { name: 'Não vou' }).click();

    await expect(page.getByRole('status')).toHaveText('Avisamos que você não vem.');
    const campo = item.getByLabel('Motivo da falta (opcional)');
    const enviar = item.getByRole('button', { name: 'Enviar justificativa' });
    await expect(enviar).toBeDisabled();
    await campo.fill('   ');
    await expect(enviar).toBeDisabled();
    await campo.fill('a'.repeat(LIMITE_DA_JUSTIFICATIVA + 45));
    await expect(campo).toHaveValue('a'.repeat(LIMITE_DA_JUSTIFICATIVA));

    await campo.fill(motivo);
    await enviar.click();

    await expect(page.getByRole('status')).toHaveText(
      'Justificativa enviada. A academia vai analisar.',
    );
    await expect(item.getByText('Em análise')).toBeVisible();
    const justificativa = await banco()
      .from('absence_justifications')
      .select('message, status')
      .eq('class_id', aula.id)
      .eq('user_id', aluno.id)
      .single();
    expect(justificativa.data).toEqual({ message: motivo, status: 'pending' });
    const presenca = await banco()
      .from('attendance')
      .select('declared_status')
      .eq('class_id', aula.id)
      .eq('user_id', aluno.id)
      .single();
    expect(presenca.data?.declared_status).toBe('absent');
  });
});
