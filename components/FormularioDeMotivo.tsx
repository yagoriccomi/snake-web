'use client';

import { useId, useState } from 'react';

import { mensagemDaJustificativa } from '@/lib/erros';
import { TAMANHO_MAXIMO_DA_JUSTIFICATIVA } from '@/lib/justificativas';

import estilos from './FormularioDeMotivo.module.css';

/**
 * Texto obrigatório com o contador do limite do banco: a justificativa (falta
 * da aula, semana do livre, reenvio) e o motivo do "Eu estava na aula". Quem
 * chama decide qual RPC; o padrão é o da justificativa.
 *
 * Sem anexo até o G2: as rotas novas do servidor ainda não estão em produção.
 */
export function FormularioDeMotivo({
  titulo,
  contexto,
  rotulo = 'Motivo da falta',
  dica = 'Conte o motivo da falta (obrigatório)',
  limite = TAMANHO_MAXIMO_DA_JUSTIFICATIVA,
  rotuloDoEnvio = 'Enviar justificativa',
  rotuloDoFechar = 'Agora não',
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
        disabled={enviando}
      />
      <p className={estilos.contador}>
        {texto.length}/{limite}
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
          {rotuloDoFechar}
        </button>
      </div>
    </div>
  );
}
