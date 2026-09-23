'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  buscarDocumentosPendentes,
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

type Estado = 'carregando' | 'pronto' | 'erro' | 'nao-e-aluno';

export default function PaginaInicial(): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [nome, setNome] = useState('');
  const [frequencia, setFrequencia] = useState<Frequencia | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);

  const sair = useCallback(() => {
    void supabase.auth.signOut().then(() => {
      window.location.href = '/';
    });
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: sessao } = await supabase.auth.getSession();
      const usuario = sessao.session?.user;
      if (usuario === undefined) {
        window.location.href = '/';
        return;
      }

      const { data: perfil, error } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', usuario.id)
        .maybeSingle();

      if (error !== null || perfil === null) {
        setEstado('erro');
        return;
      }

      // Esta página é do aluno. Professor e administrador trabalham no
      // aplicativo, com telas que aqui não existem — deixá-los entrar num
      // lugar sem as ferramentas deles é pior que barrar na porta.
      if (perfil.role !== 'user') {
        await supabase.auth.signOut();
        setEstado('nao-e-aluno');
        return;
      }

      // Aceite pendente manda para os termos ANTES de qualquer dado aparecer.
      // Sem isso a tela existiria, mas dava para ignorá-la — e o que prova o
      // consentimento é a linha no banco, não a boa vontade de quem navega.
      try {
        const aAceitar = await buscarDocumentosPendentes();
        if (aAceitar.length > 0) {
          window.location.href = '/termos';
          return;
        }
      } catch {
        setEstado('erro');
        return;
      }

      setNome(String(perfil.name ?? 'aluno').split(' ')[0]);

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
  }, []);

  if (estado === 'carregando') {
    return <main className={estilos.aviso}>Carregando…</main>;
  }

  if (estado === 'nao-e-aluno') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>Esta página é só para alunos</h1>
        <p className={estilos.texto}>
          Professores e administradores trabalham pelo aplicativo — é lá que ficam a chamada,
          a aprovação de comprovantes e a gestão da academia.
        </p>
        <a className={estilos.botaoLink} href="/">
          Voltar
        </a>
      </main>
    );
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
                <span
                  className={estilos.selo}
                  data-situacao={mensalidade.situacao}
                >
                  {ROTULO_DA_SITUACAO[mensalidade.situacao]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={estilos.bloco} aria-labelledby="aulas">
        <h2 className={estilos.secao} id="aulas">
          Próximas aulas
        </h2>
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
