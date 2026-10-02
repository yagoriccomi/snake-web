import { randomBytes, randomInt } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';

import { lerAmbientePublico, lerChaveDeServico, lerUrlDoBancoLocal } from './ambiente';

/**
 * Os dados sintéticos do E2E: criados no começo, apagados no fim (regra C6).
 *
 * Nada aqui conta com o seed do banco local, que o chat do snake-thai recria a
 * cada bloco. Tudo o que o E2E cria leva uma marca que o resto do banco nunca
 * usa — e-mail em `@e2e.invalid`, turma `e2e-…`, plano `E2E …`, documento
 * `e2e-…` —, e a limpeza apaga só o que tem essa marca.
 */

export const DOMINIO_DE_TESTE = 'e2e.invalid';
const PREFIXO = 'e2e-';
const PREFIXO_DO_PLANO = 'E2E ';
const BUCKET_DE_COMPROVANTES = 'payment_proofs';
const COR_DO_PROFESSOR = '#FF6B35';
const CELULAR_SINTETICO = '11900000000';
const VARIAVEL_DO_MUNDO = 'E2E_MUNDO';
const TIPOS_DE_DOCUMENTO = ['terms_of_use', 'privacy_policy'] as const;
const DIAS_NA_ACADEMIA = 30;

export const TEXTO_DO_DOCUMENTO =
  'Documento sintético do teste automatizado. Não vale como Política nem como Termos.';

/** O que a rodada inteira compartilha: plano, turma e, se faltarem, os documentos. */
export interface Mundo {
  rodada: string;
  planoId: string;
  /** Plano de horário livre com cota de 1x por semana: a segunda marcada já passa da cota. */
  planoLivreId: string;
  /** Plano à vontade (sem cota; a meta é do aluno). */
  planoAVontadeId: string;
  turmaId: string;
  /** Turma de que as contas sintéticas não fazem parte. */
  outraTurmaId: string;
}

export interface Conta {
  id: string;
  email: string;
  senha: string;
  nome: string;
  cpf: string;
}

export interface OpcoesDeConta {
  papel?: 'user' | 'professor';
  /** Conta com `is_first_login = true`. */
  primeiroAcesso?: boolean;
  /** Aluno "Não usa o app": a academia já preencheu nome e CPF. */
  semApp?: boolean;
  /** Já aceitou os documentos vigentes. */
  termosAceitos?: boolean;
  /** Horário livre (cota 1x); sem isto, horário fixo. */
  livre?: boolean;
  /** À vontade; sem isto, horário fixo. */
  aVontade?: boolean;
}

let cliente: SupabaseClient | null = null;

/** Cliente com a chave de serviço do banco local: passa por cima da RLS. */
export function banco(): SupabaseClient {
  if (cliente !== null) return cliente;
  const { url } = lerAmbientePublico();
  const chave = lerChaveDeServico(url);
  // Os processos dos testes herdam a chave daqui, sem chamar o status de novo.
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY = chave;
  cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}

/** Sem dado, a falha diz em que passo foi; o teste não segue com estado pela metade. */
function exigir<T>(
  resposta: { data: T; error: { message: string } | null },
  passo: string,
): NonNullable<T> {
  if (resposta.error !== null || resposta.data === null) {
    throw new Error(`E2E: ${passo} falhou: ${resposta.error?.message ?? 'sem dados'}`);
  }
  return resposta.data as NonNullable<T>;
}

function sufixo(): string {
  return randomBytes(4).toString('hex');
}

/** Senha que passa na regra da web: minúscula, maiúscula, número e símbolo. */
export function senhaSintetica(): string {
  return `E2e-${randomBytes(6).toString('hex')}-Aa1!`;
}

