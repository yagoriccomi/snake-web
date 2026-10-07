'use client';

import { useCallback, useEffect, useState } from 'react';

import { Protegida } from '@/components/Protegida';
import {
  aceitarDocumentos,
  buscarDocumentosComTexto,
  buscarDocumentosPendentes,
  rotuloDoAceite,
  TITULO_DO_DOCUMENTO,
  type DocumentoLegal,
} from '@/lib/dados';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

/**
 * Aceite da Política de Privacidade e dos Termos de Uso.
 *
 * O texto vem do banco, nunca daqui: é a versão exata que a pessoa aceitou que
 * precisa ficar registrada. O carimbo de quem, quando e qual versão é do banco
 * também — esta tela só pergunta.
 */
export default function PaginaDeTermos(): React.JSX.Element {
  return <Protegida etapa="termos">{() => <Termos />}</Protegida>;
}

function Termos(): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [pendentes, setPendentes] = useState<DocumentoLegal[]>([]);
  const [textos, setTextos] = useState<DocumentoLegal[]>([]);
  const [concordo, setConcordo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [aAceitar, comTexto] = await Promise.all([
        buscarDocumentosPendentes(),
        buscarDocumentosComTexto(),
      ]);
      if (aAceitar.length === 0) {
        window.location.href = '/inicio';
        return;
      }
      setPendentes(aAceitar);
      setTextos(comTexto.filter((documento) => aAceitar.some((p) => p.id === documento.id)));
      setEstado('pronto');
    } catch {
      setEstado('erro');
    }
  }, []);

  // O estado só muda depois da rede, nunca no corpo do efeito: nada de render em cascata.
  useEffect(() => {
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  const tentarDeNovo = useCallback(() => {
    setEstado('carregando');
    setErro(null);
    void carregar();
  }, [carregar]);

  const aceitar = useCallback(async () => {
    setErro(null);
    setEnviando(true);
    try {
      await aceitarDocumentos(pendentes.map((documento) => documento.id));
      window.location.href = '/inicio';
    } catch {
      setErro('Não foi possível registrar seu aceite. Verifique a conexão e tente de novo.');
      setEnviando(false);
    }
  }, [pendentes]);

  if (estado === 'carregando') {
    return <main className={estilos.aviso}>Carregando os documentos…</main>;
  }

  if (estado === 'erro') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>Não foi possível carregar</h1>
        <p className={estilos.texto}>Verifique sua internet e tente de novo.</p>
        <button className={estilos.botaoSecundario} type="button" onClick={tentarDeNovo}>
          Tentar de novo
        </button>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <header>
        <h1 className={estilos.titulo}>Antes de continuar</h1>
        <p className={estilos.texto}>
          {pendentes.length === 1
            ? 'Leia e aceite o documento abaixo para usar sua conta.'
            : 'Leia e aceite os documentos abaixo para usar sua conta.'}
        </p>
      </header>

      {textos.map((documento) => (
        <section className={estilos.documento} key={documento.id}>
          <h2 className={estilos.subtitulo}>
            {TITULO_DO_DOCUMENTO[documento.tipo]}
            <span className={estilos.versao}>versão {documento.versao}</span>
          </h2>
          {/* Rolagem própria: o texto é longo e não pode empurrar o botão para
              fora da tela — foi assim que o cadastro ficou inalcançável antes. */}
          <div className={estilos.corpo} tabIndex={0} role="region" aria-label={TITULO_DO_DOCUMENTO[documento.tipo]}>
            {documento.conteudo}
          </div>
        </section>
      ))}

      <label className={estilos.aceite}>
        <input
          type="checkbox"
          checked={concordo}
          onChange={(evento) => setConcordo(evento.target.checked)}
          disabled={enviando}
        />
        <span>{rotuloDoAceite(pendentes)}</span>
      </label>

      {erro !== null ? (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      ) : null}

      <button
        className={estilos.botao}
        type="button"
        onClick={() => void aceitar()}
        disabled={!concordo || enviando}
      >
        {enviando ? 'Registrando…' : 'Aceitar e continuar'}
      </button>

      <button
        className={estilos.botaoSecundario}
        type="button"
        onClick={() => {
          void supabase.auth.signOut().then(() => {
            window.location.href = '/';
          });
        }}
      >
        Sair sem aceitar
      </button>
    </main>
  );
}
