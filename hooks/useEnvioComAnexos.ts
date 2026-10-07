'use client';

import { useRef, useState } from 'react';

import { enviarAnexos, type EtapasDoEnvio, type FalhaDoAnexo } from '@/lib/anexos';
import { mensagemDaFalha } from '@/lib/erros';

export type FaseDoEnvio =
  | { tipo: 'editando'; erro: string | null }
  | { tipo: 'enviando'; progresso: string | null }
  | { tipo: 'falhaNoAnexo'; falhas: FalhaDoAnexo[]; indisponivel: boolean }
  | { tipo: 'falhaNaConclusao'; erro: string; faltouAnexo: boolean };

const EDITANDO: FaseDoEnvio = { tipo: 'editando', erro: null };

export interface EnvioComAnexos {
  fase: FaseDoEnvio;
  /**
   * Grava o texto com `gravar` e, se ele devolver as etapas, envia os
   * arquivos e conclui. Sem etapas, o envio já acabou.
   */
  enviar: (gravar: () => Promise<EtapasDoEnvio | void>, arquivos: readonly File[]) => Promise<void>;
  tentarDeNovo: (pendentes: readonly File[]) => Promise<void>;
  concluir: (faltouAnexo: boolean) => Promise<void>;
}

/**
 * O envio em três tempos (§ 8, § 9.1, § 9.3, § 9.4): o texto cria o registro,
 * os anexos vão um a um, e só então o envio se conclui. O registro já existe
 * quando um anexo falha, então a tela trava o que foi escrito e a pessoa
 * escolhe entre tentar de novo e seguir sem ele — nunca um envio meio feito
 * sem aviso. O mesmo para a justificativa, o "Eu estava na aula" e a troca
 * permanente.
 */
export function useEnvioComAnexos(): EnvioComAnexos {
  const [fase, setFase] = useState<FaseDoEnvio>(EDITANDO);
  // As etapas valem entre as tentativas: o registro já foi criado uma vez.
  const etapas = useRef<EtapasDoEnvio | null>(null);

  const concluir = async (faltouAnexo: boolean): Promise<void> => {
    if (etapas.current === null) return;
    setFase({ tipo: 'enviando', progresso: null });
    try {
      await etapas.current.concluir(faltouAnexo);
      setFase(EDITANDO);
    } catch (falha) {
      setFase({ tipo: 'falhaNaConclusao', erro: mensagemDaFalha(falha, 'concluir'), faltouAnexo });
    }
  };

  const enviarOsAnexos = async (pendentes: readonly File[]): Promise<void> => {
    if (etapas.current === null) return;
    const { falhas, indisponivel } = await enviarAnexos(
      etapas.current.anexar,
      pendentes,
      (indice, total) =>
        setFase({ tipo: 'enviando', progresso: `Enviando anexo ${indice + 1} de ${total}…` }),
    );
    if (falhas.length > 0) {
      setFase({ tipo: 'falhaNoAnexo', falhas, indisponivel });
      return;
    }
    await concluir(false);
  };

  const enviar = async (
    gravar: () => Promise<EtapasDoEnvio | void>,
    arquivos: readonly File[],
  ): Promise<void> => {
    setFase({ tipo: 'enviando', progresso: null });
    let seguintes: EtapasDoEnvio | void;
    try {
      seguintes = await gravar();
    } catch (falha) {
      setFase({ tipo: 'editando', erro: mensagemDaFalha(falha, 'enviar') });
      return;
    }
    if (seguintes === undefined) {
      setFase(EDITANDO);
      return;
    }
    etapas.current = seguintes;
    await enviarOsAnexos(arquivos);
  };

  return { fase, enviar, tentarDeNovo: enviarOsAnexos, concluir };
}
