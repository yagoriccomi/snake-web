'use client';

import { useCallback, useEffect, useState } from 'react';

import { CartaoDeAula, SeloDaAula } from '@/components/CartaoDeAula';
import { Protegida } from '@/components/Protegida';
import {
  acoesDeDeclarar,
  agruparPorDia,
  avisoDeCota,
  buscarAulasDoAluno,
  declararAula,
  estadoDaAula,
  inicioDoDia,
  type AcaoDeDeclarar,
  type AulaDoAluno,
} from '@/lib/aulas';
import {
  justificarFalta,
  ROTULO_DA_JUSTIFICATIVA,
  TAMANHO_MAXIMO_DA_JUSTIFICATIVA,
} from '@/lib/dados';
import { mensagemDaJustificativa, mensagemDoAviso } from '@/lib/erros';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

/** O aviso de acima da cota guarda a aula, para o "Desfazer" saber o que desmarcar. */
interface AvisoDeCota {
  classId: string;
  texto: string;
}

const RECADO_DA_ACAO: Record<AcaoDeDeclarar['rotulo'], string> = {
  Vou: 'Avisamos que você vem.',
  'Vou (extra)': 'Avisamos que você vem.',
  'Não vou': 'Avisamos que você não vem.',
  Desmarcar: 'Marcação desfeita.',
};

/** Hoje e os próximos seis dias: a semana que o aluno precisa enxergar. */
const DIAS_NA_TELA = 7;
const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

/**
 * Próximas aulas: avisar que vem, avisar que falta e justificar.
 *
 * O aviso é intenção, não presença — quem marca presença é o professor, na
 * chamada. A tela diz isso, para ninguém achar que avisar já conta.
 */
export default function PaginaDeAulas(): React.JSX.Element {
  return <Protegida etapa="aluno">{(usuario) => <Aulas userId={usuario.id} />}</Protegida>;
}

