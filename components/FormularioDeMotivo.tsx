'use client';

import { useId, useRef, useState } from 'react';

import { CampoDeAnexos } from '@/components/CampoDeAnexos';
import { enviarAnexos, type EtapasDoEnvio, type FalhaDoAnexo } from '@/lib/anexos';
import { mensagemDaFalha } from '@/lib/erros';
import { TAMANHO_MAXIMO_DA_JUSTIFICATIVA } from '@/lib/justificativas';

import estilos from './FormularioDeMotivo.module.css';

type Fase =
  | { tipo: 'editando'; erro: string | null }
  | { tipo: 'enviando'; progresso: string | null }
  | { tipo: 'falhaNoAnexo'; falhas: FalhaDoAnexo[]; indisponivel: boolean }
  | { tipo: 'falhaNaConclusao'; erro: string; faltouAnexo: boolean };

const EDITANDO: Fase = { tipo: 'editando', erro: null };

/** O título do aviso quando um ou mais anexos não foram. */
export function avisoDosAnexos(falhas: number, indisponivel: boolean): string {
  if (indisponivel) {
    return 'O envio de arquivos não está disponível agora. O texto já foi registrado e pode seguir sem o anexo.';
  }
  return falhas === 1
    ? 'O texto já foi registrado, mas um anexo não foi enviado.'
    : `O texto já foi registrado, mas ${falhas} anexos não foram enviados.`;
}

/**
 * Texto obrigatório com o contador do limite do banco: a justificativa (falta
 * da aula, semana do livre, reenvio) e o motivo do "Eu estava na aula". Quem
 * chama decide qual RPC; o padrão é o da justificativa.
 *
 * Com `maximoDeAnexos`, o envio vai em três tempos (§ 8 e § 9.1): o texto
 * cria o registro, os anexos vão um a um, e só então o envio se conclui. O
 * registro já existe quando um anexo falha, então o texto fica travado e a
 * pessoa escolhe entre tentar de novo e seguir sem ele — nunca um envio
 * meio feito sem aviso.
 */
