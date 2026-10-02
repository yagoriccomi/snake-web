'use client';

import { useCallback, useEffect, useState } from 'react';

import { CartaoDeAula } from '@/components/CartaoDeAula';
import { Protegida } from '@/components/Protegida';
import { agruparPorDia, buscarAulasDoAluno, inicioDoDia, type AulaDoAluno } from '@/lib/aulas';
import {
  avisarPresenca,
  justificarFalta,
  ROTULO_DA_JUSTIFICATIVA,
  TAMANHO_MAXIMO_DA_JUSTIFICATIVA,
} from '@/lib/dados';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

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

  const avisar = useCallback(
    async (aula: AulaDoAluno, vem: boolean) => {
      setErro(null);
      setOcupado(true);
      try {
        await avisarPresenca(aula.id, userId, vem ? 'present' : 'absent');
        setRecado(vem ? 'Avisamos que você vem.' : 'Avisamos que você não vem.');
        if (!vem) setEscrevendoPara(aula.id);
      } catch {
        setErro('Não foi possível avisar. Verifique a conexão e tente de novo.');
      } finally {
        setOcupado(false);
      }
    },
    [userId],
  );

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
        setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar.');
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
                    aula.justificativa !== null ? (
                      <span className={estilos.selo} data-situacao={aula.justificativa}>
                        {ROTULO_DA_JUSTIFICATIVA[aula.justificativa]}
                      </span>
                    ) : undefined
                  }
                >
                  {/* Os botões continuam os de hoje até o 6.2 trocar o aviso por declarar_aula. */}
                  {aula.justificativa === null && !aula.cancelada ? (
                    <div className={estilos.acoes}>
                      <button
                        className={estilos.botaoSecundario}
                        type="button"
                        onClick={() => void avisar(aula, true)}
                        disabled={ocupado}
                      >
                        Vou
                      </button>
                      <button
                        className={estilos.botaoSecundario}
                        type="button"
                        onClick={() => void avisar(aula, false)}
                        disabled={ocupado}
                      >
                        Não vou
                      </button>
                    </div>
                  ) : null}

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
    </main>
  );
}
