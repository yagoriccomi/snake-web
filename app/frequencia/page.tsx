'use client';

import { useCallback, useEffect, useState } from 'react';

import { FormularioDeMotivo } from '@/components/FormularioDeMotivo';
import { Protegida } from '@/components/Protegida';
import { chaveDoDia, diaEMesDoInstante, formatarDiaEHora } from '@/lib/aulas';
import { motivoDaFalhaDeLeitura } from '@/lib/erros';
import {
  avisoDeMesAberto,
  buscarFrequenciaDoMes,
  buscarSemanasDoMes,
  diaEMesDaData,
  feitasDeEsperadas,
  formatarPercentual,
  nomeDoMes,
  primeiroDiaDoMes,
  rotuloDaModalidade,
  rotulosDaFrequencia,
  semanasParaJustificar,
  somarMeses,
  textoDasQueRestam,
  ultimoDiaDoMes,
  type FrequenciaDoMes,
  type SemanaDoMes,
} from '@/lib/frequencia';
import {
  atrasoDaChamada,
  buscarHistoricoDoAluno,
  situacaoNoHistorico,
  tomDaSituacao,
  type AulaDoHistorico,
} from '@/lib/historico';
import { enviarJustificativa, rotuloDaJustificativa } from '@/lib/justificativas';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

const ROTULO_DA_SEMANA_EXTRA = 'Semana extra';

/**
 * Frequência do mês, semana a semana (prancheta "Frequência — semanas e semana
 * extra"). Esperado, feitas, percentual, semana extra e fechamento vêm prontos
 * de `frequencia_do_mes` e `semanas_do_mes`.
 */
export default function PaginaDeFrequencia(): React.JSX.Element {
  return (
    <Protegida etapa="aluno" secao="inicio">
      {(usuario) => <Frequencia userId={usuario.id} />}
    </Protegida>
  );
}

