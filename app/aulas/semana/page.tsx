'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AulaComAcoes, AvisoAcimaDaCota, MensagensDasAcoes } from '@/components/AulaComAcoes';
import { Protegida } from '@/components/Protegida';
import { ResumoDaSemana } from '@/components/ResumoDaSemana';
import { useAcoesDaAula } from '@/hooks/useAcoesDaAula';
import { chaveDoDia, inicioDaSemana, resumoDaSemana, type AulaDoAluno } from '@/lib/aulas';
import {
  buscarDiasDeAula,
  buscarMenuDeAulas,
  diaInicial,
  diasDoMenu,
  quantasAulas,
} from '@/lib/menu';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';
type Semana = 'esta' | 'proxima';

const UMA_SEMANA_EM_MS = 7 * 24 * 60 * 60 * 1000;

/** `AAAA-MM-DD` da segunda de "esta semana" ou da "próxima semana". */
function segundaDa(semana: Semana): string {
  const segunda = inicioDaSemana(new Date());
  return chaveDoDia(semana === 'esta' ? segunda : new Date(segunda.getTime() + UMA_SEMANA_EM_MS));
}

/**
 * Aulas da semana (contrato § 12.2, prancheta "Web — escolher aulas e
 * trocar"): abas Esta semana / Próxima semana, os dias de aula, e as ações de
 * cada aula só pelas colunas de `menu_de_aulas`. Sem vagas nem contagem (T43).
 */
export default function PaginaDaSemana(): React.JSX.Element {
  return <Protegida etapa="aluno">{() => <AulasDaSemana />}</Protegida>;
}

function AulasDaSemana(): React.JSX.Element {
  const [semana, setSemana] = useState<Semana>('esta');
  const [estado, setEstado] = useState<Estado>('carregando');
  const [aulas, setAulas] = useState<AulaDoAluno[]>([]);
  const [diasDeAula, setDiasDeAula] = useState<number[]>([]);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  // Trocar de aba no meio de uma leitura deixa duas no ar; a que chegar
  // atrasada não pode trocar a lista da semana que ele está vendo.
  const ultimaLeitura = useRef(0);

  const carregar = useCallback(async () => {
    const leitura = ++ultimaLeitura.current;
    try {
      const [doMenu, dias] = await Promise.all([
        buscarMenuDeAulas(supabase, segundaDa(semana)),
        buscarDiasDeAula(supabase),
      ]);
      if (leitura !== ultimaLeitura.current) return;
      setAulas(doMenu);
      setDiasDeAula(dias);
      setEstado('pronto');
    } catch {
      if (leitura === ultimaLeitura.current) setEstado('erro');
    }
  }, [semana]);

  const acoes = useAcoesDaAula(carregar);

  // O estado só muda depois da rede, nunca no corpo do efeito: nada de render em cascata.
  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  const trocarDeSemana = (nova: Semana): void => {
    if (nova === semana) return;
    acoes.fecharFormularios();
    setEstado('carregando');
    setDiaAberto(null);
    setSemana(nova);
  };

  const dias = diasDoMenu(segundaDa(semana), diasDeAula, aulas, new Date());
  const aberto = dias.find((dia) => dia.chave === (diaAberto ?? diaInicial(dias, new Date())));
  const resumo = resumoDaSemana(aulas);

  return (
    <main className={estilos.pagina}>
      <header>
        <a className={estilos.link} href="/aulas">
          ← Aulas
        </a>
        <h1 className={estilos.titulo}>Aulas da semana</h1>
      </header>

      <div className={estilos.abas} role="tablist" aria-label="Semana">
        {(['esta', 'proxima'] as const).map((opcao) => (
          <button
            key={opcao}
            className={estilos.aba}
            type="button"
            role="tab"
            aria-selected={semana === opcao}
            onClick={() => trocarDeSemana(opcao)}
          >
            {opcao === 'esta' ? 'Esta semana' : 'Próxima semana'}
          </button>
        ))}
      </div>

      {estado === 'carregando' ? (
        <p className={estilos.texto} role="status">
          Carregando…
        </p>
      ) : estado === 'erro' ? (
        <div className={estilos.falha}>
          <p className={estilos.texto} role="alert">
            Não foi possível carregar. Verifique sua internet e tente de novo.
          </p>
          <button className={estilos.botaoSecundario} type="button" onClick={() => void carregar()}>
            Tentar de novo
          </button>
        </div>
      ) : (
        <>
          <div className={estilos.dias} role="tablist" aria-label="Dias da semana">
            {dias.map((dia) => (
              <button
                key={dia.chave}
                className={estilos.diaDoMenu}
                data-passado={dia.passado}
                type="button"
                role="tab"
                aria-selected={aberto?.chave === dia.chave}
                aria-label={`${dia.semana} ${dia.dia}, ${quantasAulas(dia.aulas.length)}`}
                onClick={() => {
                  acoes.fecharFormularios();
                  setDiaAberto(dia.chave);
                }}
              >
                <small>{dia.semana}</small>
                <b>{dia.dia}</b>
                <i>{quantasAulas(dia.aulas.length)}</i>
              </button>
            ))}
          </div>

          {resumo !== null ? <ResumoDaSemana resumo={resumo} /> : null}

          <MensagensDasAcoes acoes={acoes} />

          {aberto === undefined || aberto.aulas.length === 0 ? (
            <p className={estilos.vazio}>Nenhuma aula neste dia.</p>
          ) : (
            <ul className={estilos.lista} aria-label={`Aulas de ${aberto.semana} ${aberto.dia}`}>
              {aberto.aulas.map((aula) => (
                <AulaComAcoes key={aula.id} aula={aula} acoes={acoes} semana={aulas} />
              ))}
            </ul>
          )}

          <a className={estilos.link} href="/pedidos">
            Meus pedidos →
          </a>
        </>
      )}

      <AvisoAcimaDaCota acoes={acoes} />
    </main>
  );
}
