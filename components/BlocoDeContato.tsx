'use client';

import { useContatoDaAcademia, type EstadoDoContato } from '@/hooks/useContatoDaAcademia';
import {
  formatarWhatsapp,
  linkDoEmail,
  linkDoWhatsapp,
  TEXTOS_DO_CONTATO,
  type ContatoDaAcademia,
} from '@/lib/contato';

import estilos from './BlocoDeContato.module.css';

/** Os botões WhatsApp e E-mail, só os preenchidos (§ 5.4). */
export function BotoesDeContato({ contato }: { contato: ContatoDaAcademia }): React.JSX.Element {
  return (
    <span className={estilos.botoes}>
      {contato.whatsapp !== null ? (
        <a
          className={estilos.botao}
          href={linkDoWhatsapp(contato.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${formatarWhatsapp(contato.whatsapp)}`}
        >
          WhatsApp
        </a>
      ) : null}
      {contato.email !== null ? (
        <a className={estilos.botao} href={linkDoEmail(contato.email)} aria-label={`E-mail ${contato.email}`}>
          E-mail
        </a>
      ) : null}
    </span>
  );
}

function ConteudoDoBloco({ estado }: { estado: EstadoDoContato }): React.JSX.Element {
  return (
    <>
      <p className={estilos.frase}>{TEXTOS_DO_CONTATO.blocoDoNegado}</p>
      {estado.situacao === 'pronto' ? <BotoesDeContato contato={estado.contato} /> : null}
    </>
  );
}

/**
 * Bloco de contato dos pedidos negados (§ 5.4: troca negada, "Eu estava na
 * aula" negado, justificativa negada pela 2ª vez). Sem contato cadastrado, ou
 * se a leitura falhar, fica só a frase, sem botões.
 */
export function BlocoDeContato(): React.JSX.Element {
  const estado = useContatoDaAcademia();
  return (
    <div className={estilos.bloco}>
      <ConteudoDoBloco estado={estado} />
    </div>
  );
}
