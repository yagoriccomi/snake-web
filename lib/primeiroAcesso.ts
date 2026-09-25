import type { SupabaseClient } from '@supabase/supabase-js';

export type DadosDoPrimeiroAcesso = {
  userId: string;
  nome: string;
  cpf: string;
  celular: string;
  nascimentoIso: string;
  senha: string;
};

/**
 * Código que o Supabase devolve quando a senha nova é igual à atual. Aqui ele
 * só aparece quando uma tentativa anterior trocou a senha e caiu antes de
 * marcar a conclusão: a senha que a academia conhece já deixou de valer.
 */
const SENHA_JA_TROCADA = 'same_password';

/**
 * Conclui o primeiro acesso em três passos, nesta ordem:
 *
 * 1. grava os dados, **sem** mexer em `is_first_login`;
 * 2. troca a senha;
 * 3. só então marca `is_first_login = false`.
 *
 * Por quê: se a flag fosse junto com os dados e a troca de senha falhasse, a
 * pessoa nunca mais voltaria a esta tela, e a senha que a academia conhece
 * continuaria valendo para sempre. Com esta ordem, qualquer falha deixa a flag
 * `true`, e a próxima entrada traz a pessoa de volta para terminar.
 *
 * Lança o erro do passo que falhou; quem chama decide a mensagem.
 */
export async function concluirPrimeiroAcesso(
  cliente: SupabaseClient,
  dados: DadosDoPrimeiroAcesso,
): Promise<void> {
  const { error: erroDoPerfil } = await cliente
    .from('profiles')
    .update({
      name: dados.nome,
      cpf: dados.cpf,
      phone: dados.celular,
      dob: dados.nascimentoIso,
    })
    .eq('id', dados.userId);
  if (erroDoPerfil !== null) {
    throw erroDoPerfil;
  }

  const { error: erroDaSenha } = await cliente.auth.updateUser({ password: dados.senha });
  if (erroDaSenha !== null && erroDaSenha.code !== SENHA_JA_TROCADA) {
    throw erroDaSenha;
  }

  const { error: erroDaConclusao } = await cliente
    .from('profiles')
    .update({ is_first_login: false })
    .eq('id', dados.userId);
  if (erroDaConclusao !== null) {
    throw erroDaConclusao;
  }
}
