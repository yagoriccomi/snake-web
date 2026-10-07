import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { apresentacaoDaSenha, CampoDeSenha } from '@/components/CampoDeSenha';

describe('apresentacaoDaSenha', () => {
  it('senha oculta: campo password e botão "Mostrar senha"', () => {
    expect(apresentacaoDaSenha(false)).toEqual({ tipo: 'password', rotuloDoBotao: 'Mostrar senha' });
  });

  it('senha visível: campo text e botão "Ocultar senha"', () => {
    expect(apresentacaoDaSenha(true)).toEqual({ tipo: 'text', rotuloDoBotao: 'Ocultar senha' });
  });
});

describe('CampoDeSenha', () => {
  const html = renderToStaticMarkup(
    createElement(CampoDeSenha, {
      id: 'senha',
      autoComplete: 'new-password',
      'aria-describedby': 'dica-da-senha',
      value: '',
      onChange: () => undefined,
    }),
  );

  it('nasce oculto e mantém o autoComplete e a descrição de quem chama', () => {
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('aria-describedby="dica-da-senha"');
  });

  it('o botão do olho não envia o formulário e aponta para o campo', () => {
    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toMatch(/<button[^>]*aria-label="Mostrar senha"/);
    expect(html).toMatch(/<button[^>]*aria-controls="senha"/);
  });

  it('o ícone não é lido pelo leitor de tela', () => {
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('campo desabilitado desabilita também o botão', () => {
    const desabilitado = renderToStaticMarkup(
      createElement(CampoDeSenha, { id: 'senha', disabled: true, readOnly: true }),
    );
    expect(desabilitado).toMatch(/<button[^>]*disabled=""/);
  });
});
