'use client';

import { useEffect, useState } from 'react';

import { CartaoDeAula } from '@/components/CartaoDeAula';
import { CartaoDeFrequencia } from '@/components/CartaoDeFrequencia';
import { FolhaDaMeta } from '@/components/FolhaDaMeta';
import { Protegida, type UsuarioLiberado } from '@/components/Protegida';
import { ResumoDaSemana } from '@/components/ResumoDaSemana';
import {
  agruparPorDia,
  buscarAulasDoAluno,
  chaveDoDia,
  inicioDaSemana,
  resumoDaSemana,
  type AulaDoAluno,
  type ResumoDaSemana as Resumo,
} from '@/lib/aulas';
import {
  buscarMensalidadesAbertas,
  formatarData,
  formatarDinheiro,
  ROTULO_DA_SITUACAO,
  type Mensalidade,
} from '@/lib/dados';
import { buscarMetaDaSemana, proximaSegunda, textoDaMudanca } from '@/lib/meta';
import {
  buscarFrequenciaDaSemana,
  buscarFrequenciaDoMes,
  type FrequenciaDaSemana,
  type FrequenciaDoMes,
} from '@/lib/frequencia';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

/** A inicial mostra só as próximas; a lista inteira fica em Aulas. */
const AULAS_NA_INICIAL = 3;
const SETE_DIAS_EM_MS = 7 * 24 * 60 * 60 * 1000;

export default function PaginaInicial(): React.JSX.Element {
  return (
    <Protegida etapa="aluno" secao="inicio">
      {(usuario) => <Inicio usuario={usuario} />}
    </Protegida>
  );
}

function Inicio({ usuario }: { usuario: UsuarioLiberado }): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [semana, setSemana] = useState<FrequenciaDaSemana | null>(null);
  const [mes, setMes] = useState<FrequenciaDoMes | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [aulas, setAulas] = useState<AulaDoAluno[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  // Meta da próxima semana, lida ao abrir a folha; nula com a folha fechada.
  const [metaDaProxima, setMetaDaProxima] = useState<number | null>(null);
  const [recadoDaMeta, setRecadoDaMeta] = useState<string | null>(null);
  const [erroDaMeta, setErroDaMeta] = useState<string | null>(null);
  const nome = (usuario.nome ?? 'aluno').split(' ')[0];

  useEffect(() => {
    void (async () => {
      const agora = new Date();
      try {
        const segunda = inicioDaSemana(agora);
        const [daSemana, doMes, pagamentos, proximas, aulasDaSemana] = await Promise.all([
          buscarFrequenciaDaSemana(supabase, usuario.id, agora),
          buscarFrequenciaDoMes(supabase, usuario.id, chaveDoDia(agora)),
          buscarMensalidadesAbertas(usuario.id),
          buscarAulasDoAluno(supabase, agora, new Date(agora.getTime() + SETE_DIAS_EM_MS)),
          buscarAulasDoAluno(supabase, segunda, new Date(segunda.getTime() + SETE_DIAS_EM_MS)),
        ]);
        setSemana(daSemana);
        setMes(doMes);
        setMensalidades(pagamentos);
        setAulas(proximas.slice(0, AULAS_NA_INICIAL));
        setResumo(resumoDaSemana(aulasDaSemana));
        setEstado('pronto');
      } catch {
        setEstado('erro');
      }
    })();
  }, [usuario.id]);

  const abrirMeta = async (): Promise<void> => {
    setRecadoDaMeta(null);
    setErroDaMeta(null);
    try {
      setMetaDaProxima(await buscarMetaDaSemana(supabase, usuario.id, proximaSegunda(new Date())));
    } catch {
      setErroDaMeta('Não foi possível abrir a meta. Verifique a conexão e tente de novo.');
    }
  };

  if (estado === 'carregando') {
    return <main className={estilos.aviso} role="status">Carregando…</main>;
  }

  if (estado === 'erro') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>Não foi possível carregar</h1>
        <p className={estilos.texto}>
          Verifique sua internet e tente de novo. Se continuar assim, fale com a academia.
        </p>
        <button className={estilos.botaoLink} type="button" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <header className={estilos.cabecalho}>
        <h1 className={estilos.marca}>Olá, {nome}</h1>
      </header>

      <section className={estilos.bloco} aria-labelledby="freq">
        <h2 className={estilos.secao} id="freq">
          Sua frequência
        </h2>
        <CartaoDeFrequencia semana={semana} mes={mes} />
        {resumo !== null ? (
          <ResumoDaSemana
            resumo={resumo}
            acao={
              resumo.modalidade === 'unlimited' && metaDaProxima === null ? (
                <button className={estilos.mudar} type="button" onClick={() => void abrirMeta()}>
                  Mudar
                </button>
              ) : undefined
            }
          >
            {metaDaProxima !== null && resumo.meta !== null ? (
              <FolhaDaMeta
                metaDestaSemana={resumo.meta}
                metaDaProxima={metaDaProxima}
                onFechar={() => setMetaDaProxima(null)}
                onSalva={(definida) => {
                  setMetaDaProxima(null);
                  setRecadoDaMeta(textoDaMudanca(definida.valeAPartir, resumo.meta ?? definida.meta));
                }}
              />
            ) : null}
          </ResumoDaSemana>
        ) : null}
        {recadoDaMeta !== null ? (
          <p className={estilos.recado} role="status">
            {recadoDaMeta}
          </p>
        ) : null}
        {erroDaMeta !== null ? (
          <p className={estilos.erro} role="alert">
            {erroDaMeta}
          </p>
        ) : null}
      </section>

      <section className={estilos.bloco} aria-labelledby="mens">
        <h2 className={estilos.secao} id="mens">
          Mensalidades
        </h2>
        {mensalidades.length === 0 ? (
          <p className={estilos.vazio}>Você está em dia. Nada em aberto.</p>
        ) : (
          <ul className={estilos.lista}>
            {mensalidades.map((mensalidade) => (
              <li className={estilos.item} key={mensalidade.id}>
                <div>
                  <p className={estilos.itemTitulo}>{formatarDinheiro(mensalidade.valorCentavos)}</p>
                  <p className={estilos.itemDetalhe}>
                    Vence em {formatarData(mensalidade.vencimento)}
                  </p>
                </div>
                {mensalidade.situacao === 'pending_approval' ? (
                  <span className={estilos.selo} data-situacao={mensalidade.situacao}>
                    {ROTULO_DA_SITUACAO[mensalidade.situacao]}
                  </span>
                ) : (
                  <a className={estilos.pagar} href={`/pagar/${mensalidade.id}`}>
                    Pagar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={estilos.bloco} aria-labelledby="aulas">
        <div className={estilos.cabecalhoDaSecao}>
          <h2 className={estilos.secao} id="aulas">
            Próximas aulas
          </h2>
          <a className={estilos.verTodas} href="/aulas">
            Ver todas as aulas
          </a>
        </div>
        {aulas.length === 0 ? (
          <p className={estilos.vazio}>Nenhuma aula marcada por enquanto.</p>
        ) : (
          agruparPorDia(aulas, new Date()).map((dia) => (
            <div className={estilos.dia} key={dia.chave}>
              <p className={estilos.rotuloDoDia}>{dia.rotulo}</p>
              <ul className={estilos.lista}>
                {dia.aulas.map((aula) => (
                  <CartaoDeAula key={aula.id} aula={aula} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <p className={estilos.rodapeNota}>
        Enviar comprovante e justificar falta entram aqui em seguida.
      </p>
    </main>
  );
}
