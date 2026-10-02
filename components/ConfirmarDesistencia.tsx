'use client';

import { useId, useState } from 'react';

import { fraseDaRecusa } from '@/lib/erros';
import { TEXTOS_DA_TROCA } from '@/lib/trocas';

import estilos from './ConfirmarDesistencia.module.css';

const FRASE_DE_CONEXAO = 'Não foi possível desistir. Verifique a conexão e tente de novo.';

/**
 * Confirma **Desistir da troca** (§ 9.4, T36), como a folha do app: não tem
 * volta, e o banco confere se ainda dá (recusa com a frase dele).
 */
export function ConfirmarDesistencia({
  descricao,
  onDesistir,
  onVoltar,
}: {
  /** "Muay Thai · seg 06/10 19:00". */
  descricao: string;
  onDesistir: () => Promise<void>;
  onVoltar: () => void;
}): React.JSX.Element {
  const titulo = useId();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const desistir = async (): Promise<void> => {
    setEnviando(true);
    setErro(null);
    try {
      await onDesistir();
    } catch (falha) {
      setErro(fraseDaRecusa(falha) ?? FRASE_DE_CONEXAO);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className={estilos.confirmacao} aria-labelledby={titulo}>
      <h3 className={estilos.titulo} id={titulo}>
        Desistir da troca?
      </h3>
      <p className={estilos.texto}>{`${descricao}. ${TEXTOS_DA_TROCA.confirmarDesistencia}`}</p>
      {erro !== null ? (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div className={estilos.acoes}>
        <button className={estilos.secundario} type="button" onClick={onVoltar} disabled={enviando}>
          Voltar
        </button>
        <button className={estilos.perigo} type="button" onClick={() => void desistir()} disabled={enviando}>
          {enviando ? 'Desistindo…' : 'Desistir da troca'}
        </button>
      </div>
    </section>
  );
}
