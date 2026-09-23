'use client';

import { useCallback, useState, type FormEvent } from 'react';

import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

/**
 * Entrada do aluno.
 *
 * A conta é a mesma do aplicativo. Quem chega aqui normalmente é quem tem
 * iPhone e não tem por onde entrar — por isso a página não pede cadastro:
 * quem cria a conta é a academia.
 */
export default function PaginaDeEntrada(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const entrar = useCallback(
    async (evento: FormEvent) => {
      evento.preventDefault();
      setErro(null);
      setEntrando(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: senha,
        });
        if (error !== null) {
          // Não assuma senha errada: sem rede, a pessoa digitaria a senha certa
          // de novo e de novo achando que errou. Mesmo cuidado do aplicativo.
          setErro(
            /fetch|network|failed/i.test(error.message)
              ? 'Falha de conexão. Verifique sua internet e tente novamente.'
              : 'E-mail ou senha inválidos.',
          );
          return;
        }
        window.location.href = '/inicio';
      } catch {
        setErro('Falha de conexão. Verifique sua internet e tente novamente.');
      } finally {
        setEntrando(false);
      }
    },
    [email, senha],
  );

  return (
    <main className={estilos.tela}>
      <form className={estilos.cartao} onSubmit={entrar}>
        <h1 className={estilos.marca}>Snake Thai</h1>
        <p className={estilos.chamada}>
          Acompanhe sua frequência, veja suas aulas e envie o comprovante de pagamento.
        </p>

        <div className={estilos.campo}>
          <label className={estilos.rotulo} htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            className={estilos.entrada}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            disabled={entrando}
            required
          />
        </div>

        <div className={estilos.campo}>
          <label className={estilos.rotulo} htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            className={estilos.entrada}
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            disabled={entrando}
            required
          />
        </div>

        {erro !== null ? (
          <p className={estilos.erro} role="alert">
            {erro}
          </p>
        ) : null}

        <button className={estilos.botao} type="submit" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className={estilos.rodape}>
          Sua conta é criada pela academia. Esqueceu a senha? Procure a recepção — um
          administrador reinicia seu acesso.
        </p>
      </form>
    </main>
  );
}
