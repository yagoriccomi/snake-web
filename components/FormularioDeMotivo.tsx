'use client';

import { useId, useState } from 'react';

import { CampoDeAnexos } from '@/components/CampoDeAnexos';
import { BotoesDoEnvio, MensagensDoEnvio } from '@/components/EnvioComAnexos';
import { useEnvioComAnexos } from '@/hooks/useEnvioComAnexos';
import type { EtapasDoEnvio } from '@/lib/anexos';
import { TAMANHO_MAXIMO_DA_JUSTIFICATIVA } from '@/lib/justificativas';

import estilos from './FormularioDeMotivo.module.css';

/**
 * Texto obrigatório com o contador do limite do banco: a justificativa (falta
 * da aula, semana do livre, reenvio) e o motivo do "Eu estava na aula". Quem
 * chama decide qual RPC; o padrão é o da justificativa.
 *
 * Com `maximoDeAnexos`, o envio vai em três tempos (`useEnvioComAnexos`).
 */
export function FormularioDeMotivo({
  titulo,
  contexto,
  rotulo = 'Motivo da falta',
  dica = 'Conte o motivo da falta (obrigatório)',
  limite = TAMANHO_MAXIMO_DA_JUSTIFICATIVA,
  rotuloDoEnvio = 'Enviar justificativa',
  rotuloDoFechar = 'Agora não',
  maximoDeAnexos = 0,
  onEnviar,
  onFechar,
}: {
  titulo: string;
  /** Uma linha sobre o que se envia (a aula, a semana, a última tentativa). */
  contexto?: string;
  rotulo?: string;
  dica?: string;
  limite?: number;
  rotuloDoEnvio?: string;
  rotuloDoFechar?: string;
  /** Sem ele (ou 0), o formulário não mostra o campo de anexo. */
  maximoDeAnexos?: number;
  /**
   * Grava o texto; lança o erro para o formulário mostrar. Com anexo, devolve
   * as etapas seguintes; sem, resolve quando o banco aceitou.
   */
  onEnviar: (texto: string) => Promise<EtapasDoEnvio | void>;
  onFechar: () => void;
}): React.JSX.Element {
  const campo = useId();
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState<File[]>([]);
  const { fase, enviar, tentarDeNovo, concluir } = useEnvioComAnexos();

  const editando = fase.tipo === 'editando';
  const semCloudinary = fase.tipo === 'falhaNoAnexo' && fase.indisponivel;

  return (
    <div className={estilos.formulario}>
      <p className={estilos.titulo}>{titulo}</p>
      {contexto !== undefined ? <p className={estilos.contexto}>{contexto}</p> : null}
      <label className={estilos.rotulo} htmlFor={campo}>
        {rotulo}
      </label>
      <textarea
        id={campo}
        className={estilos.area}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={limite}
        rows={3}
        placeholder={dica}
        required
        disabled={!editando}
      />
      <p className={estilos.contador}>
        {texto.length}/{limite}
      </p>
      {maximoDeAnexos > 0 && !semCloudinary ? (
        <CampoDeAnexos
          arquivos={anexos}
          maximo={maximoDeAnexos}
          desabilitado={!editando}
          onMudar={setAnexos}
        />
      ) : null}
      <MensagensDoEnvio fase={fase} />
      <div className={estilos.acoes}>
        <BotoesDoEnvio
          fase={fase}
          podeEnviar={texto.trim() !== ''}
          rotuloDoEnvio={rotuloDoEnvio}
          rotuloDoFechar={rotuloDoFechar}
          onEnviar={() => void enviar(() => onEnviar(texto), anexos)}
          onTentarDeNovo={(pendentes) => void tentarDeNovo(pendentes)}
          onConcluir={(faltouAnexo) => void concluir(faltouAnexo)}
          onFechar={onFechar}
        />
      </div>
    </div>
  );
}
