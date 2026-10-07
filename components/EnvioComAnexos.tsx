'use client';

import type { FaseDoEnvio } from '@/hooks/useEnvioComAnexos';

import estilos from './EnvioComAnexos.module.css';

/** O título do aviso quando um ou mais anexos não foram. */
export function avisoDosAnexos(falhas: number, indisponivel: boolean): string {
  if (indisponivel) {
    return 'O envio de arquivos não está disponível agora. O texto já foi registrado e pode seguir sem o anexo.';
  }
  return falhas === 1
    ? 'O texto já foi registrado, mas um anexo não foi enviado.'
    : `O texto já foi registrado, mas ${falhas} anexos não foram enviados.`;
}

/** O que a fase tem a dizer: o erro, o progresso dos anexos ou o que falhou. */
export function MensagensDoEnvio({ fase }: { fase: FaseDoEnvio }): React.JSX.Element | null {
  if (fase.tipo === 'editando') {
    return fase.erro !== null ? (
      <p className={estilos.erro} role="alert">
        {fase.erro}
      </p>
    ) : null;
  }

  if (fase.tipo === 'enviando') {
    return fase.progresso !== null ? (
      <p className={estilos.progresso} role="status">
        {fase.progresso}
      </p>
    ) : null;
  }

  if (fase.tipo === 'falhaNaConclusao') {
    return (
      <p className={estilos.erro} role="alert">
        {fase.erro}
      </p>
    );
  }

  return (
    <div className={estilos.erro} role="alert">
      <p className={estilos.avisoDoAnexo}>{avisoDosAnexos(fase.falhas.length, fase.indisponivel)}</p>
      {fase.indisponivel ? null : (
        <ul className={estilos.falhas}>
          {fase.falhas.map(({ arquivo, mensagem }, indice) => (
            <li key={`${indice}-${arquivo.name}`}>
              {arquivo.name}: {mensagem}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Os dois botões de cada fase: o caminho para a frente e a saída. Sem
 * `rotuloDoEnvio`, só a saída (não há o que enviar).
 */
export function BotoesDoEnvio({
  fase,
  podeEnviar,
  rotuloDoEnvio,
  rotuloDoFechar,
  saidaPrimeiro = false,
  onEnviar,
  onTentarDeNovo,
  onConcluir,
  onFechar,
}: {
  fase: FaseDoEnvio;
  podeEnviar: boolean;
  rotuloDoEnvio: string | null;
  rotuloDoFechar: string;
  /** A folha da troca põe o "Voltar" à esquerda, como na prancheta. */
  saidaPrimeiro?: boolean;
  onEnviar: () => void;
  onTentarDeNovo: (pendentes: File[]) => void;
  onConcluir: (faltouAnexo: boolean) => void;
  onFechar: () => void;
}): React.JSX.Element {
  if (fase.tipo === 'falhaNoAnexo') {
    // Fechar aqui largaria o registro sem dizer o que houve com ele; as duas
    // saídas deixam claro se o anexo vai ou não.
    return (
      <>
        {fase.indisponivel ? null : (
          <button
            className={estilos.primario}
            type="button"
            onClick={() => onTentarDeNovo(fase.falhas.map((f) => f.arquivo))}
          >
            Tentar de novo
          </button>
        )}
        <button className={estilos.secundario} type="button" onClick={() => onConcluir(true)}>
          {fase.falhas.length === 1 ? 'Seguir sem o anexo' : 'Seguir sem esses anexos'}
        </button>
      </>
    );
  }

  if (fase.tipo === 'falhaNaConclusao') {
    return (
      <>
        <button
          className={estilos.primario}
          type="button"
          onClick={() => onConcluir(fase.faltouAnexo)}
        >
          Tentar de novo
        </button>
        <button className={estilos.secundario} type="button" onClick={onFechar}>
          {rotuloDoFechar}
        </button>
      </>
    );
  }

  const enviando = fase.tipo === 'enviando';
  const paraFrente =
    rotuloDoEnvio === null ? null : (
      <button
        className={estilos.primario}
        type="button"
        onClick={onEnviar}
        disabled={enviando || !podeEnviar}
      >
        {enviando ? 'Enviando…' : rotuloDoEnvio}
      </button>
    );
  const saida = (
    <button className={estilos.secundario} type="button" onClick={onFechar} disabled={enviando}>
      {rotuloDoFechar}
    </button>
  );
  return saidaPrimeiro ? (
    <>
      {saida}
      {paraFrente}
    </>
  ) : (
    <>
      {paraFrente}
      {saida}
    </>
  );
}
