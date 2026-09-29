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
 * Senha que já passou no Supabase enquanto a tela está aberta. A página guarda
 * num `useRef`; nunca sai da memória da aba.
 */
export type SenhaJaTrocada = { current: string | null };

/**
 * Código que o Supabase devolve quando a senha nova é igual à atual. Nunca conta
 * como sucesso: a senha atual pode ser a que a academia deu.
 */
export const SENHA_IGUAL = 'same_password';

/**
 * Conclui o primeiro acesso em três passos, nesta ordem:
 *
 * 1. grava os dados, **sem** mexer em `is_first_login`;
 * 2. troca a senha, se ela ainda não foi trocada nesta tela;
 * 3. só então marca `is_first_login = false`.
 *
 * Por quê: se a flag fosse junto com os dados e a troca de senha falhasse, a
 * pessoa nunca mais voltaria a esta tela, e a senha que a academia conhece
 * continuaria valendo para sempre. Com esta ordem, qualquer falha deixa a flag
 * `true`, e a próxima entrada traz a pessoa de volta para terminar.
 *
 * Mesma regra do app (item 2.4 do `ROADMAP-thai.md`).
 *
 * Lança o erro do passo que falhou; quem chama decide a mensagem.
 */
export async function concluirPrimeiroAcesso(
  cliente: SupabaseClient,
  dados: DadosDoPrimeiroAcesso,
  senhaJaTrocada: SenhaJaTrocada,
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

  // Se a senha já passou e só a marcação falhou, repetir o envio não troca de
  // novo: o Supabase recusaria a "senha igual" e a pessoa ficaria presa.
  if (senhaJaTrocada.current !== dados.senha) {
    const { error: erroDaSenha } = await cliente.auth.updateUser({ password: dados.senha });
    if (erroDaSenha !== null) {
      throw erroDaSenha;
    }
    senhaJaTrocada.current = dados.senha;
  }

  const { error: erroDaConclusao } = await cliente
    .from('profiles')
    .update({ is_first_login: false })
    .eq('id', dados.userId);
  if (erroDaConclusao !== null) {
    throw erroDaConclusao;
  }
}