/** CPF com dígitos verificadores válidos, inventado na hora. */
export function cpfSintetico(): string {
  const base = Array.from({ length: 9 }, () => randomInt(10));
  if (base.every((d) => d === base[0])) base[0] = (base[0] + 1) % 10;
  const digito = (numeros: number[]): number => {
    const soma = numeros.reduce((total, d, i) => total + d * (numeros.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const primeiro = digito(base);
  const segundo = digito([...base, primeiro]);
  return [...base, primeiro, segundo].join('');
}

// ----------------------------------------------------------------------------
// Mundo da rodada
// ----------------------------------------------------------------------------

export async function criarMundo(): Promise<Mundo> {
  const db = banco();
  const rodada = `${Date.now().toString(36)}${sufixo()}`;

  const plano = exigir(
    await db
      .from('plans')
      .insert({
        name: `${PREFIXO_DO_PLANO}${rodada}`,
        description: 'Plano sintético do E2E.',
        price_cents: 10000,
        billing_period: 'monthly',
        due_day: 10,
        is_active: true,
        schedule_mode: 'fixed',
      })
      .select('id')
      .single(),
    'criar o plano',
  );

  const planoLivre = exigir(
    await db
      .from('plans')
      .insert({
        name: `${PREFIXO_DO_PLANO}livre ${rodada}`,
        description: 'Plano sintético do E2E, horário livre.',
        price_cents: 10000,
        billing_period: 'monthly',
        due_day: 10,
        is_active: true,
        schedule_mode: 'free',
        weekly_quota: 1,
      })
      .select('id')
      .single(),
    'criar o plano livre',
  );

  const planoAVontade = exigir(
    await db
      .from('plans')
      .insert({
        name: `${PREFIXO_DO_PLANO}à vontade ${rodada}`,
        description: 'Plano sintético do E2E, à vontade.',
        price_cents: 10000,
        billing_period: 'monthly',
        due_day: 10,
        is_active: true,
        schedule_mode: 'unlimited',
      })
      .select('id')
      .single(),
    'criar o plano à vontade',
  );

  const turmaId = `${PREFIXO}${rodada}`;
  const outraTurmaId = `${PREFIXO}${rodada}-outra`;
  exigir(
    await db
      .from('groups')
      .insert([
        { id: turmaId, name: `Turma E2E ${rodada}` },
        { id: outraTurmaId, name: `Outra turma E2E ${rodada}` },
      ])
      .select('id'),
    'criar as turmas',
  );

  // Documento vigente é de todo o banco. Só cria quando não há nenhum, para
  // não mudar o que as outras contas locais veem.
  for (const tipo of TIPOS_DE_DOCUMENTO) {
    const vigentes = exigir(
      await db.from('legal_documents').select('id').eq('kind', tipo).eq('is_current', true),
      'ler os documentos vigentes',
    );
    if (vigentes.length > 0) continue;
    exigir(
      await db
        .from('legal_documents')
        .insert({
          kind: tipo,
          version: `${PREFIXO}${rodada}`,
          content: TEXTO_DO_DOCUMENTO,
          is_current: true,
          published_at: new Date().toISOString(),
        })
        .select('id')
        .single(),
      'criar o documento',
    );
  }

  return {
    rodada,
    planoId: String(plano.id),
    planoLivreId: String(planoLivre.id),
    planoAVontadeId: String(planoAVontade.id),
    turmaId,
    outraTurmaId,
  };
}

export function guardarMundo(mundo: Mundo): void {
  process.env[VARIAVEL_DO_MUNDO] = JSON.stringify(mundo);
}

export function lerMundo(): Mundo {
  const texto = process.env[VARIAVEL_DO_MUNDO];
  if (texto === undefined) {
    throw new Error('E2E: o mundo da rodada não foi criado (rode pelo playwright test).');
  }
  return JSON.parse(texto) as Mundo;
}

// ----------------------------------------------------------------------------
// Contas
// ----------------------------------------------------------------------------

export async function criarConta(mundo: Mundo, opcoes: OpcoesDeConta = {}): Promise<Conta> {
  const db = banco();
  const papel = opcoes.papel ?? 'user';
  const email = `${PREFIXO}${mundo.rodada}-${sufixo()}@${DOMINIO_DE_TESTE}`;
  const senha = senhaSintetica();
  const nome = `${papel === 'user' ? 'Aluno' : 'Professor'} Sintético ${sufixo()}`;
  const cpf = cpfSintetico();

  const criado = await db.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (criado.error !== null) {
    throw new Error(`E2E: criar a conta falhou: ${criado.error.message}`);
  }
  const id = criado.data.user.id;

  const primeiroAcesso = opcoes.primeiroAcesso === true;
  // No primeiro acesso de quem usa o app, a pessoa é quem preenche nome e CPF.
  const comDados = !primeiroAcesso || opcoes.semApp === true;
  const perfil: Record<string, unknown> =
    papel === 'professor'
      ? { id, role: 'professor', name: nome, cpf, color: COR_DO_PROFESSOR, is_first_login: false }
      : {
          id,
          role: 'user',
          name: comDados ? nome : null,
          cpf: comDados ? cpf : null,
          phone: comDados ? CELULAR_SINTETICO : null,
          is_first_login: primeiroAcesso,
          status: 'active',
          group_id: mundo.turmaId,
          plan_id:
            opcoes.livre === true
              ? mundo.planoLivreId
              : opcoes.aVontade === true
                ? mundo.planoAVontadeId
                : mundo.planoId,
          access_channel: opcoes.semApp === true ? 'none' : 'app',
        };
  const gravado = await db.from('profiles').insert(perfil);
  if (gravado.error !== null) {
    await db.auth.admin.deleteUser(id);
    throw new Error(`E2E: criar o perfil falhou: ${gravado.error.message}`);
  }

  if (papel === 'user') await antigoNaAcademia(id);

  if (opcoes.termosAceitos === true) {
    const vigentes = exigir(
      await db.from('legal_documents').select('id').eq('is_current', true),
      'ler os documentos vigentes',
    );
    const aceites = vigentes.map((documento) => ({ user_id: id, document_id: documento.id }));
    const aceito = await db.from('consents').insert(aceites);
    if (aceito.error !== null) {
      throw new Error(`E2E: gravar o aceite falhou: ${aceito.error.message}`);
    }
  }

  return { id, email, senha, nome, cpf };
}

/**
 * O `audit_log` guarda uma cópia de cada mudança em perfil e fatura. Sem
 * apagar, cada rodada deixaria no banco local o rastro dos dados sintéticos.
 */
async function apagarRastro(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await banco().from('audit_log').delete().in('entity_id', ids);
  if (error !== null) throw new Error(`E2E: apagar o rastro falhou: ${error.message}`);
}

/**
 * O banco conta a turma e o plano a partir do cadastro: a cota da semana é
 * proporcional aos dias em que o plano vale (`cota_da_semana`), e as aulas da
 * turma anteriores à entrada não são dele (D58). A conta sintética nasce como
 * quem já estava na academia, para o teste não depender do dia da semana.
 */
async function antigoNaAcademia(userId: string): Promise<void> {
  const db = banco();
  const desde = new Date(Date.now() - DIAS_NA_ACADEMIA * 24 * 60 * 60 * 1000).toISOString();
  for (const tabela of ['plan_periods', 'student_group_periods']) {
    const { error } = await db.from(tabela).update({ started_at: desde }).eq('user_id', userId);
    if (error !== null) throw new Error(`E2E: recuar ${tabela} falhou: ${error.message}`);
  }
}

/** Apaga a conta; o resto (perfil, presença, faturas, aceites…) vai em cascata. */
export async function apagarConta(id: string): Promise<void> {
  const db = banco();
  const faturas = await db.from('payments').select('id').eq('user_id', id);
  const idsDasFaturas = (faturas.data ?? []).map((fatura) => String(fatura.id));
  const arquivos = await db.storage.from(BUCKET_DE_COMPROVANTES).list(id);
  const nomes = (arquivos.data ?? []).map((arquivo) => `${id}/${arquivo.name}`);
  if (nomes.length > 0) {
    await db.storage.from(BUCKET_DE_COMPROVANTES).remove(nomes);
  }
  const apagado = await db.auth.admin.deleteUser(id);
  if (apagado.error !== null && !/not found/i.test(apagado.error.message)) {
    throw new Error(`E2E: apagar a conta falhou: ${apagado.error.message}`);
  }
  await apagarRastro([id, ...idsDasFaturas]);
}

// ----------------------------------------------------------------------------
// Aulas e mensalidades
// ----------------------------------------------------------------------------

export interface AulaSintetica {
  id: string;
  titulo: string;
}

export interface OpcoesDeAula {
  /** Aula da outra turma, que não é das contas sintéticas. */
  daOutraTurma?: boolean;
  cancelada?: boolean;
  /** Horário exato, para duas aulas no mesmo minuto. */
  quando?: Date;
  /** Chamada já concluída (para o "Eu estava na aula"). */
  chamadaFeita?: boolean;
}

/** Aula de rotina da turma da rodada, daqui a alguns minutos. */
export async function criarAula(
  mundo: Mundo,
  minutosAFrente: number,
  opcoes: OpcoesDeAula = {},
): Promise<AulaSintetica> {
  const titulo = `Aula E2E ${mundo.rodada}-${sufixo()}`;
  const aula = exigir(
    await banco()
      .from('classes')
      .insert({
        title: titulo,
        type: 'routine',
        date_time: (opcoes.quando ?? new Date(Date.now() + minutosAFrente * 60_000)).toISOString(),
        group_id: opcoes.daOutraTurma === true ? mundo.outraTurmaId : mundo.turmaId,
        audience: 'both',
        cancelled_at: opcoes.cancelada === true ? new Date().toISOString() : null,
        attendance_taken_at: opcoes.chamadaFeita === true ? new Date().toISOString() : null,
      })
      .select('id')
      .single(),
    'criar a aula',
  );
  return { id: String(aula.id), titulo };
}

/** A mensalidade em aberto da conta: a de entrada, que o banco cria no cadastro, ou uma nova. */
export async function mensalidadeAberta(mundo: Mundo, userId: string): Promise<string> {
  const db = banco();
  const abertas = exigir(
    await db.from('payments').select('id').eq('user_id', userId).eq('status', 'open').limit(1),
    'ler as mensalidades',
  );
  if (abertas.length > 0) return String(abertas[0].id);

  const hoje = new Date();
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  const criada = exigir(
    await db
      .from('payments')
      .insert({
        user_id: userId,
        plan_id: mundo.planoId,
        status: 'open',
        due_date: hoje.toISOString().slice(0, 10),
        amount_cents: 10000,
        reference_month: mes,
      })
      .select('id')
      .single(),
    'criar a mensalidade',
  );
  return String(criada.id);
}

// ----------------------------------------------------------------------------
// Limpeza
// ----------------------------------------------------------------------------

/**
 * Aula com chamada concluída não se apaga pela API: a trava do banco manda
 * cancelar em vez de apagar, e a chamada não volta a pendente. Para as aulas
 * sintéticas, a trava é desligada só dentro de uma transação, que a religa
 * antes do commit: a mudança de esquema é transacional, então nenhuma outra
 * sessão vê o banco sem a trava, e as cascatas continuam valendo.
 */
async function apagarAulasComChamada(): Promise<void> {
  const { data, error } = await banco()
    .from('classes')
    .select('id')
    .like('group_id', `${PREFIXO}%`)
    .not('attendance_taken_at', 'is', null);
  if (error !== null) throw new Error(`E2E: ler as aulas com chamada falhou: ${error.message}`);
  if (data.length === 0) return;

  const conexao = new Client({ connectionString: lerUrlDoBancoLocal() });
  await conexao.connect();
  try {
    await conexao.query('begin');
    await conexao.query('alter table public.classes disable trigger enforce_class_state_rules');
    await conexao.query(
      'delete from public.classes where group_id like $1 and attendance_taken_at is not null',
      [`${PREFIXO}%`],
    );
    await conexao.query('alter table public.classes enable trigger enforce_class_state_rules');
    await conexao.query('commit');
  } catch (falha) {
    await conexao.query('rollback');
    throw falha;
  } finally {
    await conexao.end();
  }
}

/**
 * Apaga tudo o que tem a marca do E2E, inclusive o que uma rodada interrompida
 * deixou para trás. Nunca toca no que não tem a marca.
 */
export async function apagarTudoDoE2E(): Promise<void> {
  const db = banco();

  for (let pagina = 1; ; pagina += 1) {
    const lista = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (lista.error !== null) throw new Error(`E2E: listar contas falhou: ${lista.error.message}`);
    const nossas = lista.data.users.filter((u) => u.email?.endsWith(`@${DOMINIO_DE_TESTE}`));
    for (const conta of nossas) await apagarConta(conta.id);
    if (lista.data.users.length < 200) break;
    // As contas apagadas saem da lista: a mesma página volta com as seguintes.
    if (nossas.length > 0) pagina -= 1;
  }

  await apagarAulasComChamada();

  const planos = await db.from('plans').select('id').like('name', `${PREFIXO_DO_PLANO}%`);
  const idsDosPlanos = (planos.data ?? []).map((plano) => String(plano.id));

  const passos: [string, () => PromiseLike<{ error: { message: string } | null }>][] = [
    ['as aulas', () => db.from('classes').delete().like('group_id', `${PREFIXO}%`)],
    ['as turmas', () => db.from('groups').delete().like('id', `${PREFIXO}%`)],
    ['os planos', () => db.from('plans').delete().like('name', `${PREFIXO_DO_PLANO}%`)],
    ['os documentos', () => db.from('legal_documents').delete().like('version', `${PREFIXO}%`)],
  ];
  for (const [nome, passo] of passos) {
    const { error } = await passo();
    if (error !== null) throw new Error(`E2E: apagar ${nome} falhou: ${error.message}`);
  }
  await apagarRastro(idsDosPlanos);
}

/**
 * "Vou" já gravado, direto como sistema: o estado que o "Vou" ou o "Vou
 * (extra)" deixam, para o teste partir dele sem passar pela tela.
 */
export async function marcarVou(userId: string, classId: string): Promise<void> {
  const { error } = await banco()
    .from('attendance')
    .insert({ class_id: classId, user_id: userId, declared_status: 'present' });
  if (error !== null) throw new Error(`E2E: marcar o Vou falhou: ${error.message}`);
}

/**
 * Nega a justificativa da aula como sistema: é o que a decisão do professor
 * faz no app. O banco cuida do resto (quem negou não aparece, D16; o prazo do
 * reenvio conta de `reviewed_at`).
 */
export async function negarJustificativa(userId: string, classId: string): Promise<void> {
  const { error } = await banco()
    .from('absence_justifications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('class_id', classId);
  if (error !== null) throw new Error(`E2E: negar a justificativa falhou: ${error.message}`);
}
