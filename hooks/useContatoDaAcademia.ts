'use client';

import { useEffect, useState } from 'react';

import { buscarContatoDaAcademia, type ContatoDaAcademia } from '@/lib/contato';
import { supabase } from '@/lib/supabase';

export type EstadoDoContato =
  | { situacao: 'carregando' }
  | { situacao: 'pronto'; contato: ContatoDaAcademia }
  | { situacao: 'erro'; falha: unknown };

/**
 * O contato é da academia, igual para todos: uma leitura por página aberta
 * serve ao rodapé e a todos os blocos da tela.
 */
let leitura: Promise<ContatoDaAcademia> | null = null;

function lerUmaVez(): Promise<ContatoDaAcademia> {
  leitura ??= buscarContatoDaAcademia(supabase).catch((falha: unknown) => {
    // Na falha, a próxima tela tenta de novo.
    leitura = null;
    throw falha;
  });
  return leitura;
}

export function useContatoDaAcademia(): EstadoDoContato {
  const [estado, setEstado] = useState<EstadoDoContato>({ situacao: 'carregando' });

  useEffect(() => {
    let ativo = true;
    lerUmaVez().then(
      (contato) => {
        if (ativo) setEstado({ situacao: 'pronto', contato });
      },
      (falha: unknown) => {
        if (ativo) setEstado({ situacao: 'erro', falha });
      },
    );
    return () => {
      ativo = false;
    };
  }, []);

  return estado;
}
