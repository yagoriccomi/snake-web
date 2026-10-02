'use client';

import { useCallback, useEffect, useState } from 'react';

import { FormularioDeJustificativa } from '@/components/FormularioDeJustificativa';
import { Protegida } from '@/components/Protegida';
import { diaEMesDoInstante } from '@/lib/aulas';
import {
  assuntoDaJustificativa,
  buscarMinhasJustificativas,
  reenviarJustificativa,
  rotuloDaJustificativa,
  type MinhaJustificativa,
} from '@/lib/justificativas';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

/**
 * Minhas justificativas (`minhas_justificativas`, § 9.1): o estado de cada
 * uma com os rótulos da § 3 e o reenvio da primeira negada (D42). O banco
 * decide se ainda dá para reenviar (`can_resend`) e até quando.
 */
export default function PaginaDeJustificativas(): React.JSX.Element {
  return <Protegida etapa="aluno">{() => <Justificativas />}</Protegida>;
}

function Justificativas(): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [lista, setLista] = useState<MinhaJustificativa[]>([]);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLista(await buscarMinhasJustificativas(supabase));
      setEstado('pronto');
    } catch {
      setEstado('erro');
    }
  }, []);

  // O estado só muda depois da rede, nunca no corpo do efeito: nada de render em cascata.
  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  const reenviar = async (id: string, texto: string): Promise<void> => {
    await reenviarJustificativa(supabase, id, texto);
    setReenviando(null);
    setRecado('Justificativa reenviada. A academia vai analisar.');
    await carregar();
  };

  if (estado === 'carregando') {
    return (
      <main className={estilos.aviso} role="status">
        Carregando…
      </main>
    );
  }

  if (estado === 'erro') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>Não foi possível carregar</h1>
        <p className={estilos.texto}>Verifique sua internet e tente de novo.</p>
        <button className={estilos.botaoSecundario} type="button" onClick={() => void carregar()}>
          Tentar de novo
        </button>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <header>
        <a className={estilos.link} href="/aulas">
          ← Aulas
        </a>
        <h1 className={estilos.titulo}>Minhas justificativas</h1>
      </header>

      {recado !== null ? (
        <p className={estilos.recado} role="status">
          {recado}
        </p>
      ) : null}

      {lista.length === 0 ? (
        <p className={estilos.vazio}>Você ainda não enviou nenhuma justificativa.</p>
      ) : (
        <ul className={estilos.lista}>
          {lista.map((j) => (
            <li className={estilos.cartao} key={j.id}>
              <p className={estilos.assunto}>{assuntoDaJustificativa(j)}</p>
              {j.mensagem !== null ? <p className={estilos.mensagem}>{j.mensagem}</p> : null}
              <p className={estilos.estado} data-situacao={j.situacao}>
                {rotuloDaJustificativa(j)}
              </p>
              {j.podeReenviar && j.reenviarAte !== null && reenviando !== j.id ? (
                <button
                  className={estilos.botaoLink}
                  type="button"
                  onClick={() => {
                    setRecado(null);
                    setReenviando(j.id);
                  }}
                >
                  {`Reenviar até ${diaEMesDoInstante(j.reenviarAte)}`}
                </button>
              ) : null}
              {reenviando === j.id ? (
                <FormularioDeJustificativa
                  titulo="Reenviar a justificativa"
                  contexto={`${assuntoDaJustificativa(j)} · é a última tentativa.`}
                  rotuloDoEnvio="Reenviar"
                  onEnviar={(texto) => reenviar(j.id, texto)}
                  onFechar={() => setReenviando(null)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
