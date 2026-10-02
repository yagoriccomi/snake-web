'use client';

import { useCallback, useState } from 'react';

import { avisoDeCota, declararAula, type AcaoDeDeclarar, type AulaDoAluno } from '@/lib/aulas';
import { mensagemDoAviso } from '@/lib/erros';
import { enviarJustificativa } from '@/lib/justificativas';
import { PEDIDO_ENVIADO, pedirEuEstavaNaAula } from '@/lib/solicitacoes';
import { supabase } from '@/lib/supabase';

/** O aviso de acima da cota guarda a aula, para o "Desfazer" saber o que desmarcar. */
export interface AvisoDeCota {
  classId: string;
  texto: string;
}

const RECADO_DA_ACAO: Record<AcaoDeDeclarar['rotulo'], string> = {
  Vou: 'Avisamos que você vem.',
  'Vou (extra)': 'Avisamos que você vem.',
  'Não vou': 'Avisamos que você não vem.',
  Desmarcar: 'Marcação desfeita.',
};

const JUSTIFICATIVA_ENVIADA = 'Justificativa enviada. A academia vai analisar.';

export interface AcoesDaAula {
  ocupado: boolean;
  erro: string | null;
  recado: string | null;
  cota: AvisoDeCota | null;
  /** A aula com o formulário da justificativa aberto. */
  justificandoAula: string | null;
  /** A aula com o formulário do "Eu estava na aula" aberto. */
  contestandoAula: string | null;
  declarar: (aula: AulaDoAluno, acao: AcaoDeDeclarar) => Promise<void>;
  desfazerAcimaDaCota: () => Promise<void>;
  justificar: (classId: string, texto: string) => Promise<void>;
  contestar: (classId: string, texto: string) => Promise<void>;
  abrirContestacao: (classId: string) => void;
  fecharFormularios: () => void;
}

/**
 * O que o aluno faz numa aula (tabela de ações da § 12.2), o mesmo em Aulas e
 * em Aulas da semana: declarar, desfazer o acima da cota, justificar a falta
 * e o "Eu estava na aula". Depois de cada ação, `recarregar` lê de novo as
 * colunas, porque o novo estado é o banco que diz.
 */
export function useAcoesDaAula(recarregar: () => Promise<void>): AcoesDaAula {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [cota, setCota] = useState<AvisoDeCota | null>(null);
  const [justificandoAula, setJustificandoAula] = useState<string | null>(null);
  const [contestandoAula, setContestandoAula] = useState<string | null>(null);

  const declarar = useCallback(
    async (aula: AulaDoAluno, acao: AcaoDeDeclarar) => {
      setErro(null);
      setRecado(null);
      setCota(null);
      setOcupado(true);
      try {
        const declaracao = await declararAula(supabase, aula.id, acao.vou);
        const acima = avisoDeCota(declaracao);
        if (acima !== null) {
          setCota({ classId: aula.id, texto: acima });
        } else {
          setRecado(RECADO_DA_ACAO[acao.rotulo]);
        }
        // Só o "Não vou" do fixo, na aula da grade, abre a justificativa, e só
        // se o banco disser que ela ainda aceita (uma por aula, § 9.1).
        if (acao.rotulo === 'Não vou' && aula.podeJustificar && aula.justificativa === null) {
          setJustificandoAula(aula.id);
        }
        await recarregar();
      } catch (falha) {
        setErro(mensagemDoAviso(falha));
      } finally {
        setOcupado(false);
      }
    },
    [recarregar],
  );

  const desfazerAcimaDaCota = useCallback(async () => {
    if (cota === null) return;
    setErro(null);
    setOcupado(true);
    try {
      await declararAula(supabase, cota.classId, false);
      setCota(null);
      setRecado(RECADO_DA_ACAO.Desmarcar);
      await recarregar();
    } catch (falha) {
      setErro(mensagemDoAviso(falha));
    } finally {
      setOcupado(false);
    }
  }, [cota, recarregar]);

  // Os dois formulários tratam o próprio erro; aqui só o que vem depois do sucesso.
  const justificar = useCallback(
    async (classId: string, texto: string) => {
      await enviarJustificativa(supabase, { escopo: 'class', classId, texto });
      setJustificandoAula(null);
      setRecado(JUSTIFICATIVA_ENVIADA);
      await recarregar();
    },
    [recarregar],
  );

  const contestar = useCallback(
    async (classId: string, texto: string) => {
      await pedirEuEstavaNaAula(supabase, classId, texto);
      setContestandoAula(null);
      setRecado(PEDIDO_ENVIADO);
      await recarregar();
    },
    [recarregar],
  );

  const abrirContestacao = useCallback((classId: string) => {
    setRecado(null);
    setContestandoAula(classId);
  }, []);

  const fecharFormularios = useCallback(() => {
    setJustificandoAula(null);
    setContestandoAula(null);
  }, []);

  return {
    ocupado,
    erro,
    recado,
    cota,
    justificandoAula,
    contestandoAula,
    declarar,
    desfazerAcimaDaCota,
    justificar,
    contestar,
    abrirContestacao,
    fecharFormularios,
  };
}
