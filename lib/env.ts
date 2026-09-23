/**
 * Leitura validada das variáveis de ambiente.
 *
 * Falha alto, no boot, em vez de deixar a página abrir e quebrar no primeiro
 * clique com "supabaseUrl is required". Mesmo princípio do aplicativo.
 *
 * Só variáveis `NEXT_PUBLIC_`: tudo aqui é lido pelo navegador. A chave anônima
 * é pública por natureza — quem protege os dados é a RLS do banco, não o
 * segredo da chave. Nenhum segredo de verdade pode entrar neste arquivo.
 */

function obrigatoria(nome: string, valor: string | undefined): string {
  if (valor === undefined || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. Copie .env.example para .env.local e preencha.`,
    );
  }
  return valor.trim();
}

export const env = {
  supabaseUrl: obrigatoria('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: obrigatoria(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  apiUrl: obrigatoria('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
} as const;
