import { describe, expect, it } from 'vitest';

import {
  ErroDeValidacao,
  FRASE_DE_CONEXAO_DA_JUSTIFICATIVA,
  FRASE_DE_CONEXAO_DO_AVISO,
  mensagemDaJustificativa,
  mensagemDoAviso,
} from '@/lib/erros';

// Frases da § 15 do contrato, como o banco as devolve (`raise exception … using errcode = '23514'`).
const TROCOU_A_AULA = 'Você trocou esta aula por outra.';
const AULA_TROCADA = 'Esta aula foi trocada. Se faltar à aula nova, justifique a aula nova.';

/** Erro como o supabase-js devolve: objeto simples, não `Error`. */
function erroDoBanco(code: string, message: string) {
  return { code, message, details: null, hint: null };
}

const ERRO_DE_REDE = {
  code: '',
  message: 'TypeError: Failed to fetch',
  details: 'TypeError: Failed to fetch',
  hint: '',
};

describe('mensagemDoAviso', () => {
  it('mostra a frase do banco quando o Vou / Não vou é recusado com 23514', () => {
    expect(mensagemDoAviso(erroDoBanco('23514', TROCOU_A_AULA))).toBe(TROCOU_A_AULA);
  });

  it('mantém a frase de conexão quando a rede falha', () => {
    expect(mensagemDoAviso(ERRO_DE_REDE)).toBe(FRASE_DE_CONEXAO_DO_AVISO);
  });

  it('mantém a frase de conexão quando o código não é 23514', () => {
    expect(
      mensagemDoAviso(erroDoBanco('42501', 'new row violates row-level security policy')),
    ).toBe(FRASE_DE_CONEXAO_DO_AVISO);
  });

  it('mantém a frase de conexão quando o 23514 chega sem frase', () => {
    expect(mensagemDoAviso(erroDoBanco('23514', '   '))).toBe(FRASE_DE_CONEXAO_DO_AVISO);
  });

  it('mantém a frase de conexão quando o erro não tem forma conhecida', () => {
    expect(mensagemDoAviso(null)).toBe(FRASE_DE_CONEXAO_DO_AVISO);
    expect(mensagemDoAviso('falhou')).toBe(FRASE_DE_CONEXAO_DO_AVISO);
    expect(mensagemDoAviso(new Error('Você trocou esta aula por outra.'))).toBe(
      FRASE_DE_CONEXAO_DO_AVISO,
    );
  });
});

describe('mensagemDaJustificativa', () => {
  it('mostra a frase do banco quando a justificativa é recusada com 23514', () => {
    expect(mensagemDaJustificativa(erroDoBanco('23514', AULA_TROCADA))).toBe(AULA_TROCADA);
  });

  it('mantém a frase de conexão quando a rede falha', () => {
    expect(mensagemDaJustificativa(ERRO_DE_REDE)).toBe(FRASE_DE_CONEXAO_DA_JUSTIFICATIVA);
  });

  it('mantém a frase de conexão quando o código não é 23514', () => {
    expect(mensagemDaJustificativa(erroDoBanco('42501', 'permission denied'))).toBe(
      FRASE_DE_CONEXAO_DA_JUSTIFICATIVA,
    );
  });

  it('mostra o texto da validação local, que já é escrito para o aluno', () => {
    expect(mensagemDaJustificativa(new ErroDeValidacao('Escreva o motivo da falta.'))).toBe(
      'Escreva o motivo da falta.',
    );
  });

  it('mantém a frase de conexão quando o navegador lança um erro qualquer', () => {
    expect(mensagemDaJustificativa(new TypeError('Failed to fetch'))).toBe(
      FRASE_DE_CONEXAO_DA_JUSTIFICATIVA,
    );
  });
});
