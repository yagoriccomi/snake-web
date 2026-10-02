import { apagarTudoDoE2E } from './apoio/banco';

/** Nada do E2E fica no banco local depois da rodada. */
export default async function encerrarRodada(): Promise<void> {
  await apagarTudoDoE2E();
}
