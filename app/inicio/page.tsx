'use client';

import { useCallback, useEffect, useState } from 'react';

import { Protegida, type UsuarioLiberado } from '@/components/Protegida';
import {
  buscarFrequencia,
  buscarMensalidadesAbertas,
  buscarProximasAulas,
  formatarData,
  formatarDataHora,
  formatarDinheiro,
  ROTULO_DA_SITUACAO,
  type Aula,
  type Frequencia,
  type Mensalidade,
} from '@/lib/dados';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

/** Abaixo disso a academia considera risco de evasão — mesma régua do app. */
const FREQUENCIA_MINIMA = 70;

type Estado = 'carregando' | 'pronto' | 'erro';

export default function PaginaInicial(): React.JSX.Element {
  return <Protegida etapa="aluno">{(usuario) => <Inicio usuario={usuario} />}</Protegida>;
}

function Inicio({ usuario }: { usuario: UsuarioLiberado }): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [frequencia, setFrequencia] = useState<Frequencia | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const nome = (usuario.nome ?? 'aluno').split(' ')[0];

  const sair = useCallback(() => {
    void supabase.auth.signOut().then(() => {
      window.location.href = '/';
    });
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [freq, pagamentos, proximas] = await Promise.all([
          buscarFrequencia(usuario.id),
          buscarMensalidadesAbertas(usuario.id),
          buscarProximasAulas(),
        ]);
        setFrequencia(freq);
        setMensalidades(pagamentos);
        setAulas(proximas);
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
            Avisar falta
          </a>
        </div>
        {aulas.length === 0 ? (
          <p className={estilos.vazio}>Nenhuma aula marcada por enquanto.</p>
        ) : (
          <ul className={estilos.lista}>
            {aulas.map((aula) => (
              <li className={estilos.item} key={aula.id}>
                <div>
                  <p className={estilos.itemTitulo}>{formatarDataHora(aula.quando)}</p>
                  <p className={estilos.itemDetalhe}>{aula.titulo}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={estilos.rodapeNota}>
        Enviar comprovante e justificar falta entram aqui em seguida.
      </p>
    </main>
  );
}
