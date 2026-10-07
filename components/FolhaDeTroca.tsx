'use client';

import { useId, useState } from 'react';

import { CampoDeAnexos } from '@/components/CampoDeAnexos';
import { BotoesDoEnvio, MensagensDoEnvio } from '@/components/EnvioComAnexos';
import { useEnvioComAnexos } from '@/hooks/useEnvioComAnexos';
import { MAXIMO_DE_ANEXOS_DO_MOTIVO, type EtapasDoEnvio } from '@/lib/anexos';
import { formatarDiaEHora, type AulaDoAluno } from '@/lib/aulas';
import {
  ehReposicao,
  opcoesDeOrigem,
  ROTULO_DO_TIPO,
  TAMANHO_MAXIMO_DA_JUSTIFICATIVA_DA_TROCA,
  TEXTOS_DA_TROCA,
  textoDoFimDoHorario,
  tiposPossiveis,
  type PedidoDeTroca,
  type TipoDeTroca,
} from '@/lib/trocas';

import estilos from './FolhaDeTroca.module.css';

/**
 * Folha "Trocar aula" (§ 12.2, § 9.4, prancheta da linha G), aberta pela aula
 * nova: qual aula dele sai, o tipo (Só nesta semana é o padrão) e, na
 * permanente, a justificativa obrigatória com até 5 anexos, no envio em três
 * tempos (`useEnvioComAnexos`). Tudo o que aparece vem das colunas; o banco
 * confere de novo e recusa com a frase dele.
 */
export function FolhaDeTroca({
  nova,
  semana,
  onPedir,
  onFechar,
}: {
  nova: AulaDoAluno;
  /** As aulas da mesma semana (as linhas do menu). */
  semana: readonly AulaDoAluno[];
  /** Com anexo (permanente), devolve as etapas seguintes; a avulsa resolve no fim. */
  onPedir: (pedido: PedidoDeTroca) => Promise<EtapasDoEnvio | void>;
  onFechar: () => void;
}): React.JSX.Element {
  const grupo = useId();
  const tipos = tiposPossiveis(nova, semana);
  const [tipo, setTipo] = useState<TipoDeTroca | null>(tipos[0] ?? null);
  const opcoes = tipo === null ? [] : opcoesDeOrigem(semana, nova, tipo);
  const [origem, setOrigem] = useState<string | null>(opcoes[0]?.id ?? null);
  const [justificativa, setJustificativa] = useState('');
  const [anexos, setAnexos] = useState<File[]>([]);
  const { fase, enviar, tentarDeNovo, concluir } = useEnvioComAnexos();
  // Depois do motivo criado, nada do pedido muda: a troca sai com o que foi escrito.
  const travado = fase.tipo !== 'editando';
  const semCloudinary = fase.tipo === 'falhaNoAnexo' && fase.indisponivel;

  const escolherTipo = (novo: TipoDeTroca): void => {
    setTipo(novo);
    setOrigem(opcoesDeOrigem(semana, nova, novo)[0]?.id ?? null);
  };

  const pedir = (): void => {
    if (tipo === null || origem === null) return;
    const permanente = tipo === 'permanent';
    void enviar(
      () =>
        onPedir({
          de: origem,
          para: nova.id,
          tipo,
          justificativa: permanente ? justificativa : undefined,
        }),
      permanente ? anexos : [],
    );
  };

  const faltaJustificativa = tipo === 'permanent' && justificativa.trim() === '';

  return (
    <section className={estilos.folha} aria-labelledby={`${grupo}-titulo`}>
      <h3 className={estilos.titulo} id={`${grupo}-titulo`}>
        Trocar aula
      </h3>
      <p className={estilos.contexto}>{`Para: ${nova.titulo} · ${formatarDiaEHora(nova.quando)}`}</p>

      {tipo === null ? (
        <p className={estilos.contexto}>{TEXTOS_DA_TROCA.semOpcao}</p>
      ) : (
        <>
          {tipos.length > 1 ? (
            <fieldset className={estilos.tipos}>
              <legend className={estilos.somenteLeitor}>Tipo da troca</legend>
              {tipos.map((opcao) => (
                <label className={estilos.tipo} key={opcao} data-escolhido={tipo === opcao}>
                  <input
                    type="radio"
                    name={`${grupo}-tipo`}
                    checked={tipo === opcao}
                    onChange={() => escolherTipo(opcao)}
                    disabled={travado}
                  />
                  {ROTULO_DO_TIPO[opcao]}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className={estilos.contexto}>{ROTULO_DO_TIPO[tipo]}</p>
          )}

          <fieldset className={estilos.origens}>
            <legend className={estilos.pergunta}>{TEXTOS_DA_TROCA.pergunta}</legend>
            {opcoes.map((aula) => (
              <label className={estilos.origem} key={aula.id} data-escolhido={origem === aula.id}>
                <input
                  type="radio"
                  name={`${grupo}-origem`}
                  checked={origem === aula.id}
                  onChange={() => setOrigem(aula.id)}
                  disabled={travado}
                />
                <span className={estilos.descricao}>
                  <span>{`${aula.titulo} · ${formatarDiaEHora(aula.quando)}`}</span>
                  {tipo === 'once' && ehReposicao(aula, new Date()) ? (
                    <span className={estilos.selo}>Reposição</span>
                  ) : null}
                </span>
              </label>
            ))}
          </fieldset>

          {tipo === 'permanent' ? (
            <>
              {nova.horarioTerminaEm !== null ? (
                <p className={estilos.contexto}>{textoDoFimDoHorario(nova.horarioTerminaEm)}</p>
              ) : null}
              <label className={estilos.rotulo} htmlFor={`${grupo}-motivo`}>
                {`${TEXTOS_DA_TROCA.campoDaPermanente} (obrigatório)`}
              </label>
              <textarea
                id={`${grupo}-motivo`}
                className={estilos.area}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                maxLength={TAMANHO_MAXIMO_DA_JUSTIFICATIVA_DA_TROCA}
                rows={3}
                required
                disabled={travado}
              />
              {semCloudinary ? null : (
                <CampoDeAnexos
                  arquivos={anexos}
                  maximo={MAXIMO_DE_ANEXOS_DO_MOTIVO}
                  desabilitado={travado}
                  onMudar={setAnexos}
                />
              )}
              <p className={estilos.aviso}>{TEXTOS_DA_TROCA.avisoDaPermanente}</p>
            </>
          ) : null}
        </>
      )}

      <MensagensDoEnvio fase={fase} />

      <div className={estilos.acoes}>
        <BotoesDoEnvio
          fase={fase}
          podeEnviar={origem !== null && !faltaJustificativa}
          rotuloDoEnvio={tipo === null ? null : 'Pedir troca'}
          rotuloDoFechar="Voltar"
          saidaPrimeiro
          onEnviar={pedir}
          onTentarDeNovo={(pendentes) => void tentarDeNovo(pendentes)}
          onConcluir={(faltouAnexo) => void concluir(faltouAnexo)}
          onFechar={onFechar}
        />
      </div>
    </section>
  );
}
