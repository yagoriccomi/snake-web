import { createClient } from '@supabase/supabase-js';

import { lerAmbientePublico } from './apoio/ambiente';
import { banco, cpfSintetico, senhaSintetica } from './apoio/banco';
import { avisoDaTela, entrar, expect, test } from './apoio/teste';

// Roteiro 1.2 da Fase 1. A queda de rede entre o perfil e a senha fica nos
// testes de unidade de `concluirPrimeiroAcesso` (3.1): aqui não dá para cortar
// a rede no instante certo sem adivinhar o tempo.

async function senhaEntra(email: string, senha: string): Promise<boolean> {
  const { url, anonKey } = lerAmbientePublico();
  const anonimo = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await anonimo.auth.signInWithPassword({ email, password: senha });
  return error === null;
}

test.describe('/primeiro-acesso', () => {
  test('aluno preenche dados e senha, cai na inicial, e só a senha nova entra', async ({
    page,
    novaConta,
  }) => {
    const aluno = await novaConta({ primeiroAcesso: true, termosAceitos: true });
    const senhaNova = senhaSintetica();

    await entrar(page, aluno);
    await expect(page).toHaveURL('/primeiro-acesso');
    await page.getByLabel('Nome completo').fill('Aluno Sintético Novo');
    await page.getByLabel('CPF').fill(cpfSintetico());
    await page.getByLabel('Celular').fill('11987654321');
    await page.getByLabel('Data de nascimento').fill('31/01/1990');
    await page.getByLabel('Nova senha').fill(senhaNova);
    await page.getByLabel('Repita a senha').fill(senhaNova);
    await page.getByRole('button', { name: 'Concluir' }).click();

    await expect(page).toHaveURL('/inicio');
    const perfil = await banco()
      .from('profiles')
      .select('name, is_first_login')
      .eq('id', aluno.id)
      .single();
    expect(perfil.data).toEqual({ name: 'Aluno Sintético Novo', is_first_login: false });
    expect(await senhaEntra(aluno.email, senhaNova)).toBe(true);
    expect(await senhaEntra(aluno.email, aluno.senha)).toBe(false);
  });

  test('aluno "Não usa o app" encontra nome e CPF já preenchidos pela academia', async ({
    page,
    novaConta,
  }) => {
    const aluno = await novaConta({ primeiroAcesso: true, semApp: true, termosAceitos: true });

    await entrar(page, aluno);

    await expect(page).toHaveURL('/primeiro-acesso');
    await expect(page.getByLabel('Nome completo')).toHaveValue(aluno.nome);
    const cpfNaTela = await page.getByLabel('CPF').inputValue();
    expect(cpfNaTela.replace(/\D/g, '')).toBe(aluno.cpf);
  });

  test('cada validação diz o que fazer e nada é gravado', async ({ page, novaConta }) => {
    const aluno = await novaConta({ primeiroAcesso: true, termosAceitos: true });
    const senha = senhaSintetica();
    const aviso = avisoDaTela(page);
    const concluir = page.getByRole('button', { name: 'Concluir' });

    await entrar(page, aluno);
    await expect(page).toHaveURL('/primeiro-acesso');
    await page.getByLabel('Nome completo').fill('Aluno Sintético Novo');
    await page.getByLabel('Celular').fill('11987654321');
    await page.getByLabel('Nova senha').fill(senha);
    await page.getByLabel('Repita a senha').fill(senha);

    await page.getByLabel('CPF').fill('11111111111');
    await page.getByLabel('Data de nascimento').fill('31/01/1990');
    await concluir.click();
    await expect(aviso).toHaveText('CPF inválido. Confira os números.');

    await page.getByLabel('CPF').fill(cpfSintetico());
    await page.getByLabel('Data de nascimento').fill('31/02/1990');
    await concluir.click();
    await expect(aviso).toHaveText('Data de nascimento inválida. Use DD/MM/AAAA.');

    await page.getByLabel('Data de nascimento').fill('31/01/1990');
    await page.getByLabel('Nova senha').fill('fraca');
    await page.getByLabel('Repita a senha').fill('fraca');
    await concluir.click();
    await expect(aviso).toContainText('Sua senha precisa de');

    await page.getByLabel('Nova senha').fill(senha);
    await page.getByLabel('Repita a senha').fill(`${senha}x`);
    await concluir.click();
    await expect(aviso).toHaveText('As duas senhas não são iguais.');

    await expect(page).toHaveURL('/primeiro-acesso');
    const perfil = await banco()
      .from('profiles')
      .select('is_first_login')
      .eq('id', aluno.id)
      .single();
    expect(perfil.data?.is_first_login).toBe(true);
  });
});
