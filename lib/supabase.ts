'use client';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

/**
 * Cliente único do Supabase (singleton), igual ao do aplicativo.
 *
 * A página conversa com o banco **do navegador**, protegida pela mesma RLS que
 * protege o app. Não há caminho paralelo: o que o aluno não pode ver no
 * celular, ele também não vê aqui.
 *
 * O que exige segredo — assinar o envio do comprovante para a Cloudinary —
 * continua sendo do backend próprio (`snake-server`), nunca daqui.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Sem fluxo de redirecionamento: a entrada é por e-mail e senha.
    detectSessionInUrl: false,
  },
});
