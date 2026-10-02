import Link from 'next/link';

import {
  feitasDeEsperadas,
  formatarPercentual,
  rotulosDaFrequencia,
  type FrequenciaDaSemana,
  type FrequenciaDoMes,
} from '@/lib/frequencia';

import estilos from './CartaoDeFrequencia.module.css';

function Bloco({
  rotulo,
  percentual,
  feitas,
  esperadas,
}: {
  rotulo: string;
  percentual: number | null;
  feitas: number;
  esperadas: number;
}): React.JSX.Element {
  return (
    <span className={estilos.bloco}>
      <span className={estilos.rotulo}>{rotulo}</span>
      <span className={estilos.valor}>{formatarPercentual(percentual)}</span>
      <span className={estilos.rotulo}>{feitasDeEsperadas(feitas, esperadas)}</span>
    </span>
  );
}

/**
 * Semana e Mês lado a lado (o `freqCard` da linha F), levando às semanas do
 * mês. Os números são os do banco; aqui só se formata.
 */
export function CartaoDeFrequencia({
  semana,
  mes,
}: {
  semana: FrequenciaDaSemana | null;
  mes: FrequenciaDoMes | null;
}): React.JSX.Element {
  const rotulos = rotulosDaFrequencia(mes?.modalidade ?? semana?.modalidade ?? null);
  return (
    <Link className={estilos.cartao} href="/frequencia">
      <Bloco
        rotulo={rotulos.semana}
        percentual={semana?.percentual ?? null}
        feitas={semana?.feitas ?? 0}
        esperadas={semana?.esperadas ?? 0}
      />
      <Bloco
        rotulo={rotulos.mes}
        percentual={mes?.percentual ?? null}
        feitas={mes?.feitas ?? 0}
        esperadas={mes?.esperadas ?? 0}
      />
      <span className={estilos.seta} aria-hidden="true">
        ›
      </span>
      <span className={estilos.somenteLeitor}>Ver as semanas do mês</span>
    </Link>
  );
}