function Aulas({ userId }: { userId: string }): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [aulas, setAulas] = useState<AulaDoAluno[]>([]);
  const [escrevendoPara, setEscrevendoPara] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [cota, setCota] = useState<AvisoDeCota | null>(null);

  const carregar = useCallback(async () => {
    try {
      const de = inicioDoDia(new Date());
      const ate = new Date(de.getTime() + DIAS_NA_TELA * UM_DIA_EM_MS);
      setAulas(await buscarAulasDoAluno(supabase, de, ate));
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

  const declarar = useCallback(
    async (aula: AulaDoAluno, acao: AcaoDeDeclarar) => {
      setErro(null);
      setRecado(null);
      setCota(null);
      setOcupado(true);
      try {
        const declaracao = await declararAula(supabase, aula.id, acao.vou);
        const acima = avisoDeCota(declaracao);
        if (acima !== null) {
          setCota({ classId: aula.id, texto: acima });
        } else {
          setRecado(RECADO_DA_ACAO[acao.rotulo]);
        }
        // Só o "Não vou" do fixo, na aula da grade, abre a justificativa.
        if (acao.rotulo === 'Não vou') setEscrevendoPara(aula.id);
        await carregar();
      } catch (falha) {
        setErro(mensagemDoAviso(falha));
      } finally {
        setOcupado(false);
      }
    },
    [carregar],
  );

  const desfazerAcimaDaCota = useCallback(async () => {
    if (cota === null) return;
    setErro(null);
    setOcupado(true);
    try {
      await declararAula(supabase, cota.classId, false);
      setCota(null);
      setRecado(RECADO_DA_ACAO.Desmarcar);
      await carregar();
    } catch (falha) {
      setErro(mensagemDoAviso(falha));
    } finally {
      setOcupado(false);
    }
  }, [cota, carregar]);

  const enviarJustificativa = useCallback(
    async (classId: string) => {
      setErro(null);
      setOcupado(true);
      try {
        await justificarFalta(classId, userId, texto);
        setTexto('');
        setEscrevendoPara(null);
        setRecado('Justificativa enviada. A academia vai analisar.');
        await carregar();
      } catch (falha) {
        setErro(mensagemDaJustificativa(falha));
      } finally {
        setOcupado(false);
      }
    },
    [userId, texto, carregar],
  );

  if (estado === 'carregando') {
    return <main className={estilos.aviso} role="status">Carregando…</main>;
  }

  if (estado === 'erro') {
    return (
      <main className={estilos.aviso}>
        <h1 className={estilos.titulo}>Não foi possível carregar</h1>
        <button className={estilos.botaoSecundario} type="button" onClick={() => void carregar()}>
          Tentar de novo
        </button>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <header>
        <a className={estilos.link} href="/inicio">
          ← Início
        </a>
        <h1 className={estilos.titulo}>Aulas</h1>
        <p className={estilos.texto}>
          Marcar é intenção: a presença vale pela chamada do professor.
        </p>
      </header>

      {recado !== null ? (
        <p className={estilos.recado} role="status">
          {recado}
        </p>
      ) : null}
      {erro !== null ? (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      ) : null}

      {aulas.length === 0 ? (
        <p className={estilos.vazio}>Nenhuma aula marcada por enquanto.</p>
      ) : (
        agruparPorDia(aulas, new Date()).map((dia) => (
          <section className={estilos.dia} key={dia.chave} aria-labelledby={`dia-${dia.chave}`}>
            <h2 className={estilos.rotuloDoDia} id={`dia-${dia.chave}`}>
              {dia.rotulo}
            </h2>
            <ul className={estilos.lista}>
              {dia.aulas.map((aula) => (
                <CartaoDeAula
                  key={aula.id}
                  aula={aula}
                  lateral={
                    <AcoesDaAula
                      aula={aula}
                      ocupado={ocupado}
                      onDeclarar={(acao) => void declarar(aula, acao)}
                    />
                  }
                >
                  {escrevendoPara === aula.id ? (
                    <div className={estilos.formulario}>
                      <label className={estilos.rotulo} htmlFor={`motivo-${aula.id}`}>
                        Motivo da falta (opcional)
                      </label>
                      <textarea
                        id={`motivo-${aula.id}`}
                        className={estilos.area}
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        maxLength={TAMANHO_MAXIMO_DA_JUSTIFICATIVA}
                        rows={3}
                        placeholder="Conte o motivo, se quiser que a falta seja analisada"
                        disabled={ocupado}
                      />
                      <p className={estilos.contador}>
                        {texto.length}/{TAMANHO_MAXIMO_DA_JUSTIFICATIVA}
                      </p>
                      <div className={estilos.acoes}>
                        <button
                          className={estilos.botao}
                          type="button"
                          onClick={() => void enviarJustificativa(aula.id)}
                          disabled={ocupado || texto.trim() === ''}
                        >
                          {ocupado ? 'Enviando…' : 'Enviar justificativa'}
                        </button>
                        <button
                          className={estilos.botaoSecundario}
                          type="button"
                          onClick={() => {
                            setEscrevendoPara(null);
                            setTexto('');
                          }}
                          disabled={ocupado}
                        >
                          Agora não
                        </button>
                      </div>
                    </div>
                  ) : null}
                </CartaoDeAula>
              ))}
            </ul>
          </section>
        ))
      )}

      {cota !== null ? (
        <div className={estilos.toast} role="status">
          <p className={estilos.toastTexto}>
            <strong>Marcada, acima do plano</strong>
            <span>{cota.texto}</span>
          </p>
          <button
            className={estilos.botaoLink}
            type="button"
            onClick={() => void desfazerAcimaDaCota()}
            disabled={ocupado}
          >
            Desfazer
          </button>
        </div>
      ) : null}
    </main>
  );
}

/**
 * Coluna da direita do cartão: o estado (Marcada, Extra, a justificativa) e os
 * botões de declarar, escolhidos só pelas colunas (tabela de ações da § 12.2).
 */
function AcoesDaAula({
  aula,
  ocupado,
  onDeclarar,
}: {
  aula: AulaDoAluno;
  ocupado: boolean;
  onDeclarar: (acao: AcaoDeDeclarar) => void;
}): React.JSX.Element | null {
  const estado = estadoDaAula(aula);
  const acoes = acoesDeDeclarar(aula, new Date());
  if (estado === null && aula.justificativa === null && acoes.length === 0) return null;

  return (
    <>
      {estado !== null ? <SeloDaAula selo={estado} /> : null}
      {aula.justificativa !== null ? (
        <span className={estilos.selo} data-situacao={aula.justificativa}>
          {ROTULO_DA_JUSTIFICATIVA[aula.justificativa]}
        </span>
      ) : null}
      {acoes.map((acao) => (
        <button
          key={acao.rotulo}
          className={acao.rotulo === 'Desmarcar' ? estilos.botaoLink : estilos.chip}
          type="button"
          aria-pressed={acao.escolhido}
          onClick={() => onDeclarar(acao)}
          disabled={ocupado}
        >
          {acao.rotulo}
        </button>
      ))}
    </>
  );
}
