import { contagem, type ResumoDaSemana as Resumo } from '@/lib/aulas';

import estilos from './ResumoDaSemana.module.css';

/**
 * "Esta semana" da linha F: no livre, a cota em barra (feitas + marcadas); no
 * à vontade, a meta. O fixo não tem este cartão. Os números são os das
 * colunas de `aulas_do_aluno`, contados como o app conta.
 *
 * `acao` fica ao lado do título (o "Mudar" da meta, no 6.5).
 */
export function ResumoDaSemana({
  resumo,
  acao,
}: {
  resumo: Resumo;
  acao?: React.ReactNode;
}): React.JSX.Element | null {
  if (resumo.meta === null || resumo.modalidade === 'fixed' || resumo.modalidade === null) {
    return null;
  }

  if (resumo.modalidade === 'unlimited') {
    return (
      <div className={estilos.cartao}>
        <div className={estilos.topo}>
          <p className={estilos.titulo}>{`Meta: ${resumo.meta}x por semana`}</p>
          {acao}
        </div>
        <p className={estilos.detalhe}>
          {`${contagem(resumo.feitas, 'feita', 'feitas')} nesta semana. Faltas não precisam de justificativa: só contam na sua meta.`}
        </p>
      </div>
    );
  }

  // A barra cresce além da cota quando ele marca mais (acima da cota não bloqueia).
  const total = Math.max(resumo.meta, resumo.feitas + resumo.marcadas, 1);
  return (
    <div className={estilos.cartao}>
      <div className={estilos.topo}>
        <p className={estilos.titulo}>Esta semana</p>
        <p className={estilos.detalhe}>{`cota ${resumo.meta}x`}</p>
      </div>
      {/* O texto abaixo diz o mesmo que a barra; ela fica fora do leitor de tela. */}
      <div className={estilos.barra} aria-hidden="true">
        <span className={estilos.feitas} style={{ width: `${(resumo.feitas / total) * 100}%` }} />
        <span
          className={estilos.marcadas}
          style={{ width: `${(resumo.marcadas / total) * 100}%` }}
        />
      </div>
      <p className={estilos.detalhe}>
        {`${contagem(resumo.feitas, 'feita', 'feitas')} · ${contagem(resumo.marcadas, 'marcada', 'marcadas')}`}
      </p>
    </div>
  );
}