export function FormularioDeMotivo({
  titulo,
  contexto,
  rotulo = 'Motivo da falta',
  dica = 'Conte o motivo da falta (obrigatório)',
  limite = TAMANHO_MAXIMO_DA_JUSTIFICATIVA,
  rotuloDoEnvio = 'Enviar justificativa',
  rotuloDoFechar = 'Agora não',
  maximoDeAnexos = 0,
  onEnviar,
  onFechar,
}: {
  titulo: string;
  /** Uma linha sobre o que se envia (a aula, a semana, a última tentativa). */
  contexto?: string;
  rotulo?: string;
  dica?: string;
  limite?: number;
  rotuloDoEnvio?: string;
  rotuloDoFechar?: string;
  /** Sem ele (ou 0), o formulário não mostra o campo de anexo. */
  maximoDeAnexos?: number;
  /**
   * Grava o texto; lança o erro para o formulário mostrar. Com anexo, devolve
   * as etapas seguintes; sem, resolve quando o banco aceitou.
   */
  onEnviar: (texto: string) => Promise<EtapasDoEnvio | void>;
  onFechar: () => void;
}): React.JSX.Element {
  const campo = useId();
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState<File[]>([]);
  const [fase, setFase] = useState<Fase>(EDITANDO);
  // As etapas valem entre as tentativas: o registro já foi criado uma vez.
  const etapas = useRef<EtapasDoEnvio | null>(null);

  const concluir = async (faltouAnexo: boolean): Promise<void> => {
    if (etapas.current === null) return;
    setFase({ tipo: 'enviando', progresso: null });
    try {
      await etapas.current.concluir(faltouAnexo);
      setFase(EDITANDO);
    } catch (falha) {
      setFase({ tipo: 'falhaNaConclusao', erro: mensagemDaFalha(falha, 'concluir'), faltouAnexo });
    }
  };

  const enviarOsAnexos = async (pendentes: readonly File[]): Promise<void> => {
    if (etapas.current === null) return;
    const { falhas, indisponivel } = await enviarAnexos(
      etapas.current.anexar,
      pendentes,
      (indice, total) =>
        setFase({ tipo: 'enviando', progresso: `Enviando anexo ${indice + 1} de ${total}…` }),
    );
    if (falhas.length > 0) {
      setFase({ tipo: 'falhaNoAnexo', falhas, indisponivel });
      return;
    }
    await concluir(false);
  };

  const enviar = async (): Promise<void> => {
    setFase({ tipo: 'enviando', progresso: null });
    let seguintes: EtapasDoEnvio | void;
    try {
      seguintes = await onEnviar(texto);
    } catch (falha) {
      setFase({ tipo: 'editando', erro: mensagemDaFalha(falha, 'enviar') });
      return;
    }
    if (seguintes === undefined) {
      setFase(EDITANDO);
      return;
    }
    etapas.current = seguintes;
    await enviarOsAnexos(anexos);
  };

  const editando = fase.tipo === 'editando';
  const semCloudinary = fase.tipo === 'falhaNoAnexo' && fase.indisponivel;

  return (
    <div className={estilos.formulario}>
      <p className={estilos.titulo}>{titulo}</p>
      {contexto !== undefined ? <p className={estilos.contexto}>{contexto}</p> : null}
      <label className={estilos.rotulo} htmlFor={campo}>
        {rotulo}
      </label>
      <textarea
        id={campo}
        className={estilos.area}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={limite}
        rows={3}
        placeholder={dica}
        required
        disabled={!editando}
      />
      <p className={estilos.contador}>
        {texto.length}/{limite}
      </p>
      {maximoDeAnexos > 0 && !semCloudinary ? (
        <CampoDeAnexos
          arquivos={anexos}
          maximo={maximoDeAnexos}
          desabilitado={!editando}
          onMudar={setAnexos}
        />
      ) : null}
      {fase.tipo === 'editando' && fase.erro !== null ? (
        <p className={estilos.erro} role="alert">
          {fase.erro}
        </p>
      ) : null}
      {fase.tipo === 'enviando' && fase.progresso !== null ? (
        <p className={estilos.progresso} role="status">
          {fase.progresso}
        </p>
      ) : null}
      {fase.tipo === 'falhaNoAnexo' ? (
        <div className={estilos.erro} role="alert">
          <p className={estilos.avisoDoAnexo}>
            {avisoDosAnexos(fase.falhas.length, fase.indisponivel)}
          </p>
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
      ) : null}
      {fase.tipo === 'falhaNaConclusao' ? (
        <p className={estilos.erro} role="alert">
          {fase.erro}
        </p>
      ) : null}
      <div className={estilos.acoes}>
        <BotoesDaFase
          fase={fase}
          podeEnviar={texto.trim() !== ''}
          rotuloDoEnvio={rotuloDoEnvio}
          rotuloDoFechar={rotuloDoFechar}
          onEnviar={() => void enviar()}
          onTentarDeNovo={(pendentes) => void enviarOsAnexos(pendentes)}
          onConcluir={(faltouAnexo) => void concluir(faltouAnexo)}
          onFechar={onFechar}
        />
      </div>
    </div>
  );
}

/** Os dois botões de cada fase: o caminho para a frente e a saída. */
function BotoesDaFase({
  fase,
  podeEnviar,
  rotuloDoEnvio,
  rotuloDoFechar,
  onEnviar,
  onTentarDeNovo,
  onConcluir,
  onFechar,
}: {
  fase: Fase;
  podeEnviar: boolean;
  rotuloDoEnvio: string;
  rotuloDoFechar: string;
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
  return (
    <>
      <button
        className={estilos.primario}
        type="button"
        onClick={onEnviar}
        disabled={enviando || !podeEnviar}
      >
        {enviando ? 'Enviando…' : rotuloDoEnvio}
      </button>
      <button className={estilos.secundario} type="button" onClick={onFechar} disabled={enviando}>
        {rotuloDoFechar}
      </button>
    </>
  );
}
