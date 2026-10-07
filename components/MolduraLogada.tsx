'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { BotoesDeContato } from '@/components/BlocoDeContato';
import { useContatoDaAcademia } from '@/hooks/useContatoDaAcademia';
import { temContato, TEXTOS_DO_CONTATO } from '@/lib/contato';
import { motivoDaFalhaDeLeitura } from '@/lib/erros';
import { supabase } from '@/lib/supabase';

import estilos from './MolduraLogada.module.css';

/** Onde o aluno está, para o cabeçalho marcar (Início ou Aulas). */
export type Secao = 'inicio' | 'aulas';

/**
 * Cabeçalho **Início · Aulas · Sair** (5.1, linha F) e rodapé **Falar com a
 * academia** (6.15, § 5.4) das páginas logadas do aluno. O primeiro acesso e os
 * termos ficam sem a moldura: ali o aluno ainda não entrou de verdade.
 */
export function MolduraLogada({
  secao,
  children,
}: {
  secao?: Secao;
  children: React.ReactNode;
}): React.JSX.Element {
  const sair = (): void => {
    void supabase.auth.signOut().then(() => {
      window.location.href = '/';
    });
  };

  return (
    <>
      <header className={estilos.topo}>
        <nav className={estilos.navegacao} aria-label="Principal">
          <span className={estilos.marca}>Snake Thai</span>
          <Link
            className={estilos.item}
            href="/inicio"
            aria-current={secao === 'inicio' ? 'page' : undefined}
          >
            Início
          </Link>
          <Link
            className={estilos.item}
            href="/aulas"
            aria-current={secao === 'aulas' ? 'page' : undefined}
          >
            Aulas
          </Link>
          <button className={estilos.item} type="button" onClick={sair}>
            Sair
          </button>
        </nav>
      </header>
      {children}
      <RodapeDeContato />
    </>
  );
}

function RodapeDeContato(): React.JSX.Element {
  const painel = useId();
  const [aberto, setAberto] = useState(false);
  const estado = useContatoDaAcademia();

  return (
    <footer className={estilos.rodape}>
      <div className={estilos.linhaDoRodape}>
        <span className={estilos.duvidas}>Dúvidas?</span>
        <button
          className={estilos.falar}
          type="button"
          aria-expanded={aberto}
          aria-controls={painel}
          onClick={() => setAberto(!aberto)}
        >
          {TEXTOS_DO_CONTATO.falar}
        </button>
      </div>
      {aberto ? (
        <div className={estilos.painel} id={painel}>
          {estado.situacao === 'carregando' ? (
            <p className={estilos.texto} role="status">
              Carregando…
            </p>
          ) : estado.situacao === 'erro' ? (
            <p className={estilos.texto} role="alert">
              Não foi possível carregar o contato. {motivoDaFalhaDeLeitura(estado.falha)}
            </p>
          ) : temContato(estado.contato) ? (
            <BotoesDeContato contato={estado.contato} />
          ) : (
            <p className={estilos.texto}>{TEXTOS_DO_CONTATO.semContato}</p>
          )}
        </div>
      ) : null}
    </footer>
  );
}
