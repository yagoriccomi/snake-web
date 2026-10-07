/**
 * Que frase o aluno lê quando uma gravação falha.
 *
 * Mora fora de `lib/dados.ts` para não depender do cliente do Supabase: é
 * regra pura, testada sem rede e sem variáveis de ambiente.
 */

/**
 * `check_violation` do Postgres. O banco usa esse código quando recusa por
 * regra de negócio, e a `message` já vem escrita para o aluno (contrato § 15:
 * "Você trocou esta aula por outra.", "Esta aula foi trocada…"). Nos outros
 * códigos a mensagem é técnica e não vai para a tela.
 */
const RECUSA_COM_FRASE = '23514';

export const FRASE_DE_CONEXAO_DO_AVISO =
  'Não foi possível avisar. Verifique a conexão e tente de novo.';
export const FRASE_DE_CONEXAO_DA_JUSTIFICATIVA =
  'Não foi possível enviar. Verifique a conexão e tente de novo.';

/** Erro de preenchimento que a própria web detecta antes de ir ao banco. */
export class ErroDeValidacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeValidacao';
  }
}

/** A frase do banco, se a falha for uma recusa `23514` com frase; senão, nula. */
function fraseDaRecusa(falha: unknown): string | null {
  if (typeof falha !== 'object' || falha === null) return null;
  const { code, message } = falha as { code?: unknown; message?: unknown };
  if (code !== RECUSA_COM_FRASE || typeof message !== 'string') return null;
  const frase = message.trim();
  return frase === '' ? null : frase;
}

/** Vou / Não vou. */
export function mensagemDoAviso(falha: unknown): string {
  return fraseDaRecusa(falha) ?? FRASE_DE_CONEXAO_DO_AVISO;
}

/** Envio da justificativa. */
export function mensagemDaJustificativa(falha: unknown): string {
  if (falha instanceof ErroDeValidacao) return falha.message;
  return fraseDaRecusa(falha) ?? FRASE_DE_CONEXAO_DA_JUSTIFICATIVA;
}
