import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Valores de mentira: lib/env.ts exige as três, e nenhum teste fala com a rede.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:55321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'chave-de-teste',
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    },
  },
});
