/**
 * Que frase o aluno lê quando uma gravação falha.
 *
 * Regra D20: todo erro identificado tem mensagem própria, e só o não
 * identificado cai na genérica. Mora fora de `lib/dados.ts` para não depender
 * do cliente do Supabase: é regra pura, testada sem rede e sem variáveis de
 * ambiente.
 */

/**
 * SQLSTATEs que as funções do banco usam com uma frase para o aluno
 * (`raise exception '…' using errcode = …`, contrato § 7 a § 15).
 */
const CODIGOS_COM_FRASE: ReadonlySet<string> = new Set(['23514', '22023', 'P0002', '42501']);

/**
 * O guia de estilo do Postgres escreve as mensagens nativas em minúscula
 * ("permission denied for table…", "new row violates row-level security
 * policy…"); as frases do contrato começam em maiúscula. É o que impede a RLS
 * de mandar inglês técnico para a tela com o mesmo código de uma frase.
 */
const FRASE_ESCRITA_PARA_O_ALUNO = /^\p{Lu}/u;

const UNIQUE_VIOLATION = '23505';

/** Mensagem própria de cada SQLSTATE conhecido, quando o banco não manda frase. */
const MENSAGEM_DO_SQLSTATE: Readonly<Record<string, string>> = {
  '23514': 'Algum dado não atende às regras. Confira e tente de novo.',
  '22023': 'Algum dado enviado não é válido. Confira e tente de novo.',
  P0002: 'Não encontramos o que você pediu. Atualize a página e tente de novo.',
  '42501': 'Você não tem permissão para esta ação.',
  [UNIQUE_VIOLATION]: 'Isso já está registrado.',
};

/** O mesmo texto do aplicativo para o CPF repetido. */
const CPF_JA_CADASTRADO = 'Este CPF já está cadastrado em outra conta.';

/**
 * Como a falha de rede chega: o supabase-js devolve um objeto com
 * "TypeError: Failed to fetch", e o `fetch` puro lança o `TypeError`.
 */
const FALHA_DE_REDE =
  /failed to fetch|fetch failed|network ?error|network request failed|load failed|timeout/i;
const FALHA_DE_REDE_DO_LOGIN = 'AuthRetryableFetchError';

/** O verbo que completa "Não foi possível …". */
export type AcaoQueFalhou =
  | 'avisar'
  | 'enviar'
  | 'desistir'
  | 'salvar'
  | 'abrir a meta'
  | 'registrar seu aceite'
  | 'concluir';

/** Erro de preenchimento que a própria web detecta antes de ir ao banco. */
export class ErroDeValidacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeValidacao';
  }
}

/** Lê um campo de texto de um erro de forma desconhecida; vazio quando não há. */
function campo(falha: unknown, nome: string): string {
  if (typeof falha !== 'object' || falha === null) return '';
  const valor = (falha as Record<string, unknown>)[nome];
  return typeof valor === 'string' ? valor : '';
}

function fraseDoBanco(codigo: string, mensagem: string): string | null {
  if (!CODIGOS_COM_FRASE.has(codigo)) return null;
  const frase = mensagem.trim();
  return FRASE_ESCRITA_PARA_O_ALUNO.test(frase) ? frase : null;
}

/** Mensagem e detalhe juntos: a constraint e o "Failed to fetch" vêm em qualquer um. */
function textoDaFalha(falha: unknown): string {
  return `${campo(falha, 'message')} ${campo(falha, 'details')}`;
}

function mensagemDoCodigo(codigo: string, falha: unknown): string | null {
  if (codigo === UNIQUE_VIOLATION && /cpf/i.test(textoDaFalha(falha))) return CPF_JA_CADASTRADO;
  return MENSAGEM_DO_SQLSTATE[codigo] ?? null;
}

function ehFalhaDeRede(falha: unknown): boolean {
  if (campo(falha, 'name') === FALHA_DE_REDE_DO_LOGIN) return true;
  return FALHA_DE_REDE.test(textoDaFalha(falha));
}

/**
 * A frase da tela para uma falha qualquer.
 *
 * @param falha O que o `catch` recebeu: `ErroDeValidacao`, erro do supabase-js ou do navegador.
 * @param acao  O que o aluno tentava fazer, para a frase de conexão e a genérica.
 */
export function mensagemDaFalha(falha: unknown, acao: AcaoQueFalhou): string {
  if (falha instanceof ErroDeValidacao) return falha.message;

  const codigo = campo(falha, 'code');
  const identificada =
    fraseDoBanco(codigo, campo(falha, 'message')) ?? mensagemDoCodigo(codigo, falha);
  if (identificada !== null) return identificada;

  if (ehFalhaDeRede(falha)) {
    return `Não foi possível ${acao}. Verifique a conexão e tente de novo.`;
  }
  return `Não foi possível ${acao}. Tente de novo em instantes.`;
}
