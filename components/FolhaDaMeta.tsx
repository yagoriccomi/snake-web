'use client';

import { useState } from 'react';

import { mensagemDaFalha } from '@/lib/erros';
import {
  definirMetaSemanal,
  META_MAXIMA,
  META_MINIMA,
  proximaSegunda,
  segundaEmTexto,
  type MetaDefinida,
} from '@/lib/meta';
import { supabase } from '@/lib/supabase';

import estilos from './FolhaDaMeta.module.css';

/**
 * "Meta da próxima semana" do à vontade, com os textos e a faixa do app
 * (`MetaSemanalSheet`). Abre dentro do cartão "Esta semana".
 */
export function FolhaDaMeta({
  metaDestaSemana,
  metaDaProxima,
  onFechar,
  onSalva,
}: {
  metaDestaSemana: number;
  /** A que já vale na semana que vem (a mesma, se ele nunca mudou). */
  metaDaProxima: number;
  onFechar: () => void;
  onSalva: (definida: MetaDefinida) => void;
}): React.JSX.Element {
  const [meta, setMeta] = useState(metaDaProxima);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (): Promise<void> => {
    setSalvando(true);
    setErro(null);
    try {
      onSalva(await definirMetaSemanal(supabase, meta));
    } catch (falha) {
      setErro(mensagemDaFalha(falha, 'salvar'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className={estilos.folha} aria-labelledby="titulo-da-meta">
      <h3 className={estilos.titulo} id="titulo-da-meta">
        Meta da próxima semana
      </h3>
      <div className={estilos.seletor}>
        <button
          className={estilos.passo}
          type="button"
          aria-label="Diminuir a meta"
          onClick={() => setMeta(meta - 1)}
          disabled={salvando || meta <= META_MINIMA}
        >
          −
        </button>
        <p className={estilos.valor} aria-live="polite">
          {meta === 1 ? '1 aula por semana' : `${meta} aulas por semana`}
        </p>
        <button
          className={estilos.passo}
          type="button"
          aria-label="Aumentar a meta"
          onClick={() => setMeta(meta + 1)}
          disabled={salvando || meta >= META_MAXIMA}
        >
          +
        </button>
      </div>
      <p className={estilos.dica}>
        {`Vale a partir de ${segundaEmTexto(proximaSegunda(new Date()))}. A meta desta semana continua ${metaDestaSemana}x. Para a próxima semana, você pode mudar até domingo às 23:59; sem mudança, a meta se repete.`}
      </p>
      <p className={estilos.dica}>
        A meta é só para você acompanhar: não gera alerta de frequência baixa.
      </p>
      {erro !== null ? (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div className={estilos.acoes}>
        <button
          className={estilos.secundario}
          type="button"
          onClick={onFechar}
          disabled={salvando}
        >
          Fechar
        </button>
        <button
          className={estilos.primario}
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
        >
          {salvando ? 'Salvando…' : 'Salvar meta'}
        </button>
      </div>
    </section>
  );
}
