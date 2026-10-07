'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';

import { Protegida } from '@/components/Protegida';
import {
  enviarComprovante,
  ErroDeEnvio,
  problemaNoArquivo,
  TAMANHO_MAXIMO_MB,
  TIPOS_ACEITOS,
} from '@/lib/comprovante';
import { formatarData, formatarDinheiro } from '@/lib/dados';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

interface Mensalidade {
  id: string;
  vencimento: string;
  valorCentavos: number;
}

type Estado = 'carregando' | 'pronto' | 'enviando' | 'enviado' | 'nao-encontrada';

/**
 * Pagar uma mensalidade: copiar a chave PIX e enviar o comprovante.
 *
 * A chave vem da configuração da academia, a mesma que o aplicativo mostra.
 */
export default function PaginaDePagamento({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.JSX.Element {
  const { id } = use(params);
  return <Protegida etapa="aluno">{() => <Pagamento id={id} />}</Protegida>;
}

function Pagamento({ id }: { id: string }): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [mensalidade, setMensalidade] = useState<Mensalidade | null>(null);
  const [chavePix, setChavePix] = useState<string | null>(null);
  const [copiada, setCopiada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const seletorDeArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: pagamento }, { data: config }] = await Promise.all([
        supabase
          .from('payments')
          .select('id, due_date, amount_cents, status')
          .eq('id', id)
          .maybeSingle(),
        supabase.from('academy_settings').select('pix_key').maybeSingle(),
      ]);

      if (pagamento === null) {
        setEstado('nao-encontrada');
        return;
      }
      setMensalidade({
        id: String(pagamento.id),
        vencimento: String(pagamento.due_date),
        valorCentavos: Number(pagamento.amount_cents),
      });
      const chave = config?.pix_key ?? null;
      setChavePix(chave !== null && String(chave).trim() !== '' ? String(chave) : null);
      setEstado(pagamento.status === 'pending_approval' ? 'enviado' : 'pronto');
    })();
  }, [id]);

  const copiar = useCallback(async () => {
    if (chavePix === null) return;
    try {
      await navigator.clipboard.writeText(chavePix);
      setCopiada(true);
      window.setTimeout(() => setCopiada(false), 2500);
    } catch {
      // Navegador sem permissão de área de transferência: a chave continua
      // selecionável na tela, então dizer isso é melhor que um erro seco.
      setErro('Não foi possível copiar. Selecione a chave acima e copie à mão.');
    }
  }, [chavePix]);

  const escolher = useCallback(async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0];
    if (arquivo === undefined) return;

    const problema = problemaNoArquivo(arquivo);
    if (problema !== null) {
      setErro(problema);
      return;
    }

    setErro(null);
    setEstado('enviando');
    try {
      await enviarComprovante(id, arquivo);
      setEstado('enviado');
    } catch (falha) {
      setErro(falha instanceof ErroDeEnvio ? falha.message : 'Não foi possível enviar. Tente de novo.');
      setEstado('pronto');
    } finally {
      // Sem isto, escolher o MESMO arquivo de novo não dispara nada — o
      // navegador entende que o valor não mudou, e a tela fica muda.
      if (seletorDeArquivo.current !== null) {
        seletorDeArquivo.current.value = '';
      }
    }
  }, [id]);

  if (estado === 'carregando') {
    return <main className={estilos.aviso} role="status">Carregando…</main>;
  }

  if (estado === 'nao-encontrada') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>Mensalidade não encontrada</h1>
        <a className={estilos.voltar} href="/inicio">
          Voltar
        </a>
      </main>
    );
  }

  if (estado === 'enviado') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>
          Comprovante enviado <span aria-hidden="true">✓</span>
        </h1>
        <p className={estilos.texto}>
          Seu pagamento está <strong>em análise</strong>. A academia confere e confirma.
        </p>
        <a className={estilos.voltar} href="/inicio">
          Voltar ao início
        </a>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <header>
        <a className={estilos.link} href="/inicio">
          ← Início
        </a>
        <h1 className={estilos.titulo}>Pagar mensalidade</h1>
        {mensalidade !== null ? (
          <p className={estilos.texto}>
            {formatarDinheiro(mensalidade.valorCentavos)} · vence em{' '}
            {formatarData(mensalidade.vencimento)}
          </p>
        ) : null}
      </header>

      <section className={estilos.cartao}>
        <h2 className={estilos.secao}>Chave PIX da academia</h2>
        {chavePix === null ? (
          <p className={estilos.texto}>
            A academia ainda não cadastrou a chave PIX. Procure a recepção.
          </p>
        ) : (
          <>
            <p className={estilos.chave}>{chavePix}</p>
            <button className={estilos.botaoSecundario} type="button" onClick={() => void copiar()}>
              {copiada ? 'Chave copiada ✓' : 'Copiar chave PIX'}
            </button>
          </>
        )}
        <p className={estilos.dica}>Pague pelo app do seu banco e anexe o comprovante abaixo.</p>
      </section>

      <section className={estilos.cartao}>
        <h2 className={estilos.secao}>Comprovante</h2>
        <p className={estilos.dica}>
          Foto (JPG, PNG ou WEBP) ou PDF, até {TAMANHO_MAXIMO_MB} MB.
        </p>
        <input
          ref={seletorDeArquivo}
          id="comprovante"
          className={estilos.arquivo}
          type="file"
          accept={TIPOS_ACEITOS}
          onChange={(evento) => void escolher(evento)}
          disabled={estado === 'enviando'}
        />
        <label className={estilos.botao} htmlFor="comprovante">
          {estado === 'enviando' ? 'Enviando…' : 'Escolher arquivo'}
        </label>
      </section>

      {erro !== null ? (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      ) : null}
    </main>
  );
}
