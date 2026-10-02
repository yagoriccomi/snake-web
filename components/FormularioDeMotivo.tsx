'use client';

import { useId, useState } from 'react';

import { mensagemDaJustificativa } from '@/lib/erros';
import { TAMANHO_MAXIMO_DA_JUSTIFICATIVA } from '@/lib/justificativas';

import estilos from './FormularioDeJustificativa.module.css';

/**
 * Texto obrigatório da justificativa, com o contador do limite do banco. Serve
 * à falta da aula, à semana do livre e ao reenvio; quem chama decide qual RPC.
 *
 * Sem anexo até o G2: as rotas novas do servidor ainda não estão em produção.
 */
export function FormularioDeJustificativa({
  titulo,
  contexto,
  rotuloDoEnvio = 'Enviar justificativa',
  onEnviar,
  onFechar,
}: {
  titulo: string;
  /** Uma linha sobre o que se justifica (a aula, a semana, a última tentativa). */
  contexto?: string;
  rotuloDoEnvio?: string;
  /** Lança o erro para o formulário mostrar; resolve quando o banco aceitou. */
  onEnviar: (texto: string) => Promise<void>;
  onFechar: () => void;
}): React.JSX.Element {
  const campo = useId();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (): Promise<void> => {
    setEnviando(true);
    setErro(null);
    try {
      await onEnviar(texto);
    } catch (falha) {
      setErro(mensagemDaJustificativa(falha));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={estilos.formulario}>
      <p className={estilos.titulo}>{titulo}</p>
      {contexto !== undefined ? <p className={estilos.contexto}>{contexto}</p> : null}
      <label className={estilos.rotulo} htmlFor={campo}>
        Motivo da falta
      </label>
      <textarea
        id={campo}
        className={estilos.area}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={TAMANHO_MAXIMO_DA_JUSTIFICATIVA}
        rows={3}
        placeholder="Conte o motivo da falta (obrigatório)"
        required
        disabled={enviando}
      />
      <p className={estilos.contador}>
        {texto.length}/{TAMANHO_MAXIMO_DA_JUSTIFICATIVA}
      </p>
      {erro !== null ? (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div className={estilos.acoes}>
        <button
          className={estilos.primario}
          type="button"
          onClick={() => void enviar()}
          disabled={enviando || texto.trim() === ''}
        >
          {enviando ? 'Enviando…' : rotuloDoEnvio}
        </button>
        <button className={estilos.secundario} type="button" onClick={onFechar} disabled={enviando}>
          Agora não
        </button>
      </div>
    </div>
  );
}
