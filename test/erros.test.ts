import { describe, expect, it } from 'vitest';

import { ErroDeValidacao, mensagemDaFalha } from '@/lib/erros';

// Frases do contrato v5, como o banco as devolve (`raise exception … using errcode = …`).
const TROCOU_A_AULA = 'Você trocou esta aula por outra.';
const ESCOLHA_O_TIPO = 'Escolha o tipo da troca.';
const TROCA_NAO_ENCONTRADA = 'Troca não encontrada.';
const SO_PARA_ALUNOS = 'Troca de aula é só para alunos.';

const CONEXAO_DO_AVISO = 'Não foi possível avisar. Verifique a conexão e tente de novo.';
const GENERICA_DO_AVISO = 'Não foi possível avisar. Tente de novo em instantes.';

/** Erro como o supabase-js devolve: objeto simples, não `Error`. */
function erroDoBanco(code: string, message: string, details: string | null = null) {
  return { code, message, details, hint: null };
}

const ERRO_DE_REDE = {
  code: '',
  message: 'TypeError: Failed to fetch',
  details: 'TypeError: Failed to fetch',
  hint: '',
};

describe('mensagemDaFalha — frase do banco', () => {
  it('mostra a frase do banco em cada código que o contrato usa com frase', () => {
    expect(mensagemDaFalha(erroDoBanco('23514', TROCOU_A_AULA), 'avisar')).toBe(TROCOU_A_AULA);
    expect(mensagemDaFalha(erroDoBanco('22023', ESCOLHA_O_TIPO), 'enviar')).toBe(ESCOLHA_O_TIPO);
    expect(mensagemDaFalha(erroDoBanco('P0002', TROCA_NAO_ENCONTRADA), 'desistir')).toBe(
      TROCA_NAO_ENCONTRADA,
    );
    expect(mensagemDaFalha(erroDoBanco('42501', SO_PARA_ALUNOS), 'enviar')).toBe(SO_PARA_ALUNOS);
  });

  it('tira os espaços das pontas da frase do banco', () => {
    expect(mensagemDaFalha(erroDoBanco('23514', `  ${TROCOU_A_AULA} `), 'avisar')).toBe(
      TROCOU_A_AULA,
    );
  });
});

describe('mensagemDaFalha — código identificado sem frase', () => {
  it('não mostra a mensagem nativa da RLS e usa a do 42501', () => {
    expect(
      mensagemDaFalha(erroDoBanco('42501', 'new row violates row-level security policy'), 'avisar'),
    ).toBe('Você não tem permissão para esta ação.');
  });

  it('não mostra a mensagem nativa da constraint e usa a do 23514', () => {
    expect(
      mensagemDaFalha(
        erroDoBanco('23514', 'new row for relation "x" violates check constraint "y"'),
        'salvar',
      ),
    ).toBe('Algum dado não atende às regras. Confira e tente de novo.');
  });

  it('usa a mensagem própria quando o código chega com a frase vazia', () => {
    expect(mensagemDaFalha(erroDoBanco('22023', '   '), 'enviar')).toBe(
      'Algum dado enviado não é válido. Confira e tente de novo.',
    );
    expect(mensagemDaFalha(erroDoBanco('P0002', ''), 'desistir')).toBe(
      'Não encontramos o que você pediu. Atualize a página e tente de novo.',
    );
  });

  it('diz que o CPF já está cadastrado quando o 23505 é do CPF', () => {
    expect(
      mensagemDaFalha(
        erroDoBanco('23505', 'duplicate key value violates unique constraint "profiles_cpf_key"'),
        'concluir',
      ),
    ).toBe('Este CPF já está cadastrado em outra conta.');
  });

  it('diz que já está registrado quando o 23505 é de outro campo', () => {
    const duplicado = erroDoBanco('23505', 'duplicate key value violates unique constraint "k"');
    expect(mensagemDaFalha(duplicado, 'salvar')).toBe('Isso já está registrado.');
  });
});

describe('mensagemDaFalha — validação local', () => {
  it('mostra o texto da validação, que já é escrito para o aluno', () => {
    expect(mensagemDaFalha(new ErroDeValidacao('Escreva o motivo da falta.'), 'enviar')).toBe(
      'Escreva o motivo da falta.',
    );
  });
});

describe('mensagemDaFalha — rede', () => {
  it('pede para conferir a conexão quando o supabase-js não alcança o banco', () => {
    expect(mensagemDaFalha(ERRO_DE_REDE, 'avisar')).toBe(CONEXAO_DO_AVISO);
  });

  it('pede para conferir a conexão quando o navegador lança o TypeError do fetch', () => {
    expect(mensagemDaFalha(new TypeError('Failed to fetch'), 'avisar')).toBe(CONEXAO_DO_AVISO);
  });

  it('pede para conferir a conexão quando o login não alcança o servidor de autenticação', () => {
    expect(
      mensagemDaFalha({ name: 'AuthRetryableFetchError', message: '{}', status: 0 }, 'concluir'),
    ).toBe('Não foi possível concluir. Verifique a conexão e tente de novo.');
  });
});

describe('mensagemDaFalha — não identificada', () => {
  it('cai na genérica quando o SQLSTATE não é conhecido', () => {
    expect(mensagemDaFalha(erroDoBanco('40001', 'could not serialize access'), 'avisar')).toBe(
      GENERICA_DO_AVISO,
    );
  });

  it('cai na genérica, sem mostrar a frase, quando um Error comum a traz', () => {
    expect(mensagemDaFalha(new Error(TROCOU_A_AULA), 'avisar')).toBe(GENERICA_DO_AVISO);
  });

  it('cai na genérica quando o erro não tem forma conhecida', () => {
    expect(mensagemDaFalha(null, 'avisar')).toBe(GENERICA_DO_AVISO);
    expect(mensagemDaFalha('falhou', 'avisar')).toBe(GENERICA_DO_AVISO);
  });

  it('completa a genérica com a ação que falhou', () => {
    expect(mensagemDaFalha(null, 'registrar seu aceite')).toBe(
      'Não foi possível registrar seu aceite. Tente de novo em instantes.',
    );
  });
});
