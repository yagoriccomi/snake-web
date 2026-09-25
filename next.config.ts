import type { NextConfig } from 'next';

/** Destino do upload assinado do comprovante (o servidor devolve essa URL). */
const CLOUDINARY_UPLOAD = 'https://api.cloudinary.com';

const EM_DESENVOLVIMENTO = process.env.NODE_ENV !== 'production';

/** Só a origem (esquema, host e porta): é o que a CSP compara. */
function origem(url: string | undefined): string {
  if (url === undefined || url.trim() === '') return '';
  return new URL(url.trim()).origin;
}

/**
 * Para onde o navegador pode falar: o Supabase, o snake-server e a Cloudinary,
 * e mais nada. Um script injetado não consegue mandar dado para outro lugar.
 *
 * `'unsafe-inline'` em script e estilo é o preço de páginas estáticas: o
 * Next.js injeta scripts inline de hidratação, e a alternativa (nonce) obriga
 * toda página a ser renderizada a cada acesso. O ganho que importa aqui está em
 * `connect-src` e em `frame-ancestors`. Em desenvolvimento, o React pede
 * `eval` e a recarga ao salvar usa WebSocket.
 */
function politicaDeConteudo(): string {
  const conexoes = [
    "'self'",
    origem(process.env.NEXT_PUBLIC_SUPABASE_URL),
    origem(process.env.NEXT_PUBLIC_API_URL),
    CLOUDINARY_UPLOAD,
    ...(EM_DESENVOLVIMENTO ? ['ws:'] : []),
  ].filter((valor) => valor !== '');

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${EM_DESENVOLVIMENTO ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${conexoes.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Ninguém embute a página de login num site de terceiros (clickjacking).
    "frame-ancestors 'none'",
  ].join('; ');
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: politicaDeConteudo() },
          // A URL de /pagar/[id] leva o id da mensalidade: ele não sai daqui.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
