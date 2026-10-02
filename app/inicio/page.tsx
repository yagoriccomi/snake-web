'use client';

import { useCallback, useEffect, useState } from 'react';

import { CartaoDeAula } from '@/components/CartaoDeAula';
import { Protegida, type UsuarioLiberado } from '@/components/Protegida';
import { agruparPorDia, buscarAulasDoAluno, type AulaDoAluno } from '@/lib/aulas';
import {
  buscarFrequencia,
  buscarMensalidadesAbertas,
  formatarData,
  formatarDinheiro,
  ROTULO_DA_SITUACAO,
  type Frequencia,
  type Mensalidade,
} from '@/lib/dados';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

/** Abaixo disso a academia considera risco de evasão — mesma régua do app. */
const FREQUENCIA_MINIMA = 70;

type Estado = 'carregando' | 'pronto' | 'erro';

/** A inicial mostra só as próximas; a lista inteira fica em Aulas. */
const AULAS_NA_INICIAL = 3;
const SETE_DIAS_EM_MS = 7 * 24 * 60 * 60 * 1000;

export default function PaginaInicial(): React.JSX.Element {
  return <Protegida etapa="aluno">{(usuario) => <Inicio usuario={usuario} />}</Protegida>;
}

function Inicio({ usuario }: { usuario: UsuarioLiberado }): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [frequencia, setFrequencia] = useState<Frequencia | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [aulas, setAulas] = useState<AulaDoAluno[]>([]);
  const nome = (usuario.nome ?? 'aluno').split(' ')[0];

  const sair = useCallback(() => {
    void supabase.auth.signOut().then(() => {
      window.location.href = '/';
    });
  }, []);

  useEffect(() => {
    void (async () => {
      const agora = new Date();
      try {
        const [freq, pagamentos, proximas] = await Promise.all([
          buscarFrequencia(usuario.id),
          buscarMensalidadesAbertas(usuario.id),
          buscarAulasDoAluno(supabase, agora, new Date(agora.getTime() + SETE_DIAS_EM_MS)),
        ]);
        setFrequencia(freq);
        setMensalidades(pagamentos);
        setAulas(proximas.slice(0, AULAS_NA_INICIAL));
        setEstado('pronto');
      } catch {
        setEstado('erro');
      }
    })();
  }, [usuario.id]);

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

  const abaixoDoMinimo = frequencia !== null && frequencia.percentual < FREQUENCIA_MINIMA;

  return (
    <main className={estilos.pagina}>
      <header className={estilos.cabecalho}>
        <h1 className={estilos.marca}>Olá, {nome}</h1>
        <button className={estilos.sair} type="button" onClick={sair}>
          Sair
        </button>
      </header>

      <section className={estilos.bloco} aria-labelledby="freq">
        <h2 className={estilos.secao} id="freq">
          Sua frequência este mês
        </h2>
        {frequencia === null ? (
          <p className={estilos.vazio}>Você ainda não tem aulas neste mês.</p>
        ) : (
          <div className={estilos.cartao}>
            <p
              className={estilos.numeroGrande}
              style={{ color: abaixoDoMinimo ? 'var(--warning)' : 'var(--primary-text)' }}
            >
              {frequencia.percentual.toFixed(0)}%
            </p>
            <p className={estilos.texto}>
              {frequencia.presencas} de {frequencia.aulasContadas} aulas
              {frequencia.justificadas > 0
                ? ` · ${frequencia.justificadas} falta${frequencia.justificadas > 1 ? 's' : ''} justificada${frequencia.justificadas > 1 ? 's' : ''}`
                : ''}
            </p>
            {abaixoDoMinimo ? (
              <p className={estilos.alerta}>
                Abaixo de {FREQUENCIA_MINIMA}%. Vale conversar com a academia.
              </p>
            ) : null}
          </div>
        )}
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
