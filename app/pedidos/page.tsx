'use client';

import { useCallback, useEffect, useState } from 'react';

import { BlocoDeContato } from '@/components/BlocoDeContato';
import { ConfirmarDesistencia } from '@/components/ConfirmarDesistencia';
import { Protegida } from '@/components/Protegida';
import { formatarDiaEHora } from '@/lib/aulas';
import {
  buscarMinhasSolicitacoes,
  rotuloDoPedido,
  type MinhaSolicitacao,
} from '@/lib/solicitacoes';
import { supabase } from '@/lib/supabase';
import {
  buscarMinhasTrocas,
  descricaoDaAulaDaTroca,
  desistirDaTroca,
  ROTULO_DO_TIPO,
  rotuloDaTroca,
  TEXTOS_DA_TROCA,
  type MinhaTroca,
} from '@/lib/trocas';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

/**
 * Meus pedidos: as trocas de aula (`minhas_trocas`, § 9.4) e o "Eu estava na
 * aula" (`minhas_solicitacoes`, § 9.3). Quem negou nunca aparece (D16).
 *
 * A web não tem push (§ 10): é aqui, no menu e em Aulas que o aluno de iPhone
 * fica sabendo da decisão.
 */
export default function PaginaDePedidos(): React.JSX.Element {
  return (
    <Protegida etapa="aluno" secao="aulas">
      {() => <Pedidos />}
    </Protegida>
  );
}

function Pedidos(): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [trocas, setTrocas] = useState<MinhaTroca[]>([]);
  const [pedidos, setPedidos] = useState<MinhaSolicitacao[]>([]);
  const [desistindo, setDesistindo] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [minhasTrocas, solicitacoes] = await Promise.all([
        buscarMinhasTrocas(supabase),
        buscarMinhasSolicitacoes(supabase),
      ]);
      setTrocas(minhasTrocas);
      setPedidos(solicitacoes);
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

  const desistir = async (id: string): Promise<void> => {
    await desistirDaTroca(supabase, id);
    setDesistindo(null);
    setRecado(TEXTOS_DA_TROCA.desistiu);
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
        <h1 className={estilos.titulo}>Meus pedidos</h1>
      </header>

      {recado !== null ? (
        <p className={estilos.recado} role="status">
          {recado}
        </p>
      ) : null}

      {trocas.length === 0 && pedidos.length === 0 ? (
        <p className={estilos.vazio}>Você ainda não fez nenhum pedido.</p>
      ) : null}

      {trocas.length > 0 ? (
        <section className={estilos.secao} aria-labelledby="trocas">
          <h2 className={estilos.tituloDaSecao} id="trocas">
            Trocas de aula
          </h2>
          <ul className={estilos.lista}>
            {trocas.map((troca) => (
              <li className={estilos.cartao} key={troca.id}>
                <p className={estilos.selos}>
                  <span className={estilos.selo}>{ROTULO_DO_TIPO[troca.tipo]}</span>
                  {troca.reposicao ? <span className={estilos.selo}>Reposição</span> : null}
                </p>
                <p className={estilos.mensagem}>
                  {`Sai: ${descricaoDaAulaDaTroca(troca.tituloDe, troca.quandoDe)}`}
                </p>
                <p className={estilos.mensagem}>
                  {`Entra: ${descricaoDaAulaDaTroca(troca.tituloPara, troca.quandoPara)}`}
                </p>
                {troca.motivo !== null ? (
                  <p className={estilos.mensagem}>{`Sua justificativa: ${troca.motivo}`}</p>
                ) : null}
                <p className={estilos.estado} data-situacao={troca.situacao}>
                  {rotuloDaTroca(troca)}
                </p>
                {troca.situacao === 'rejected' ? <BlocoDeContato /> : null}
                {troca.podeDesistir && desistindo !== troca.id ? (
                  <button
                    className={estilos.botaoLink}
                    type="button"
                    onClick={() => {
                      setRecado(null);
                      setDesistindo(troca.id);
                    }}
                  >
                    Desistir da troca
                  </button>
                ) : null}
                {desistindo === troca.id ? (
                  <ConfirmarDesistencia
                    descricao={descricaoDaAulaDaTroca(troca.tituloPara, troca.quandoPara)}
                    onDesistir={() => desistir(troca.id)}
                    onVoltar={() => setDesistindo(null)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pedidos.length > 0 ? (
        <section className={estilos.secao} aria-labelledby="eu-estava">
          <h2 className={estilos.tituloDaSecao} id="eu-estava">
            Eu estava na aula
          </h2>
          <ul className={estilos.lista}>
            {pedidos.map((pedido) => (
              <li className={estilos.cartao} key={pedido.id}>
                <p className={estilos.assunto}>
                  {`${pedido.tituloDaAula} · ${formatarDiaEHora(pedido.quandoDaAula)}`}
                </p>
                <p className={estilos.estado} data-situacao={pedido.situacao}>
                  {rotuloDoPedido(pedido)}
                </p>
                {pedido.situacao === 'rejected' ? <BlocoDeContato /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
