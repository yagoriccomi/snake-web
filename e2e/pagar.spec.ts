import { banco, mensalidadeAberta } from './apoio/banco';
import { avisoDaTela, entrar, expect, test } from './apoio/teste';

// Roteiro 1.3 da Fase 1. No local, o envio vai para o Storage de propósito
// (NEXT_PUBLIC_PROOF_UPLOAD_TO_STORAGE). O admin abrindo o comprovante no app
// DEV continua no roteiro manual.

const PNG_MINIMO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const PDF_MINIMO = Buffer.from(['%PDF-1.4', '1 0 obj<<>>endobj', 'trailer<<>>', '%%EOF', ''].join('\n'));
const ONZE_MB = 11 * 1024 * 1024;

test.describe('/pagar/[id]', () => {
  for (const arquivo of [
    { tipo: 'PNG', name: 'comprovante.png', mimeType: 'image/png', buffer: PNG_MINIMO },
    { tipo: 'PDF', name: 'comprovante.pdf', mimeType: 'application/pdf', buffer: PDF_MINIMO },
  ]) {
    test(`comprovante em ${arquivo.tipo} deixa a mensalidade em análise, no Storage`, async ({
      page,
      mundo,
      novaConta,
    }) => {
      const aluno = await novaConta({ termosAceitos: true });
      const mensalidade = await mensalidadeAberta(mundo, aluno.id);

      await entrar(page, aluno);
      await expect(page).toHaveURL('/inicio');
      await page.goto(`/pagar/${mensalidade}`);
      await expect(page.getByRole('heading', { name: 'Pagar mensalidade' })).toBeVisible();
      await page.locator('#comprovante').setInputFiles(arquivo);

      await expect(page.getByText('Comprovante enviado')).toBeVisible();
      const gravada = await banco()
        .from('payments')
        .select('status, proof_provider, proof_storage_path')
        .eq('id', mensalidade)
        .single();
      expect(gravada.data?.status).toBe('pending_approval');
      expect(gravada.data?.proof_provider).toBe('supabase_storage');
      expect(gravada.data?.proof_storage_path).toMatch(new RegExp(`^${aluno.id}/`));
    });
  }

  test('arquivo grande demais ou de tipo não aceito é recusado com a explicação, sem envio', async ({
    page,
    mundo,
    novaConta,
  }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const mensalidade = await mensalidadeAberta(mundo, aluno.id);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto(`/pagar/${mensalidade}`);
    const seletor = page.locator('#comprovante');

    await seletor.setInputFiles({
      name: 'grande.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(ONZE_MB),
    });
    await expect(avisoDaTela(page)).toHaveText(
      'O arquivo passa de 10 MB. Tente uma foto menor.',
    );

    await seletor.setInputFiles({
      name: 'nota.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('texto'),
    });
    await expect(avisoDaTela(page)).toHaveText(
      'Envie uma foto (JPG, PNG ou WEBP) ou um PDF.',
    );

    const gravada = await banco().from('payments').select('status').eq('id', mensalidade).single();
    expect(gravada.data?.status).toBe('open');
  });

  test('a mensalidade de outra pessoa na URL não aparece', async ({ page, mundo, novaConta }) => {
    const aluno = await novaConta({ termosAceitos: true });
    const outra = await novaConta({ termosAceitos: true });
    const mensalidadeDaOutra = await mensalidadeAberta(mundo, outra.id);

    await entrar(page, aluno);
    await expect(page).toHaveURL('/inicio');
    await page.goto(`/pagar/${mensalidadeDaOutra}`);

    await expect(page.getByRole('heading', { name: 'Mensalidade não encontrada' })).toBeVisible();
    await expect(page.locator('#comprovante')).toHaveCount(0);
  });
});
