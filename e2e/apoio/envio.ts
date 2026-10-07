import type { Locator, Page, Route } from '@playwright/test';

// O `snake-server` (assinatura) e a Cloudinary simulados para os anexos; o
// banco dos testes é o local, de verdade.

export const SEM_CLOUDINARY = 'https://api.cloudinary.com/v1_1/PREENCHER/auto/upload';

const CLOUDINARY = 'https://api.cloudinary.com/v1_1/conta-de-teste/auto/upload';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** As duas rotas de assinatura (G2) e o campo que vira o nome do arquivo. */
const ROTAS = {
  justificativa: { caminho: '**/v1/justifications/sign-upload', nome: 'justificationId' },
  motivo: { caminho: '**/v1/motivos/sign-upload', nome: 'anexoId' },
} as const;

export interface Simulacao {
  /** A `uploadUrl` que o servidor assina. */
  uploadUrl?: string;
  /** Quantas vezes a Cloudinary falha antes de aceitar. */
  falhasDaCloudinary?: number;
}

/** Simula a assinatura e a Cloudinary; devolve os corpos pedidos ao servidor. */
export async function simularEnvio(
  page: Page,
  rota: keyof typeof ROTAS,
  simulacao: Simulacao = {},
): Promise<Record<string, string>[]> {
  const pedidos: Record<string, string>[] = [];
  let falhasRestantes = simulacao.falhasDaCloudinary ?? 0;

  await page.route(ROTAS[rota].caminho, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const corpo = route.request().postDataJSON() as Record<string, string>;
    pedidos.push(corpo);
    await route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({
        uploadUrl: simulacao.uploadUrl ?? CLOUDINARY,
        apiKey: 'chave',
        timestamp: 1,
        signature: 'assinatura',
        folder: 'pasta-de-teste',
        public_id: corpo[ROTAS[rota].nome],
        type: 'private',
        overwrite: false,
        allowed_formats: 'jpg,png,webp,heic,pdf',
      }),
    });
  });

  await page.route(CLOUDINARY, async (route: Route) => {
    if (falhasRestantes > 0) {
      falhasRestantes -= 1;
      await route.fulfill({ status: 502, headers: CORS, body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ public_id: 'pasta-de-teste/arquivo' }),
    });
  });

  return pedidos;
}

/** Um PDF sintético com o nome pedido. */
export function pdf(nome: string): { name: string; mimeType: string; buffer: Buffer } {
  return { name: nome, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sintetico') };
}

/** O recado da tela; o progresso do anexo também é um status e some no fim. */
export function recado(page: Page): Locator {
  return page.getByRole('status').filter({ hasNotText: 'Enviando anexo' });
}
