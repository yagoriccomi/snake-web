'use client';

import { useCallback, useEffect, useState } from 'react';

import { Protegida } from '@/components/Protegida';
import { formatarDiaEHora } from '@/lib/aulas';
import {
  buscarMinhasSolicitacoes,
  rotuloDoPedido,
  type MinhaSolicitacao,
} from '@/lib/solicitacoes';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

/**
 * Meus pedidos: o "Eu estava na aula" (`minhas_solicitacoes`, § 9.3). Quem
 * negou nunca aparece (D16). As trocas de aula entram aqui no 6.14.
 */
export default function PaginaDePedidos(): React.JSX.Element {
  return <Protegida etapa="aluno">{() => <Pedidos />}</Protegida>;
}

function Pedidos(): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [pedidos, setPedidos] = useState<MinhaSolicitacao[]>([]);

  const carregar = useCallback(async () => {
    try {
      setPedidos(await buscarMinhasSolicitacoes(supabase));
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
        <h1 className={estilos.titulo}>Meus pedidos</h1>
      </header>

      {pedidos.length === 0 ? (
        <p className={estilos.vazio}>Você ainda não fez nenhum pedido.</p>
      ) : (
        <ul className={estilos.lista}>
          {pedidos.map((pedido) => (
            <li className={estilos.cartao} key={pedido.id}>
              <p className={estilos.assunto}>Eu estava na aula</p>
              <p className={estilos.mensagem}>
                {`${pedido.tituloDaAula} · ${formatarDiaEHora(pedido.quandoDaAula)}`}
              </p>
              <p className={estilos.estado} data-situacao={pedido.situacao}>
                {rotuloDoPedido(pedido)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
