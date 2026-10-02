import {
  estadoDaAula,
  formatarHora,
  notaDaTroca,
  selosDaAula,
  type AulaDoAluno,
  type Selo,
} from '@/lib/aulas';

import estilos from './CartaoDeAula.module.css';

export function SeloDaAula({ selo }: { selo: Selo }): React.JSX.Element {
  return (
    <span className={estilos.selo} data-tom={selo.tom}>
      {selo.texto}
    </span>
  );
}

/**
 * Uma aula, como na linha F dos mockups: hora, trilho com a cor de cada
 * professor, título, selos e professores, e à direita o estado ou a ação.
 *
 * `lateral` substitui o estado à direita (ex.: os botões da tela Aulas);
 * `children` vem embaixo da linha (ex.: o formulário da justificativa).
 */
export function CartaoDeAula({
  aula,
  lateral,
  children,
}: {
  aula: AulaDoAluno;
  lateral?: React.ReactNode;
  children?: React.ReactNode;
}): React.JSX.Element {
  const estado = estadoDaAula(aula);
  const nota = notaDaTroca(aula);
  const comCor = aula.professores.filter((p) => p.cor !== null);

  return (
    <li className={estilos.cartao}>
      <div className={estilos.linha} data-cancelada={aula.cancelada}>
        <time className={estilos.hora} dateTime={aula.quando}>
          {formatarHora(aula.quando)}
        </time>
        {/* A cor só repete o nome do professor, que já está escrito ao lado. */}
        {comCor.length > 0 ? (
          <span className={estilos.trilho} aria-hidden="true">
            {comCor.map((professor, indice) => (
              <span key={indice} style={{ background: professor.cor ?? undefined }} />
            ))}
          </span>
        ) : null}
        <div className={estilos.corpo}>
          <p className={estilos.titulo}>{aula.titulo}</p>
          <p className={estilos.detalhes}>
            {selosDaAula(aula).map((selo) => (
              <SeloDaAula key={selo.texto} selo={selo} />
            ))}
            {aula.professores.map((professor, indice) => (
              <span key={indice} className={estilos.professor}>
                {professor.cor !== null ? (
                  <span
                    className={estilos.ponto}
                    style={{ background: professor.cor }}
                    aria-hidden="true"
                  />
                ) : null}
                {professor.nome.split(' ')[0]}
              </span>
            ))}
          </p>
          {nota !== null ? <p className={estilos.nota}>{nota}</p> : null}
        </div>
        {lateral !== undefined ? (
          <div className={estilos.lateral}>{lateral}</div>
        ) : estado !== null ? (
          <div className={estilos.lateral}>
            <SeloDaAula selo={estado} />
          </div>
        ) : null}
      </div>
      {children}
    </li>
  );
}
