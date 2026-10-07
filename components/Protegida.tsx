'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { verificarAcesso, type Acesso, type Etapa } from '@/lib/guarda';
import { supabase } from '@/lib/supabase';

import estilos from './Protegida.module.css';

export type UsuarioLiberado = Extract<Acesso, { situacao: 'liberado' }>['usuario'];

/**
 * Envolve toda página logada: roda o guarda uma vez e só monta a página quando
 * o acesso está liberado. Enquanto isso, e nos desvios, mostra os avisos.
 *
 * Nenhum dado da página é buscado antes do guarda terminar — é isso que impede
 * a frequência de aparecer, por um instante, para quem ainda deve o aceite.
 */
export function Protegida({
  etapa,
  children,
}: {
  etapa: Etapa;
  children: (usuario: UsuarioLiberado) => React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const [acesso, setAcesso] = useState<Exclude<Acesso, { situacao: 'redirecionar' }> | null>(
    null,
  );

  useEffect(() => {
    void (async () => {
      const resultado = await verificarAcesso(supabase, etapa).catch(
        (): Acesso => ({ situacao: 'erro' }),
      );
      if (resultado.situacao === 'redirecionar') {
        router.replace(resultado.para);
        return;
      }
      setAcesso(resultado);
    })();
  }, [etapa, router]);

  if (acesso === null) {
    return <main className={estilos.aviso}>Carregando…</main>;
  }

  if (acesso.situacao === 'nao-e-aluno') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>Esta página é só para alunos</h1>
        <p className={estilos.texto}>
          Professores e administradores trabalham pelo aplicativo — é lá que ficam a chamada,
          a aprovação de comprovantes e a gestão da academia.
        </p>
        <Link className={estilos.botaoLink} href="/">
          Voltar
        </Link>
      </main>
    );
  }

  if (acesso.situacao === 'erro') {
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

  return <>{children(acesso.usuario)}</>;
}