function Frequencia({ userId }: { userId: string }): React.JSX.Element {
  const mesAtual = primeiroDiaDoMes(chaveDoDia(new Date()));
  const [mes, setMes] = useState(mesAtual);
  const [estado, setEstado] = useState<Estado>('carregando');
  const [motivoDaFalha, setMotivoDaFalha] = useState('');
  const [doMes, setDoMes] = useState<FrequenciaDoMes | null>(null);
  const [semanas, setSemanas] = useState<SemanaDoMes[]>([]);
  const [historico, setHistorico] = useState<AulaDoHistorico[]>([]);
  const [justificando, setJustificando] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const carregar = useCallback(
    async (alvo: string) => {
      try {
        const [frequencia, linhas, aulasDoMes] = await Promise.all([
          buscarFrequenciaDoMes(supabase, userId, alvo),
          buscarSemanasDoMes(supabase, userId, alvo),
          buscarHistoricoDoAluno(supabase, userId, alvo, ultimoDiaDoMes(alvo)),
        ]);
        setDoMes(frequencia);
        setSemanas(linhas);
        setHistorico(aulasDoMes);
        setEstado('pronto');
      } catch (falha) {
        setMotivoDaFalha(motivoDaFalhaDeLeitura(falha));
        setEstado('erro');
      }
    },
    [userId],
  );

  // O estado só muda depois da rede, nunca no corpo do efeito: nada de render em cascata.
  useEffect(() => {
    void (async () => {
      await carregar(mes);
    })();
  }, [carregar, mes]);

  const irPara = (alvo: string): void => {
    setEstado('carregando');
    setJustificando(null);
    setRecado(null);
    setMes(alvo);
  };

  const justificarSemana = async (semana: string, texto: string): Promise<void> => {
    await enviarJustificativa(supabase, { escopo: 'week', semana, texto });
    setJustificando(null);
    setRecado('Justificativa enviada. A academia vai analisar.');
    await carregar(mes);
  };

  const rotulos = rotulosDaFrequencia(doMes?.modalidade ?? null);
  const aviso = doMes === null ? null : avisoDeMesAberto(doMes, mes, new Date());

  return (
    <main className={estilos.pagina}>
      <header>
        <a className={estilos.link} href="/inicio">
          ← Início
        </a>
        <h1 className={estilos.titulo}>Frequência</h1>
      </header>

      <nav className={estilos.meses} aria-label="Mês">
        <button
          className={estilos.botaoDoMes}
          type="button"
          aria-label="Mês anterior"
          onClick={() => irPara(somarMeses(mes, -1))}
        >
          ‹
        </button>
        <p className={estilos.nomeDoMes} aria-live="polite">
          {nomeDoMes(mes)}
        </p>
        <button
          className={estilos.botaoDoMes}
          type="button"
          aria-label="Próximo mês"
          onClick={() => irPara(somarMeses(mes, 1))}
          disabled={mes >= mesAtual}
        >
          ›
        </button>
      </nav>

      {estado === 'carregando' ? (
        <p className={estilos.texto} role="status">
          Carregando…
        </p>
      ) : estado === 'erro' ? (
        <div className={estilos.falha}>
          <p className={estilos.texto} role="alert">
            Não foi possível carregar. {motivoDaFalha}
          </p>
          <button className={estilos.botaoSecundario} type="button" onClick={() => irPara(mes)}>
            Tentar de novo
          </button>
        </div>
      ) : (
        <>
          <div className={estilos.resumo}>
            <span className={estilos.modalidade}>{rotuloDaModalidade(doMes?.modalidade ?? null)}</span>
            <span className={estilos.rotulo}>{rotulos.mes}</span>
            <span className={estilos.valor}>{formatarPercentual(doMes?.percentual ?? null)}</span>
            <span className={estilos.rotulo}>
              {feitasDeEsperadas(doMes?.feitas ?? 0, doMes?.esperadas ?? 0)}
            </span>
          </div>

          {aviso !== null ? (
            <p className={estilos.aviso} role="note">
              {aviso}
            </p>
          ) : null}

          {semanas.length === 0 ? (
            <p className={estilos.vazio}>Você ainda não tem aulas neste mês.</p>
          ) : (
            <table className={estilos.tabela}>
              <caption className={estilos.somenteLeitor}>Semanas de {nomeDoMes(mes)}</caption>
              <thead>
                <tr>
                  <th scope="col">Semana</th>
                  <th scope="col">Feitas</th>
                  <th scope="col">{rotulos.semana}</th>
                  <th scope="col">No mês</th>
                </tr>
              </thead>
              <tbody>
                {semanas.map((semana) => (
                  <tr key={semana.inicio}>
                    <th scope="row">
                      {semana.rotulo === ROTULO_DA_SEMANA_EXTRA ? (
                        <>
                          {semana.rotulo}
                          <span className={estilos.datas}>
                            {diaEMesDaData(semana.inicio)} – {diaEMesDaData(semana.fim)}
                          </span>
                        </>
                      ) : (
                        `${semana.rotulo} · ${diaEMesDaData(semana.inicio)}–${diaEMesDaData(semana.fim)}`
                      )}
                    </th>
                    <td>{feitasDeEsperadas(semana.feitasNaSemana, semana.esperadasNaSemana)}</td>
                    <td>{formatarPercentual(semana.percentualDaSemana)}</td>
                    <td>{feitasDeEsperadas(semana.feitasNoMes, semana.esperadasNoMes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {recado !== null ? (
            <p className={estilos.recado} role="status">
              {recado}
            </p>
          ) : null}

          {semanasParaJustificar(semanas).length > 0 ? (
            <section className={estilos.justificativas} aria-labelledby="justificativas">
              <h2 className={estilos.secao} id="justificativas">
                Justificativas
              </h2>
              {semanasParaJustificar(semanas).map((semana) => (
                <div className={estilos.semana} key={semana.inicio}>
                  <p className={estilos.tituloDaSemana}>
                    {`${semana.rotulo} · ${diaEMesDaData(semana.inicio)}–${diaEMesDaData(semana.fim)}`}
                  </p>
                  {semana.justificativas.map((j) => (
                    <p className={estilos.estado} data-situacao={j.situacao} key={j.id}>
                      {rotuloDaJustificativa({ ...j, podeReenviar: false, reenviarAte: null })}
                    </p>
                  ))}
                  {semana.podeJustificar && justificando !== semana.inicio ? (
                    <div className={estilos.acaoDaSemana}>
                      <p className={estilos.dica}>
                        {[
                          semana.justificarAte !== null
                            ? `Até ${diaEMesDoInstante(semana.justificarAte)}`
                            : null,
                          semana.justificativasRestantes !== null
                            ? textoDasQueRestam(semana.justificativasRestantes)
                            : null,
                        ]
                          .filter((parte): parte is string => parte !== null)
                          .join(' · ')}
                      </p>
                      <button
                        className={estilos.botaoLink}
                        type="button"
                        onClick={() => {
                          setRecado(null);
                          setJustificando(semana.inicio);
                        }}
                      >
                        Justificar mais 1 aula
                      </button>
                    </div>
                  ) : null}
                  {justificando === semana.inicio ? (
                    <FormularioDeMotivo
                      titulo={`Justificar 1 aula · semana ${diaEMesDaData(semana.inicio)}–${diaEMesDaData(semana.fim)}`}
                      onEnviar={(texto) => justificarSemana(semana.inicio, texto)}
                      onFechar={() => setJustificando(null)}
                    />
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          {historico.length > 0 ? (
            <section className={estilos.justificativas} aria-labelledby="historico">
              <h2 className={estilos.secao} id="historico">
                Histórico de aulas
              </h2>
              <ul className={estilos.historico}>
                {historico.map((aula) => {
                  const atraso = atrasoDaChamada(aula.diasDeAtraso);
                  return (
                    <li className={estilos.linhaDoHistorico} key={aula.id}>
                      <time className={estilos.quando} dateTime={aula.quando}>
                        {formatarDiaEHora(aula.quando)}
                      </time>
                      <span className={estilos.corpoDoHistorico}>
                        <span className={estilos.tituloDaAula}>{aula.titulo}</span>
                        {aula.editada || atraso !== null ? (
                          <span className={estilos.marcas}>
                            {aula.editada ? <span className={estilos.marca}>Editada</span> : null}
                            {atraso !== null ? <span className={estilos.marca}>{atraso}</span> : null}
                          </span>
                        ) : null}
                      </span>
                      <span className={estilos.situacao} data-tom={tomDaSituacao(aula)}>
                        {situacaoNoHistorico(aula)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <a className={estilos.link} href="/justificativas">
            Minhas justificativas →
          </a>
        </>
      )}
    </main>
  );
}
