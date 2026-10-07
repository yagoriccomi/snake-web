import type { Locator, Page } from '@playwright/test';

import { banco, criarAula, type AulaSintetica, type Conta } from './apoio/banco';
import { pdf, recado, simularEnvio } from './apoio/envio';
import { entrar, expect, test } from './apoio/teste';

// 6.13: folha "Trocar aula", avulsa e permanente, esta com até 5 anexos
// (criar_motivo → sign-upload + Cloudinary + anexar_ao_motivo → pedir_troca_de_aula).

const PEDIDA = 'Pedido de troca enviado. A aula nova fica como Troca pendente até a decisão.';

async function abrirMenu(page: Page, conta: Conta): Promise<void> {
  await entrar(page, conta);
  await expect(page).toHaveURL('/inicio');
  await page.goto('/aulas/semana');
}

/** Pede a troca permanente de `minha` por `nova`, com a justificativa e os anexos. */
async function pedirPermanenteComAnexos(
  page: Page,
  conta: Conta,
  { minha, nova }: { minha: AulaSintetica; nova: AulaSintetica },
  nomes: readonly string[],
): Promise<Locator> {
  await abrirMenu(page, conta);
  const item = page.getByRole('listitem').filter({ hasText: nova.titulo });
  await item.getByRole('button', { name: 'Trocar para esta' }).click();
  await item.getByRole('radio', { name: 'Permanente' }).check();
  await item.getByRole('radio', { name: new RegExp(minha.titulo) }).check();
  await item
    .getByLabel('Por que você precisa mudar de horário? (obrigatório)')
    .fill('Mudei de turno no trabalho.');
  await item.locator('input[type="file"]').setInputFiles(nomes.map(pdf));
  for (const nome of nomes) {
    await expect(item.getByRole('button', { name: `Remover ${nome}` })).toBeVisible();
  }
  await item.getByRole('button', { name: 'Pedir troca' }).click();
  return item;
}

/** Os anexos do motivo, na ordem em que entraram. */
async function anexosDoMotivo(motivoId: string): Promise<{ id: string; public_id: string }[]> {
  const { data } = await banco()
    .from('action_reason_attachments')
    .select('id, public_id')
    .eq('reason_id', motivoId)
    .order('created_at');
  return (data ?? []) as { id: string; public_id: string }[];
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

    await expect(page.getByRole('status')).toHaveText(PEDIDA);
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

    await expect(page.getByRole('status')).toHaveText(PEDIDA);
    const troca = await trocaGravada(aluno.id, nova.id);
    expect(troca).toMatchObject({ kind: 'permanent', status: 'pending', from_class_id: minha.id });
    expect(troca?.motivo_id).not.toBeNull();
  });

  test('permanente com anexos: os arquivos vão para o motivo antes do pedido', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const minha = await criarAula(mundo, 60, { recorrente: true });
    const nova = await criarAula(mundo, 90, { daOutraTurma: true, recorrente: true });
    const assinaturas = await simularEnvio(page, 'motivo');

    await pedirPermanenteComAnexos(page, aluno, { minha, nova }, ['escala-1.pdf', 'escala-2.pdf']);

    await expect(recado(page)).toHaveText(PEDIDA);
    const troca = await trocaGravada(aluno.id, nova.id);
    expect(troca).toMatchObject({ kind: 'permanent', status: 'pending', from_class_id: minha.id });
    const anexos = await anexosDoMotivo(String(troca?.motivo_id));
    expect(assinaturas).toEqual(
      anexos.map((anexo) => ({ motivoId: troca?.motivo_id, anexoId: anexo.id })),
    );
    expect(anexos.map((anexo) => anexo.public_id)).toEqual(
      anexos.map((anexo) => `motivos/${aluno.id}/${anexo.id}`),
    );
  });

  test('se um anexo falha, o "Tentar de novo" repete o mesmo id e pede uma troca só', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const minha = await criarAula(mundo, 60, { recorrente: true });
    const nova = await criarAula(mundo, 90, { daOutraTurma: true, recorrente: true });
    const assinaturas = await simularEnvio(page, 'motivo', { falhasDaCloudinary: 1 });

    const item = await pedirPermanenteComAnexos(page, aluno, { minha, nova }, [
      'escala-1.pdf',
      'escala-2.pdf',
    ]);

    const aviso = item.getByRole('alert');
    await expect(aviso).toContainText('O texto já foi registrado, mas um anexo não foi enviado.');
    await expect(aviso).toContainText('escala-1.pdf');
    await expect(item.getByLabel('Por que você precisa mudar de horário? (obrigatório)')).toBeDisabled();
    await item.getByRole('button', { name: 'Tentar de novo' }).click();

    await expect(recado(page)).toHaveText(PEDIDA);
    const troca = await trocaGravada(aluno.id, nova.id);
    expect(await anexosDoMotivo(String(troca?.motivo_id))).toHaveLength(2);
    const [primeira, , repetida] = assinaturas.map((corpo) => corpo.anexoId);
    expect(repetida).toBe(primeira);
  });

  test('"Seguir sem o anexo" pede a troca com o texto e os anexos que foram', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const minha = await criarAula(mundo, 60, { recorrente: true });
    const nova = await criarAula(mundo, 90, { daOutraTurma: true, recorrente: true });
    await simularEnvio(page, 'motivo', { falhasDaCloudinary: 1 });

    const item = await pedirPermanenteComAnexos(page, aluno, { minha, nova }, [
      'escala-1.pdf',
      'escala-2.pdf',
    ]);
    await item.getByRole('button', { name: 'Seguir sem o anexo' }).click();

    await expect(recado(page)).toHaveText(
      'Pedido de troca enviado, sem os anexos que falharam. A aula nova fica como Troca pendente até a decisão.',
    );
    const troca = await trocaGravada(aluno.id, nova.id);
    expect(troca).toMatchObject({ kind: 'permanent', status: 'pending' });
    expect(await anexosDoMotivo(String(troca?.motivo_id))).toHaveLength(1);
  });
});
