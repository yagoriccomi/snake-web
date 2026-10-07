import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Até onde o guarda confere, conforme a página que chama. Cada página confere
 * só as etapas ANTERIORES à dela: `/primeiro-acesso` não pode exigir o primeiro
 * acesso concluído, nem `/termos` o aceite, senão ninguém chegaria nelas.
 */
export type Etapa = 'primeiro-acesso' | 'termos' | 'aluno';

export type Rota = '/' | '/primeiro-acesso' | '/termos';

export type Acesso =
  | { situacao: 'liberado'; usuario: { id: string; nome: string | null } }
  | { situacao: 'redirecionar'; para: Rota }
  | { situacao: 'nao-e-aluno' }
  | { situacao: 'erro' };

const PAPEL_DO_ALUNO = 'user';

/**
 * A porta de entrada de toda página logada, na ordem: sessão → papel de aluno
 * → primeiro acesso → termos pendentes.
 *
 * Não é a segurança: quem protege o dado é a RLS. É o que garante a
 * experiência certa: professor barrado na porta (a gestão vive no app), a
 * senha que a academia conhece trocada antes de tudo, e nenhum dado na tela
 * antes do aceite, porque o consentimento se prova pela linha no banco, não
 * pela boa vontade de quem navega.
 *
 * Na dúvida, nunca libera: erro ao ler o perfil ou os documentos vira erro.
 */
export async function verificarAcesso(cliente: SupabaseClient, etapa: Etapa): Promise<Acesso> {
  const { data: sessao } = await cliente.auth.getSession();
  const usuario = sessao.session?.user;
  if (usuario === undefined) {
    return { situacao: 'redirecionar', para: '/' };
  }

  const { data: perfil, error } = await cliente
    .from('profiles')
    .select('name, role, is_first_login')
    .eq('id', usuario.id)
    .maybeSingle();
  if (error !== null || perfil === null) {
    return { situacao: 'erro' };
  }

  if (perfil.role !== PAPEL_DO_ALUNO) {
    await cliente.auth.signOut();
    return { situacao: 'nao-e-aluno' };
  }

  const liberado: Acesso = {
    situacao: 'liberado',
    usuario: { id: usuario.id, nome: perfil.name === null ? null : String(perfil.name) },
  };
  if (etapa === 'primeiro-acesso') {
    return liberado;
  }

  if (perfil.is_first_login === true) {
    return { situacao: 'redirecionar', para: '/primeiro-acesso' };
  }
  if (etapa === 'termos') {
    return liberado;
  }

  const { data: pendentes, error: erroDosDocumentos } = await cliente.rpc(
    'documentos_legais_pendentes',
  );
  if (erroDosDocumentos !== null) {
    return { situacao: 'erro' };
  }
  if (Array.isArray(pendentes) && pendentes.length > 0) {
    return { situacao: 'redirecionar', para: '/termos' };
  }
  return liberado;
}
