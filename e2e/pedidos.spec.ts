import type { Locator, Page } from '@playwright/test';

import { banco, criarAula, type Conta } from './apoio/banco';
import { pdf, recado, simularEnvio } from './apoio/envio';
import { entrar, expect, test } from './apoio/teste';

// 6.7: "Eu estava na aula" numa aula que já teve chamada, com até 5 anexos
// (criar_motivo → sign-upload + Cloudinary + anexar_ao_motivo → abrir_solicitacao),
// e Meus pedidos.

const DOIS_DIAS_ATRAS_EM_MINUTOS = -2 * 24 * 60;

/** Abre o "Eu estava na aula", escreve o que aconteceu e anexa os arquivos. */
async function contestarComAnexos(
  page: Page,
  conta: Conta,
  titulo: string,
  nomes: readonly string[],
): Promise<Locator> {
  await entrar(page, conta);
  await expect(page).toHaveURL('/inicio');
  await page.goto('/aulas');
  const item = page.getByRole('listitem').filter({ hasText: titulo });
  await item.getByRole('button', { name: 'Eu estava na aula' }).click();
  await item.getByLabel('O que aconteceu').fill('Fiz a aula inteira; a chamada saiu sem mim.');
  await item.locator('input[type="file"]').setInputFiles(nomes.map(pdf));
  for (const nome of nomes) {
    await expect(item.getByRole('button', { name: `Remover ${nome}` })).toBeVisible();
  }
  await item.getByRole('button', { name: 'Enviar pedido' }).click();
  return item;
}

/** O pedido aberto e os anexos do motivo dele, como o banco gravou. */
async function pedidoGravado(
  userId: string,
  classId: string,
): Promise<{ pedidos: number; motivoId: string; anexos: { id: string; public_id: string }[] }> {
  const db = banco();
  const pedidos = await db
    .from('roll_call_requests')
    .select('motivo_id')
    .eq('class_id', classId)
    .eq('subject_id', userId);
  const motivoId = String(pedidos.data?.[0]?.motivo_id);
  const anexos = await db
    .from('action_reason_attachments')
    .select('id, public_id')
    .eq('reason_id', motivoId)
    .order('created_at');
  return {
    pedidos: pedidos.data?.length ?? 0,
    motivoId,
    anexos: (anexos.data ?? []) as { id: string; public_id: string }[],
  };
}

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

  test('os anexos vão com o pedido, cada um com o seu id, antes de o pedido abrir', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, DOIS_DIAS_ATRAS_EM_MINUTOS, { chamadaFeita: true });
    const assinaturas = await simularEnvio(page, 'motivo');

    await contestarComAnexos(page, aluno, aula.titulo, ['foto-1.pdf', 'foto-2.pdf']);

    await expect(recado(page)).toHaveText('Pedido enviado. Acompanhe a resposta em Meus pedidos.');
    const gravado = await pedidoGravado(aluno.id, aula.id);
    expect(gravado.pedidos).toBe(1);
    expect(assinaturas).toEqual(
      gravado.anexos.map((anexo) => ({ motivoId: gravado.motivoId, anexoId: anexo.id })),
    );
    expect(gravado.anexos.map((anexo) => anexo.public_id)).toEqual(
      gravado.anexos.map((anexo) => `motivos/${aluno.id}/${anexo.id}`),
    );
  });

  test('se um anexo falha, o "Tentar de novo" repete o mesmo id e abre um pedido só', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, DOIS_DIAS_ATRAS_EM_MINUTOS, { chamadaFeita: true });
    const assinaturas = await simularEnvio(page, 'motivo', { falhasDaCloudinary: 1 });

    const item = await contestarComAnexos(page, aluno, aula.titulo, ['foto-1.pdf', 'foto-2.pdf']);

    const aviso = item.getByRole('alert');
    await expect(aviso).toContainText('O texto já foi registrado, mas um anexo não foi enviado.');
    await expect(aviso).toContainText('foto-1.pdf');
    await item.getByRole('button', { name: 'Tentar de novo' }).click();

    await expect(recado(page)).toHaveText('Pedido enviado. Acompanhe a resposta em Meus pedidos.');
    const gravado = await pedidoGravado(aluno.id, aula.id);
    expect(gravado.pedidos).toBe(1);
    expect(gravado.anexos).toHaveLength(2);
    const [primeira, , nova] = assinaturas.map((corpo) => corpo.anexoId);
    expect(nova).toBe(primeira);
  });

  test('"Seguir sem o anexo" abre o pedido com o texto e os anexos que foram', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, DOIS_DIAS_ATRAS_EM_MINUTOS, { chamadaFeita: true });
    await simularEnvio(page, 'motivo', { falhasDaCloudinary: 1 });

    const item = await contestarComAnexos(page, aluno, aula.titulo, ['foto-1.pdf', 'foto-2.pdf']);
    await item.getByRole('button', { name: 'Seguir sem o anexo' }).click();

    await expect(recado(page)).toHaveText(
      'Pedido enviado, sem os anexos que falharam. Acompanhe a resposta em Meus pedidos.',
    );
    const gravado = await pedidoGravado(aluno.id, aula.id);
    expect(gravado.pedidos).toBe(1);
    expect(gravado.anexos).toHaveLength(1);
  });
});
