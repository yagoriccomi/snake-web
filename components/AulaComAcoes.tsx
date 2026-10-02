'use client';

import { CartaoDeAula, SeloDaAula } from '@/components/CartaoDeAula';
import { ConfirmarDesistencia } from '@/components/ConfirmarDesistencia';
import { FolhaDeTroca } from '@/components/FolhaDeTroca';
import { FormularioDeMotivo } from '@/components/FormularioDeMotivo';
import type { AcoesDaAula } from '@/hooks/useAcoesDaAula';
import {
  acoesDeDeclarar,
  estadoDaAula,
  formatarDiaEHora,
  type AulaDoAluno,
} from '@/lib/aulas';
import { SELO_DA_JUSTIFICATIVA } from '@/lib/justificativas';
import { TAMANHO_MAXIMO_DO_MOTIVO } from '@/lib/solicitacoes';

import estilos from './AulaComAcoes.module.css';

/**
 * O cartão da aula com o que o aluno pode fazer nela: à direita, o estado e os
 * botões, escolhidos só pelas colunas (tabela de ações da § 12.2); embaixo, os
 * formulários da justificativa e do "Eu estava na aula" e a folha da troca.
 *
 * `semana` (as aulas da semana, no menu) liga o "Trocar para esta": a folha
 * precisa delas para oferecer a aula que sai.
 */
export function AulaComAcoes({
  aula,
  acoes,
  semana,
}: {
  aula: AulaDoAluno;
  acoes: AcoesDaAula;
  semana?: readonly AulaDoAluno[];
}): React.JSX.Element {
  const podeTrocar = semana !== undefined && aula.podeTrocarPara;
  const trocaId = aula.podeDesistirDaTroca ? aula.trocaId : null;
  return (
    <CartaoDeAula
      aula={aula}
      lateral={<LateralDaAula aula={aula} acoes={acoes} podeTrocar={podeTrocar} />}
    >
      {trocaId !== null && acoes.desistindoAula === aula.id ? (
        <ConfirmarDesistencia
          descricao={`${aula.titulo} · ${formatarDiaEHora(aula.quando)}`}
          onDesistir={() => acoes.desistir(trocaId)}
          onVoltar={acoes.fecharFormularios}
        />
      ) : null}
      {podeTrocar && acoes.trocandoAula === aula.id ? (
        <FolhaDeTroca
          nova={aula}
          semana={semana}
          onPedir={acoes.pedirTroca}
          onFechar={acoes.fecharFormularios}
        />
      ) : null}
      {acoes.justificandoAula === aula.id ? (
        <FormularioDeMotivo
          titulo="Justificar a falta"
          onEnviar={(texto) => acoes.justificar(aula.id, texto)}
          onFechar={acoes.fecharFormularios}
        />
      ) : null}
      {acoes.contestandoAula === aula.id ? (
        <FormularioDeMotivo
          titulo="Eu estava na aula"
          contexto={`${aula.titulo} · ${formatarDiaEHora(aula.quando)}. Se o professor aprovar, a sua presença entra na chamada.`}
          rotulo="O que aconteceu"
          dica="Conte o que aconteceu."
          limite={TAMANHO_MAXIMO_DO_MOTIVO}
          rotuloDoEnvio="Enviar pedido"
          rotuloDoFechar="Voltar"
          onEnviar={(texto) => acoes.contestar(aula.id, texto)}
          onFechar={acoes.fecharFormularios}
        />
      ) : null}
    </CartaoDeAula>
  );
}

function LateralDaAula({
  aula,
  acoes,
  podeTrocar,
}: {
  aula: AulaDoAluno;
  acoes: AcoesDaAula;
  podeTrocar: boolean;
}): React.JSX.Element | null {
  const estado = estadoDaAula(aula);
  const declarar = acoesDeDeclarar(aula, new Date());
  const podeDesistir = aula.podeDesistirDaTroca && aula.trocaId !== null;
  if (
    estado === null &&
    aula.justificativa === null &&
    declarar.length === 0 &&
    !aula.podeContestar &&
    !podeTrocar &&
    !podeDesistir
  ) {
    return null;
  }

  return (
    <>
      {estado !== null ? <SeloDaAula selo={estado} /> : null}
      {aula.justificativa !== null ? (
        <span className={estilos.selo} data-situacao={aula.justificativa}>
          {SELO_DA_JUSTIFICATIVA[aula.justificativa]}
        </span>
      ) : null}
      {declarar.map((acao) => (
        <button
          key={acao.rotulo}
          className={acao.rotulo === 'Desmarcar' ? estilos.botaoLink : estilos.chip}
          type="button"
          aria-pressed={acao.escolhido}
          onClick={() => void acoes.declarar(aula, acao)}
          disabled={acoes.ocupado}
        >
          {acao.rotulo}
        </button>
      ))}
      {podeDesistir ? (
        <button
          className={estilos.botaoLink}
          type="button"
          onClick={() => acoes.abrirDesistencia(aula.id)}
          disabled={acoes.ocupado}
        >
          Desistir da troca
        </button>
      ) : null}
      {podeTrocar ? (
        <button
          className={estilos.botaoLink}
          type="button"
          onClick={() => acoes.abrirTroca(aula.id)}
          disabled={acoes.ocupado}
        >
          Trocar para esta
        </button>
      ) : null}
      {aula.podeContestar ? (
        <button
          className={estilos.botaoLink}
          type="button"
          onClick={() => acoes.abrirContestacao(aula.id)}
          disabled={acoes.ocupado}
        >
          Eu estava na aula
        </button>
      ) : null}
    </>
  );
}

/** Recado e erro das ações, no alto da tela. */
export function MensagensDasAcoes({ acoes }: { acoes: AcoesDaAula }): React.JSX.Element | null {
  if (acoes.recado === null && acoes.erro === null) return null;
  return (
    <>
      {acoes.recado !== null ? (
        <p className={estilos.recado} role="status">
          {acoes.recado}
        </p>
      ) : null}
      {acoes.erro !== null ? (
        <p className={estilos.erro} role="alert">
          {acoes.erro}
        </p>
      ) : null}
    </>
  );
}

/** "Marcada, acima do plano" (prancheta `AvisoCota`): não bloqueia e tem Desfazer. */
export function AvisoAcimaDaCota({ acoes }: { acoes: AcoesDaAula }): React.JSX.Element | null {
  if (acoes.cota === null) return null;
  return (
    <div className={estilos.toast} role="status">
      <p className={estilos.toastTexto}>
        <strong>Marcada, acima do plano</strong>
        <span>{acoes.cota.texto}</span>
      </p>
      <button
        className={estilos.botaoLink}
        type="button"
        onClick={() => void acoes.desfazerAcimaDaCota()}
        disabled={acoes.ocupado}
      >
        Desfazer
      </button>
    </div>
  );
}
