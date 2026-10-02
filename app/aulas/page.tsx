'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AulaComAcoes, AvisoAcimaDaCota, MensagensDasAcoes } from '@/components/AulaComAcoes';
import { Protegida } from '@/components/Protegida';
import { useAcoesDaAula } from '@/hooks/useAcoesDaAula';
import { agruparPorDia, buscarAulasDoAluno, inicioDoDia, type AulaDoAluno } from '@/lib/aulas';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

/** Hoje e os próximos seis dias: a semana que o aluno precisa enxergar. */
const DIAS_NA_TELA = 7;
/** "Eu estava na aula" vale até 7 dias depois da aula (T19); um dia a mais cobre o fuso. */
const DIAS_PARA_CONFERIR = 8;
const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

/**
 * Próximas aulas: avisar que vem, avisar que falta e justificar.
 *
 * O aviso é intenção, não presença — quem marca presença é o professor, na
 * chamada. A tela diz isso, para ninguém achar que avisar já conta.
 */
export default function PaginaDeAulas(): React.JSX.Element {
  return <Protegida etapa="aluno">{() => <Aulas />}</Protegida>;
}

function Aulas(): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [aulas, setAulas] = useState<AulaDoAluno[]>([]);
  // Aulas de antes de hoje em que ele ainda pode dizer "Eu estava na aula".
  const [paraConferir, setParaConferir] = useState<AulaDoAluno[]>([]);

  const carregar = useCallback(async () => {
    try {
      const de = inicioDoDia(new Date());
      const ate = new Date(de.getTime() + DIAS_NA_TELA * UM_DIA_EM_MS);
      const antes = new Date(de.getTime() - DIAS_PARA_CONFERIR * UM_DIA_EM_MS);
      const [proximas, passadas] = await Promise.all([
        buscarAulasDoAluno(supabase, de, ate),
        buscarAulasDoAluno(supabase, antes, de),
      ]);
      setAulas(proximas);
      setParaConferir(passadas.filter((aula) => aula.podeContestar));
      setEstado('pronto');
    } catch {
      setEstado('erro');
    }
  }, []);

  const acoes = useAcoesDaAula(carregar);

  // O estado só muda depois da rede, nunca no corpo do efeito: nada de render em cascata.
  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  if (estado === 'carregando') {
    return <main className={estilos.aviso} role="status">Carregando…</main>;
  }

  if (estado === 'erro') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>Não foi possível carregar</h1>
        <button className={estilos.botaoSecundario} type="button" onClick={() => void carregar()}>
          Tentar de novo
        </button>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <header>
        <a className={estilos.link} href="/inicio">
          ← Início
        </a>
        <h1 className={estilos.titulo}>Aulas</h1>
        <p className={estilos.texto}>
          Marcar é intenção: a presença vale pela chamada do professor.
        </p>
        <Link className={estilos.escolher} href="/aulas/semana">
          Escolher aulas
        </Link>
        <nav className={estilos.atalhos} aria-label="Acompanhar">
          <a className={estilos.link} href="/justificativas">
            Minhas justificativas →
          </a>
          <a className={estilos.link} href="/pedidos">
            Meus pedidos →
          </a>
        </nav>
      </header>

      <MensagensDasAcoes acoes={acoes} />

      {paraConferir.length > 0 ? (
        <section className={estilos.dia} aria-labelledby="para-conferir">
          <h2 className={estilos.rotuloDoDia} id="para-conferir">
            Para conferir
          </h2>
          {agruparPorDia(paraConferir, new Date()).map((dia) => (
            <div className={estilos.dia} key={dia.chave}>
              <p className={estilos.rotuloDoDia}>{dia.rotulo}</p>
              <ul className={estilos.lista}>
                {dia.aulas.map((aula) => (
                  <AulaComAcoes key={aula.id} aula={aula} acoes={acoes} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {aulas.length === 0 ? (
        <p className={estilos.vazio}>Nenhuma aula marcada por enquanto.</p>
      ) : (
        agruparPorDia(aulas, new Date()).map((dia) => (
          <section className={estilos.dia} key={dia.chave} aria-labelledby={`dia-${dia.chave}`}>
            <h2 className={estilos.rotuloDoDia} id={`dia-${dia.chave}`}>
              {dia.rotulo}
            </h2>
            <ul className={estilos.lista}>
              {dia.aulas.map((aula) => (
                <AulaComAcoes key={aula.id} aula={aula} acoes={acoes} />
              ))}
            </ul>
          </section>
        ))
      )}

      <AvisoAcimaDaCota acoes={acoes} />
    </main>
  );
}
