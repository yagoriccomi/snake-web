import { execSync } from 'node:child_process';
import path from 'node:path';

import { loadEnvConfig } from '@next/env';

/**
 * De onde o E2E tira os endereços e as chaves — e a trava que impede rodar
 * fora do banco local.
 *
 * O E2E cria e apaga contas. Contra a produção, isso seria perda de dado de
 * gente de verdade, então a URL precisa ser `localhost` ou `127.0.0.1`, e a
 * chave de serviço vem do `supabase status` do banco local, na hora, sem
 * passar por arquivo nenhum (regra C6 da coordenação).
 */

const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1']);

export interface AmbientePublico {
  url: string;
  anonKey: string;
}

function exigirLocal(url: string, origem: string): void {
  const host = new URL(url).hostname;
  if (!HOSTS_LOCAIS.has(host)) {
    throw new Error(
      `E2E recusado: ${origem} aponta para "${host}". O E2E só roda contra o banco local.`,
    );
  }
}

/** Porta da URL, com a padrão do protocolo quando ela não aparece. */
function porta(url: string): string {
  const endereco = new URL(url);
  return endereco.port !== '' ? endereco.port : endereco.protocol === 'https:' ? '443' : '80';
}

/** URL e chave anônima do `.env.local`, as mesmas que a página usa. */
export function lerAmbientePublico(): AmbientePublico {
  loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (url === '' || anonKey === '') {
    throw new Error('E2E: preencha NEXT_PUBLIC_SUPABASE_URL e a chave anônima no .env.local.');
  }
  exigirLocal(url, 'NEXT_PUBLIC_SUPABASE_URL');
  return { url, anonKey };
}

interface StatusLocal {
  API_URL?: string;
  SERVICE_ROLE_KEY?: string;
  DB_URL?: string;
}

/** O `supabase status` do `snake-thai` (`E2E_SNAKE_THAI_DIR`, padrão `../snake-thai`). */
function lerStatusLocal(): StatusLocal {
  const pasta = process.env.E2E_SNAKE_THAI_DIR ?? path.resolve(process.cwd(), '..', 'snake-thai');
  const saida = execSync('npx --no-install supabase status -o json', {
    cwd: pasta,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(saida) as StatusLocal;
}

/**
 * Conexão direta com o Postgres local, só para a limpeza do que a API não
 * apaga (aula com chamada concluída). Vem de `E2E_DB_URL` ou do status, e
 * passa pela mesma trava de endereço local.
 */
export function lerUrlDoBancoLocal(): string {
  const url = process.env.E2E_DB_URL ?? lerStatusLocal().DB_URL ?? '';
  if (url === '') throw new Error('E2E: o supabase status não trouxe o endereço do banco.');
  exigirLocal(url, 'o endereço do banco');
  process.env.E2E_DB_URL = url;
  return url;
}

/**
 * Chave de serviço do banco local. Vem de `E2E_SUPABASE_SERVICE_ROLE_KEY` ou,
 * sem ela, do `supabase status` do `snake-thai`. Confere que o status fala do
 * mesmo banco que a página.
 */
export function lerChaveDeServico(urlDaPagina: string): string {
  const daVariavel = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (daVariavel !== undefined && daVariavel !== '') {
    return daVariavel;
  }

  const status = lerStatusLocal();
  if (status.DB_URL !== undefined) {
    exigirLocal(status.DB_URL, 'o endereço do banco');
    process.env.E2E_DB_URL = status.DB_URL;
  }
  const urlDoStatus = status.API_URL ?? '';
  exigirLocal(urlDoStatus, 'o supabase status');
  if (porta(urlDoStatus) !== porta(urlDaPagina)) {
    throw new Error(
      'E2E recusado: o supabase status e o .env.local apontam para bancos locais diferentes.',
    );
  }
  if (status.SERVICE_ROLE_KEY === undefined || status.SERVICE_ROLE_KEY === '') {
    throw new Error('E2E: o supabase status não trouxe a chave de serviço. O banco local está no ar?');
  }
  return status.SERVICE_ROLE_KEY;
}
