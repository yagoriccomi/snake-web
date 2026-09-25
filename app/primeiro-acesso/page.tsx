'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { Protegida } from '@/components/Protegida';
import { concluirPrimeiroAcesso } from '@/lib/primeiroAcesso';
import { supabase } from '@/lib/supabase';
import {
  apenasDigitos,
  celularEhValido,
  cpfEhValido,
  dataBrParaIso,
  faltaNaSenha,
  mascararCelular,
  mascararCpf,
  mascararData,
  nomeEhValido,
  senhaEhForte,
} from '@/lib/validacao';

import estilos from './page.module.css';

/**
 * Primeiro acesso: trocar a senha de entrada e confirmar os dados.
 *
 * A conta nasce com uma senha que a academia conhece — ela precisa virar uma
 * senha que só a pessoa sabe antes de qualquer outra coisa.
 *
 * Quem foi cadastrado como "não usa o aplicativo" já tem nome e CPF
 * preenchidos pela academia: aqui ele confirma e completa o que falta.
 */
export default function PaginaDePrimeiroAcesso(): React.JSX.Element {
  return (
    <Protegida etapa="primeiro-acesso">
      {(usuario) => <PrimeiroAcesso userId={usuario.id} />}
    </Protegida>
  );
}

function PrimeiroAcesso({ userId }: { userId: string }): React.JSX.Element {
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [celular, setCelular] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('name, cpf, phone, dob, is_first_login')
        .eq('id', userId)
        .maybeSingle();

      if (perfil === null || perfil.is_first_login !== true) {
        window.location.href = '/inicio';
        return;
      }
      // Quem foi cadastrado pela academia já chega com parte preenchida.
      setNome(String(perfil.name ?? ''));
      setCpf(perfil.cpf !== null ? mascararCpf(String(perfil.cpf)) : '');
      setCelular(perfil.phone !== null ? mascararCelular(String(perfil.phone)) : '');
      if (perfil.dob !== null) {
        const [ano, mes, dia] = String(perfil.dob).split('-');
        setNascimento(`${dia}/${mes}/${ano}`);
      }
      setCarregando(false);
    })();
  }, [userId]);

  const concluir = useCallback(
    async (evento: FormEvent) => {
      evento.preventDefault();
      setErro(null);

      if (!nomeEhValido(nome)) {
        setErro('Informe seu nome completo.');
        return;
      }
      if (!cpfEhValido(cpf)) {
        setErro('CPF inválido. Confira os números.');
        return;
      }
      if (!celularEhValido(celular)) {
        setErro('Informe um celular com DDD.');
        return;
      }
      const nascimentoIso = dataBrParaIso(nascimento);
      if (nascimentoIso === null) {
        setErro('Data de nascimento inválida. Use DD/MM/AAAA.');
        return;
      }
      if (!senhaEhForte(senha)) {
        setErro(`Sua senha precisa de ${faltaNaSenha(senha).join(', ')}.`);
        return;
      }
      if (senha !== confirmacao) {
        setErro('As duas senhas não são iguais.');
        return;
      }

      setSalvando(true);
      try {
        const { data: sessao } = await supabase.auth.getSession();
        const usuario = sessao.session?.user;
        if (usuario === undefined) {
          window.location.href = '/';
          return;
        }

        await concluirPrimeiroAcesso(supabase, {
          userId: usuario.id,
          nome: nome.trim(),
          cpf: apenasDigitos(cpf),
          celular: apenasDigitos(celular),
          nascimentoIso,
          senha,
        });

        window.location.href = '/inicio';
      } catch {
        setErro('Não foi possível concluir. Verifique a conexão e tente de novo.');
        setSalvando(false);
      }
    },
    [nome, cpf, celular, nascimento, senha, confirmacao],
  );

  if (carregando) {
    return <main className={estilos.aviso}>Carregando…</main>;
  }

  const pendenciasDaSenha = senha === '' ? [] : faltaNaSenha(senha);

  return (
    <main className={estilos.pagina}>
      <form className={estilos.formulario} onSubmit={concluir}>
        <header>
          <h1 className={estilos.titulo}>Bem-vindo</h1>
          <p className={estilos.texto}>
            Confirme seus dados e escolha uma senha só sua. A senha que a academia passou
            serve apenas para esta primeira vez.
          </p>
        </header>

        <div className={estilos.campo}>
          <label className={estilos.rotulo} htmlFor="nome">
            Nome completo
          </label>
          <input
            id="nome"
            className={estilos.entrada}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            disabled={salvando}
          />
        </div>

        <div className={estilos.campo}>
          <label className={estilos.rotulo} htmlFor="cpf">
            CPF
          </label>
          <input
            id="cpf"
            className={estilos.entrada}
            value={cpf}
            onChange={(e) => setCpf(mascararCpf(e.target.value))}
            inputMode="numeric"
            placeholder="000.000.000-00"
            disabled={salvando}
          />
        </div>

        <div className={estilos.campo}>
          <label className={estilos.rotulo} htmlFor="celular">
            Celular
          </label>
          <input
            id="celular"
            className={estilos.entrada}
            value={celular}
            onChange={(e) => setCelular(mascararCelular(e.target.value))}
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            autoComplete="tel"
            disabled={salvando}
          />
        </div>

        <div className={estilos.campo}>
          <label className={estilos.rotulo} htmlFor="nascimento">
            Data de nascimento
          </label>
          <input
            id="nascimento"
            className={estilos.entrada}
            value={nascimento}
            onChange={(e) => setNascimento(mascararData(e.target.value))}
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            disabled={salvando}
          />
        </div>

        <div className={estilos.campo}>
          <label className={estilos.rotulo} htmlFor="senha">
            Nova senha
          </label>
          <input
            id="senha"
            className={estilos.entrada}
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            disabled={salvando}
          />
          {/* Dizer o que falta enquanto digita evita o vaivém de tentar,
              ser recusado e adivinhar qual regra quebrou. */}
          {pendenciasDaSenha.length > 0 ? (
            <p className={estilos.dica}>Falta: {pendenciasDaSenha.join(', ')}.</p>
          ) : senha !== '' ? (
            <p className={estilos.dicaOk}>Senha forte ✓</p>
          ) : null}
        </div>

        <div className={estilos.campo}>
          <label className={estilos.rotulo} htmlFor="confirmacao">
            Repita a senha
          </label>
          <input
            id="confirmacao"
            className={estilos.entrada}
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
            disabled={salvando}
          />
        </div>

        {erro !== null ? (
          <p className={estilos.erro} role="alert">
            {erro}
          </p>
        ) : null}

        <button className={estilos.botao} type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Concluir'}
        </button>
      </form>
    </main>
  );
}
