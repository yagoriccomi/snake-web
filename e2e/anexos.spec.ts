import type { Locator, Page } from '@playwright/test';

import { banco, criarAula, negarJustificativa, type Conta } from './apoio/banco';
import { pdf, recado, SEM_CLOUDINARY, simularEnvio } from './apoio/envio';
import { entrar, expect, test } from './apoio/teste';

// 6.6: o anexo da justificativa (sign-upload → Cloudinary → anexar_a_justificativa).
// É o banco que deriva o caminho do arquivo a partir do id e da tentativa.

const MOTIVO = 'Consulta médica no horário da aula.';

/** Abre a justificativa pelo "Não vou", escreve o motivo e anexa o atestado. */
async function justificarComAnexo(page: Page, conta: Conta, titulo: string): Promise<Locator> {
  await entrar(page, conta);
  await expect(page).toHaveURL('/inicio');
  await page.goto('/aulas');
  const item = page.getByRole('listitem').filter({ hasText: titulo });
  await item.getByRole('button', { name: 'Não vou' }).click();
  await item.getByLabel('Motivo da falta').fill(MOTIVO);
  await item.locator('input[type="file"]').setInputFiles(pdf('atestado.pdf'));
  await expect(item.getByRole('button', { name: 'Remover atestado.pdf' })).toBeVisible();
  await item.getByRole('button', { name: 'Enviar justificativa' }).click();
  return item;
}

async function anexoGravado(userId: string, classId: string): Promise<unknown> {
  const linha = await banco()
    .from('absence_justifications')
    .select('id, proof_provider, proof_public_id')
    .eq('user_id', userId)
    .eq('class_id', classId)
    .single();
  return linha.data;
}

test.describe('Anexo da justificativa (6.6)', () => {
  test('o atestado vai com a justificativa, e o banco grava o caminho', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, 30);
    const pedidos = await simularEnvio(page, 'justificativa');

    await justificarComAnexo(page, aluno, aula.titulo);

    await expect(recado(page)).toHaveText('Justificativa enviada. A academia vai analisar.');
    const linha = (await anexoGravado(aluno.id, aula.id)) as { id: string };
    expect(pedidos).toEqual([{ justificationId: linha.id }]);
    expect(linha).toEqual({
      id: linha.id,
      proof_provider: 'cloudinary',
      proof_public_id: `justificativas/${aluno.id}/${linha.id}`,
    });
  });

  test('se a Cloudinary falha, avisa e o "Tentar de novo" envia o mesmo anexo', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, 30);
    await simularEnvio(page, 'justificativa', { falhasDaCloudinary: 1 });

    const item = await justificarComAnexo(page, aluno, aula.titulo);

    const aviso = item.getByRole('alert');
    await expect(aviso).toContainText('O texto já foi registrado, mas um anexo não foi enviado.');
    await expect(aviso).toContainText('atestado.pdf: O serviço de arquivos falhou. Tente de novo em instantes.');
    await item.getByRole('button', { name: 'Tentar de novo' }).click();

    await expect(recado(page)).toHaveText('Justificativa enviada. A academia vai analisar.');
    const linha = (await anexoGravado(aluno.id, aula.id)) as { proof_public_id: string | null };
    expect(linha.proof_public_id).not.toBeNull();
  });

  test('sem Cloudinary, o anexo fica indisponível e a justificativa segue sem ele', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, 30);
    await simularEnvio(page, 'justificativa', { uploadUrl: SEM_CLOUDINARY });

    const item = await justificarComAnexo(page, aluno, aula.titulo);

    await expect(item.getByRole('alert')).toHaveText(
      'O envio de arquivos não está disponível agora. O texto já foi registrado e pode seguir sem o anexo.',
    );
    await expect(item.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(0);
    await item.getByRole('button', { name: 'Seguir sem o anexo' }).click();

    await expect(recado(page)).toHaveText(
      'Justificativa enviada, sem o anexo. A academia vai analisar.',
    );
    const linha = (await anexoGravado(aluno.id, aula.id)) as { proof_public_id: string | null };
    expect(linha.proof_public_id).toBeNull();
  });

  test('no reenvio (D42), o anexo novo entra com o nome da 2ª tentativa', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const aula = await criarAula(mundo, 30);
    await simularEnvio(page, 'justificativa');
    await justificarComAnexo(page, aluno, aula.titulo);
    await expect(recado(page)).toHaveText('Justificativa enviada. A academia vai analisar.');
    await negarJustificativa(aluno.id, aula.id);

    await page.goto('/justificativas');
    const cartao = page.getByRole('listitem').filter({ hasText: aula.titulo });
    await cartao.getByRole('button', { name: /^Reenviar até/ }).click();
    await cartao.getByLabel('Motivo da falta').fill('Segue o atestado legível.');
    await cartao.locator('input[type="file"]').setInputFiles(pdf('atestado.pdf'));
    await cartao.getByRole('button', { name: 'Reenviar', exact: true }).click();

    await expect(recado(page)).toHaveText('Justificativa reenviada. A academia vai analisar.');
    const linha = (await anexoGravado(aluno.id, aula.id)) as { id: string; proof_public_id: string };
    expect(linha.proof_public_id).toBe(`justificativas/${aluno.id}/${linha.id}-2`);
  });
});
