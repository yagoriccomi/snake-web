import { expect, test as base, type Page } from '@playwright/test';

import { apagarConta, criarConta, lerMundo, type Conta, type Mundo, type OpcoesDeConta } from './banco';

/**
 * `test` com o mundo da rodada e contas sintéticas que se apagam sozinhas no
 * fim de cada teste: nenhum teste depende do que outro deixou [#48].
 */
export const test = base.extend<{
  mundo: Mundo;
  novaConta: (opcoes?: OpcoesDeConta) => Promise<Conta>;
}>({
  mundo: async ({}, usar) => {
    await usar(lerMundo());
  },
  novaConta: async ({ mundo }, usar) => {
    const criadas: Conta[] = [];
    await usar(async (opcoes) => {
      const conta = await criarConta(mundo, opcoes);
      criadas.push(conta);
      return conta;
    });
    for (const conta of criadas) await apagarConta(conta.id);
  },
});

export { expect };

/** Entra pela tela de login, como a pessoa faria. */
export async function entrar(page: Page, conta: Conta, senha: string = conta.senha): Promise<void> {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(conta.email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/**
 * O aviso de erro da página. Fica dentro do `<main>`: fora dele, o Next põe um
 * anunciador de rotas que também tem `role="alert"`.
 */
export function avisoDaTela(page: Page) {
  return page.getByRole('main').getByRole('alert');
}
