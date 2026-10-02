import { apagarTudoDoE2E, criarMundo, guardarMundo } from './apoio/banco';

/** Limpa o que uma rodada interrompida deixou e cria o plano, a turma e os documentos desta. */
export default async function prepararRodada(): Promise<void> {
  await apagarTudoDoE2E();
  guardarMundo(await criarMundo());
}
