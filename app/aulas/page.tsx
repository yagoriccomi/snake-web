'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  avisarPresenca,
  buscarMinhasJustificativas,
  buscarProximasAulas,
  formatarDataHora,
  justificarFalta,
  ROTULO_DA_JUSTIFICATIVA,
  TAMANHO_MAXIMO_DA_JUSTIFICATIVA,
  type Aula,
  type Justificativa,
} from '@/lib/dados';
import { supabase } from '@/lib/supabase';

import estilos from './page.module.css';

type Estado = 'carregando' | 'pronto' | 'erro';

/**
 * Próximas aulas: avisar que vem, avisar que falta e justificar.
 *
 * O aviso é intenção, não presença — quem marca presença é o professor, na
 * chamada. A tela diz isso, para ninguém achar que avisar já conta.
 */
export default function PaginaDeAulas(): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [justificativas, setJustificativas] = useState<Justificativa[]>([]);
  const [userId, setUserId] = useState('');
  const [escrevendoPara, setEscrevendoPara] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getSession();
    const usuario = sessao.session?.user;
    if (usuario === undefined) {
      window.location.href = '/';
      return;
    }
    setUserId(usuario.id);
    try {
      const [proximas, minhas] = await Promise.all([
        buscarProximasAulas(10),
        buscarMinhasJustificativas(usuario.id),
      ]);
      setAulas(proximas);
      setJustificativas(minhas);
      setEstado('pronto');
    } catch {
      setEstado('erro');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const avisar = useCallback(
    async (aula: Aula, vem: boolean) => {
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
    return <main className={estilos.aviso}>Carregando…</main>;
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
        <h1 className={estilos.titulo}>Próximas aulas</h1>
        <p className={estilos.texto}>
          Avisar não conta presença — quem marca é o professor, na chamada.
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
        <ul className={estilos.lista}>
          {aulas.map((aula) => {
            const justificativa = justificativas.find((j) => j.classId === aula.id);
            return (
              <li className={estilos.item} key={aula.id}>
                <div className={estilos.cabecalhoDoItem}>
                  <div>
                    <p className={estilos.quando}>{formatarDataHora(aula.quando)}</p>
                    <p className={estilos.turma}>{aula.titulo}</p>
                  </div>
                  {justificativa !== undefined ? (
                    <span className={estilos.selo} data-situacao={justificativa.situacao}>
                      {ROTULO_DA_JUSTIFICATIVA[justificativa.situacao]}
                    </span>
                  ) : null}
                </div>

                {justificativa === undefined ? (
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
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
