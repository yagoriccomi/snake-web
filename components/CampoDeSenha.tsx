'use client';

import { useState, type InputHTMLAttributes } from 'react';

import estilos from './CampoDeSenha.module.css';

/** O que o campo e o botão mostram em cada estado (D35). */
export function apresentacaoDaSenha(visivel: boolean): {
  tipo: 'text' | 'password';
  rotuloDoBotao: string;
} {
  return visivel
    ? { tipo: 'text', rotuloDoBotao: 'Ocultar senha' }
    : { tipo: 'password', rotuloDoBotao: 'Mostrar senha' };
}

type PropriedadesDoCampo = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> & {
  /** Obrigatório: o `<label htmlFor>` da página e o `aria-controls` do botão apontam para ele. */
  id: string;
};

/**
 * Campo de senha com o botão de olho, o mesmo do aplicativo (D35): digitar
 * senha às cegas no celular é a maior fonte de erro de digitação.
 *
 * O nome do botão muda com o estado ("Mostrar senha" / "Ocultar senha") e por
 * isso ele não leva `aria-pressed`: os dois juntos fariam o leitor de tela
 * anunciar "Ocultar senha, pressionado", que confunde.
 */
export function CampoDeSenha({
  id,
  className,
  disabled,
  ...propriedades
}: PropriedadesDoCampo): React.JSX.Element {
  const [visivel, setVisivel] = useState(false);
  const { tipo, rotuloDoBotao } = apresentacaoDaSenha(visivel);

  return (
    <div className={estilos.envoltorio}>
      <input
        {...propriedades}
        id={id}
        className={`${className ?? ''} ${estilos.entrada}`.trim()}
        type={tipo}
        disabled={disabled}
        // Com a senha à mostra, o teclado do celular "corrigiria" o que se digita
        // e o corretor do navegador poderia mandar a senha para fora do aparelho.
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
      />
      <button
        className={estilos.olho}
        type="button"
        aria-label={rotuloDoBotao}
        aria-controls={id}
        onClick={() => setVisivel((atual) => !atual)}
        disabled={disabled}
      >
        {visivel ? <IconeOlhoRiscado /> : <IconeOlho />}
      </button>
    </div>
  );
}

function IconeOlho(): React.JSX.Element {
  return (
    <svg className={estilos.icone} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeOlhoRiscado(): React.JSX.Element {
  return (
    <svg className={estilos.icone} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
