import { defineConfig, devices } from '@playwright/test';

import { lerAmbientePublico } from './e2e/apoio/ambiente';

/**
 * E2E do roteiro da Fase 1 contra o banco LOCAL (item 4.3, regra C6).
 *
 * A página sobe numa porta própria (não a 3001 do contêiner) com as mesmas
 * URL e chave anônima que o `.env.local` dá e que a trava conferiu como
 * locais. O envio de comprovante vai para o Storage, como no ambiente local.
 */
const PORTA = 3101;
const { url, anonKey } = lerAmbientePublico();

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // As telas leem o mesmo banco; em série, uma falha não confunde a outra.
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx next dev -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      NEXT_PUBLIC_PROOF_UPLOAD_TO_STORAGE: 'true',
    },
  },
});
