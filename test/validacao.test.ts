import { describe, expect, it } from 'vitest';

import {
  apenasDigitos,
  celularEhValido,
  cpfEhValido,
  dataBrParaIso,
  faltaNaSenha,
  mascararCelular,
  mascararCpf,
  mascararData,
  nomeEhValido,
  senhaEhForte,
} from '@/lib/validacao';

/**
 * O Supabase recusa senha com menos de 6 caracteres (padrão, sem política
 * extra no config.toml). A web precisa ser MAIS exigente que ele: se aceitasse
 * uma senha que o Supabase recusa, o primeiro acesso falharia no meio.
 */
const MINIMO_DO_SUPABASE = 6;

const SENHAS = ['Abc12345!', 'abc12345!', 'ABC12345!', 'Abcdefgh!', 'Abc12345', 'Ab1!', 'Aa1!aaaa', ''];

describe('senhaEhForte', () => {
  it('aceita senha com 8 caracteres, maiúscula, minúscula, número e símbolo', () => {
    expect(senhaEhForte('Aa1!aaaa')).toBe(true);
  });

  it.each([
    ['sem maiúscula', 'abc12345!'],
    ['sem minúscula', 'ABC12345!'],
    ['sem número', 'Abcdefgh!'],
    ['sem símbolo', 'Abc12345'],
    ['com menos de 8 caracteres', 'Ab1!'],
  ])('recusa senha %s', (_caso, senha) => {
    expect(senhaEhForte(senha)).toBe(false);
  });

  it('nunca aceita uma senha que o Supabase recusaria', () => {
    for (const senha of SENHAS.filter(senhaEhForte)) {
      expect(senha.length).toBeGreaterThanOrEqual(MINIMO_DO_SUPABASE);
    }
  });

  it('concorda com faltaNaSenha: forte quando não falta nada', () => {
    for (const senha of SENHAS) {
      expect(senhaEhForte(senha)).toBe(faltaNaSenha(senha).length === 0);
    }
  });
});

describe('faltaNaSenha', () => {
  it('lista cada exigência que falta', () => {
    expect(faltaNaSenha('abc')).toEqual([
      'pelo menos 8 caracteres',
      'uma letra maiúscula',
      'um número',
      'um símbolo',
    ]);
  });
});

describe('cpfEhValido', () => {
  it('aceita CPF com dígitos verificadores certos, com ou sem máscara', () => {
    expect(cpfEhValido('52998224725')).toBe(true);
    expect(cpfEhValido('529.982.247-25')).toBe(true);
  });

  it('recusa CPF com dígito verificador errado', () => {
    expect(cpfEhValido('52998224726')).toBe(false);
  });

  it('recusa CPF com todos os dígitos iguais', () => {
    expect(cpfEhValido('11111111111')).toBe(false);
  });

  it('recusa CPF com quantidade de dígitos diferente de 11', () => {
    expect(cpfEhValido('5299822472')).toBe(false);
  });
});

describe('celularEhValido', () => {
  it('aceita 10 ou 11 dígitos, com ou sem máscara', () => {
    expect(celularEhValido('(11) 98765-4321')).toBe(true);
    expect(celularEhValido('1133334444')).toBe(true);
  });

  it('recusa número sem DDD', () => {
    expect(celularEhValido('987654321')).toBe(false);
  });
});

describe('dataBrParaIso', () => {
  it('converte DD/MM/AAAA para AAAA-MM-DD', () => {
    expect(dataBrParaIso('31/01/1990')).toBe('1990-01-31');
  });

  it('recusa data que não existe, como 31/02', () => {
    expect(dataBrParaIso('31/02/1990')).toBeNull();
  });

  it('recusa data no futuro', () => {
    const ano = new Date().getFullYear() + 1;
    expect(dataBrParaIso(`01/01/${String(ano)}`)).toBeNull();
  });

  it('recusa ano antes de 1900 e data incompleta', () => {
    expect(dataBrParaIso('01/01/1899')).toBeNull();
    expect(dataBrParaIso('01/01/90')).toBeNull();
  });
});

describe('nomeEhValido', () => {
  it('exige pelo menos 3 letras, acentos incluídos', () => {
    expect(nomeEhValido('Zé Á')).toBe(true);
    expect(nomeEhValido(' A1 ')).toBe(false);
  });
});

describe('máscaras', () => {
  it('formatam CPF, celular e data enquanto a pessoa digita', () => {
    expect(mascararCpf('52998224725')).toBe('529.982.247-25');
    expect(mascararCelular('11987654321')).toBe('(11) 98765-4321');
    expect(mascararCelular('1133334444')).toBe('(11) 3333-4444');
    expect(mascararData('31011990')).toBe('31/01/1990');
    expect(apenasDigitos('529.982.247-25')).toBe('52998224725');
  });
});
