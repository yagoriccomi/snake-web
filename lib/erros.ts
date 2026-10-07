/**
 * Que frase o aluno lê quando uma gravação ou uma leitura falha.
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
  | 'concluir'
  | 'preparar o envio';

/**
 * A frase da web para cada `code` do servidor (contrato v6, § 13.6). A web
 * decide pelo `code`, nunca pelo texto que o servidor manda (regra 1): o do
 * `bad_input` cita o nome do campo, que não é texto para o aluno.
 *
 * `bad_request` e `internal_error` ficam de fora de propósito: são os
 * genéricos de cada categoria (regra 2) e caem na genérica da web.
 */
const MENSAGEM_DO_CODIGO_DO_SERVIDOR: Readonly<Record<string, string>> = {
  // Comuns a todas as rotas.
  malformed_json: 'A página enviou um pedido com defeito. Atualize a página e tente de novo.',
  bad_input: 'A página enviou um dado que não é válido. Atualize a página e tente de novo.',
  payload_too_large: 'O pedido ficou grande demais para o servidor.',
  no_token: 'Sua sessão expirou. Entre de novo para continuar.',
  bad_token_format: 'Não reconhecemos a sua sessão. Entre de novo para continuar.',
  bad_token: 'Sua sessão não vale mais. Entre de novo para continuar.',
  route_not_found: 'Esta função não está disponível agora. Atualize a página e tente de novo.',
  rate_limited: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  // Falha do Supabase: 503 e 504 valem nova tentativa; 502 não resolve tentando agora.
  supabase_unreachable:
    'Não conseguimos falar com o servidor de dados. Tente de novo em instantes.',
  supabase_timeout: 'O servidor de dados demorou demais para responder. Tente de novo.',
  supabase_invalid_response:
    'O servidor de dados respondeu de forma inesperada. Se continuar, fale com a academia.',
  // De cada rota.
  forbidden: 'Você não tem acesso a este item.',
  proof_not_found: 'Este pagamento não tem comprovante.',
  proof_not_on_cloudinary: 'Este comprovante está no armazenamento antigo e não abre por aqui.',
  justification_not_pending: 'Esta justificativa já foi decidida e não aceita anexo.',
  justification_already_has_attachment: 'Esta justificativa já tem anexo.',
  justification_attachment_not_found: 'Esta justificativa não tem anexo.',
  justification_attachment_not_on_cloudinary:
    'Este anexo da justificativa está no armazenamento antigo e não abre por aqui.',
  justification_attachment_path_mismatch:
    'O anexo desta justificativa não está no lugar esperado. Fale com a academia.',
  motivo_attachment_not_on_cloudinary:
    'Este anexo do pedido está no armazenamento antigo e não abre por aqui.',
};

/**
 * Sem `code`, a resposta não saiu do handler do servidor (por exemplo, da
 * Render na frente dele). O status decide só onde a § 13.6 lhe dá um sentido
 * único para o aluno; 404, 409 e os 5xx têm mais de um e vão para a genérica.
 */
const CODIGO_DO_STATUS: Readonly<Record<number, string>> = {
  401: 'bad_token',
  403: 'forbidden',
  413: 'payload_too_large',
  429: 'rate_limited',
};

/** O que a web sabe de uma resposta de erro do `snake-server`. */
export interface RespostaDoServidor {
  status: number;
  /** O `code` do corpo; vazio quando o corpo não é o JSON do servidor. */
  code: string;
}

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

/** A mensagem própria da falha; `null` quando ela não é identificada. */
function mensagemIdentificada(falha: unknown): string | null {
  if (falha instanceof ErroDeValidacao) return falha.message;
  const codigo = campo(falha, 'code');
  return fraseDoBanco(codigo, campo(falha, 'message')) ?? mensagemDoCodigo(codigo, falha);
}

/**
 * A frase da tela para uma falha qualquer.
 *
 * @param falha O que o `catch` recebeu: `ErroDeValidacao`, erro do supabase-js ou do navegador.
 * @param acao  O que o aluno tentava fazer, para a frase de conexão e a genérica.
 */
export function mensagemDaFalha(falha: unknown, acao: AcaoQueFalhou): string {
  const identificada = mensagemIdentificada(falha);
  if (identificada !== null) return identificada;

  if (ehFalhaDeRede(falha)) {
    return `Não foi possível ${acao}. Verifique a conexão e tente de novo.`;
  }
  return mensagemGenerica(acao);
}

/**
 * O que a tela de leitura diz depois de "Não foi possível carregar" (D28).
 *
 * Mesma regra da D20, sem repetir o "Não foi possível" que o título ou o
 * começo da frase já dizem. Só a falha de rede pede para conferir a
 * internet: mandar conferir a conexão quando o banco recusou seria pista falsa.
 *
 * @param falha O que o `catch` da leitura recebeu; `null` quando não há falha a mostrar.
 */
export function motivoDaFalhaDeLeitura(falha: unknown): string {
  const identificada = mensagemIdentificada(falha);
  if (identificada !== null) return identificada;

  if (ehFalhaDeRede(falha)) return 'Verifique sua internet e tente de novo.';
  return 'Tente de novo em instantes.';
}

function mensagemGenerica(acao: AcaoQueFalhou): string {
  return `Não foi possível ${acao}. Tente de novo em instantes.`;
}

/**
 * O `code` de um corpo de erro do servidor (`{ error, code, traceId }`);
 * vazio quando o corpo não tem esse formato.
 *
 * @param corpo O JSON da resposta, ou `null` quando ele não pôde ser lido.
 */
export function codigoDoCorpo(corpo: unknown): string {
  return campo(corpo, 'code');
}

/**
 * A frase da tela para uma resposta de erro do `snake-server`.
 *
 * @param resposta O status e o `code` do corpo.
 * @param acao     O que o aluno tentava fazer, para a genérica.
 */
export function mensagemDoServidor(resposta: RespostaDoServidor, acao: AcaoQueFalhou): string {
  const codigo = resposta.code !== '' ? resposta.code : (CODIGO_DO_STATUS[resposta.status] ?? '');
  // O `code` vem de fora, e "constructor" não pode achar o protótipo. Sem
  // `Object.hasOwn`: celular com Safari anterior ao 15.4 não o tem.
  return Object.prototype.hasOwnProperty.call(MENSAGEM_DO_CODIGO_DO_SERVIDOR, codigo)
    ? MENSAGEM_DO_CODIGO_DO_SERVIDOR[codigo]
    : mensagemGenerica(acao);
}
