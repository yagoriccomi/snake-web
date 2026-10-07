'use client';

import { useId, useRef, useState } from 'react';

import { ACEITE_DO_ANEXO, problemaNoAnexo, TAMANHO_MAXIMO_DO_ANEXO_MB } from '@/lib/anexos';

import estilos from './CampoDeAnexos.module.css';

/** A dica abaixo do rótulo: tudo o que a pessoa precisa saber antes de escolher. */
export function dicaDosAnexos(maximo: number): string {
  const formatos = `Opcional. JPG, PNG, WEBP, HEIC ou PDF, até ${TAMANHO_MAXIMO_DO_ANEXO_MB} MB.`;
  return maximo > 1 ? `${formatos} Até ${maximo} arquivos.` : formatos;
}

/**
 * Junta à lista o que a pessoa escolheu, até o máximo. O arquivo que não
 * serve fica de fora e vira a frase do aviso; os outros entram.
 */
export function juntarAnexos(
  atuais: readonly File[],
  escolhidos: readonly File[],
  maximo: number,
): { arquivos: File[]; problema: string | null } {
  const arquivos = [...atuais];
  let problema: string | null = null;
  for (const arquivo of escolhidos) {
    const doArquivo = problemaNoAnexo(arquivo);
    if (doArquivo !== null) {
      problema = `${arquivo.name}: ${doArquivo}`;
      continue;
    }
    if (arquivos.length >= maximo) {
      problema = `Você pode anexar até ${maximo} ${maximo === 1 ? 'arquivo' : 'arquivos'}.`;
      break;
    }
    arquivos.push(arquivo);
  }
  return { arquivos, problema };
}

/**
 * O campo "Anexar arquivo" (contrato § 8 e § 9.1): um botão que abre o
 * seletor do aparelho e a lista do que já foi escolhido, cada um com o seu
 * "Remover". Só escolhe; quem envia é o formulário, depois do texto.
 *
 * O `<input type="file">` fica escondido porque o nativo não se deixa
 * traduzir nem ganhar 44 px; o botão visível é o que o teclado e o leitor de
 * tela alcançam.
 */
export function CampoDeAnexos({
  arquivos,
  maximo,
  desabilitado = false,
  onMudar,
}: {
  arquivos: readonly File[];
  maximo: number;
  desabilitado?: boolean;
  onMudar: (arquivos: File[]) => void;
}): React.JSX.Element {
  const rotulo = useId();
  const dica = useId();
  const seletor = useRef<HTMLInputElement>(null);
  const [problema, setProblema] = useState<string | null>(null);

  const escolher = (lista: FileList | null): void => {
    const resultado = juntarAnexos(arquivos, Array.from(lista ?? []), maximo);
    setProblema(resultado.problema);
    onMudar(resultado.arquivos);
    // Sem limpar, escolher de novo o mesmo arquivo (depois de removê-lo) não
    // dispararia o `change`.
    if (seletor.current !== null) seletor.current.value = '';
  };

  const remover = (indice: number): void => {
    setProblema(null);
    onMudar(arquivos.filter((_, i) => i !== indice));
  };

  return (
    <div className={estilos.campo}>
      <p className={estilos.rotulo} id={rotulo}>
        {maximo > 1 ? 'Anexos' : 'Anexo'}
      </p>
      <p className={estilos.dica} id={dica}>
        {dicaDosAnexos(maximo)}
      </p>
      {arquivos.length > 0 ? (
        <ul className={estilos.lista} aria-labelledby={rotulo}>
          {arquivos.map((arquivo, indice) => (
            <li className={estilos.item} key={`${indice}-${arquivo.name}`}>
              <IconeArquivo />
              <span className={estilos.nome}>{arquivo.name}</span>
              <button
                className={estilos.remover}
                type="button"
                aria-label={`Remover ${arquivo.name}`}
                onClick={() => remover(indice)}
                disabled={desabilitado}
              >
                <IconeFechar />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {arquivos.length < maximo ? (
        <button
          className={estilos.anexar}
          type="button"
          aria-describedby={dica}
          onClick={() => seletor.current?.click()}
          disabled={desabilitado}
        >
          <IconeClipe />
          Anexar arquivo
        </button>
      ) : null}
      <input
        ref={seletor}
        type="file"
        accept={ACEITE_DO_ANEXO}
        multiple={maximo > 1}
        hidden
        onChange={(e) => escolher(e.target.files)}
      />
      {problema !== null ? (
        <p className={estilos.erro} role="alert">
          {problema}
        </p>
      ) : null}
    </div>
  );
}

function IconeClipe(): React.JSX.Element {
  return (
    <svg className={estilos.icone} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
    </svg>
  );
}

function IconeArquivo(): React.JSX.Element {
  return (
    <svg className={estilos.icone} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function IconeFechar(): React.JSX.Element {
  return (
    <svg className={estilos.icone} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
