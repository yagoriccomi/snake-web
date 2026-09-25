# Roadmap — snake-web (web do aluno na Vercel)

> **Atualizado em:** 2026-09-25, com o contrato **v3** (revisão de 25/09) e os mockups na
> **versão 8**. Criado em 2026-09-24, a partir do handoff daquela sessão.
> **Repositórios irmãos:** [`snake-thai/ROADMAP-thai.md`](../snake-thai/ROADMAP-thai.md) (app e banco,
> onde está o marco "pronto para o primeiro aluno real") ·
> [`snake-server/ROADMAP-server.md`](../snake-server/ROADMAP-server.md)

**Como usar**

- Marque `[x]` quando um item terminar e anote no [Registro](#registro).
- **👤** = só você (clicar nas telas, painel da Vercel, decisões).
- **⚠️** = mexe em produção. Nesta web, **todo push na `main` publica na Vercel**.
- A coluna **Skill** diz quem executa. Código entra por `executar-projeto`, com
  `design-de-interface-projeto` sempre que houver tela.

---

## Onde estamos

| | |
| --- | --- |
| **Escopo da v1** | Fechado em 2026-09-23: entrar, primeiro acesso, aceitar os termos, frequência, mensalidades e comprovante, próximas aulas, avisar falta e justificar. **Nada além disso sem pedido explícito** |
| **Nova direção** | O pedido explícito veio: **a web faz tudo o que o aluno faz no app** (D34, ampliada na v3). Contrato **v3**, com a revisão de 25/09. O **G0** abriu em 25/09; a Fase 6 publica depois do **G4** |
| **Código** | 6 commits, **todos direto na `main`**. 7 rotas. `tsc --noEmit` limpo (conferido em 24/09) |
| **Produção** | <https://snake-web-eight.vercel.app> |
| **Visto funcionando** | **Só o login e a página inicial**, por você |
| **Testes** | Vitest desde 25/09: o primeiro acesso (6 testes, caminho de falha incluído) |
| **CI** | Nenhum. A Vercel compila a cada push, e é só isso |
| **Hooks de commit** | Husky desde 25/09: `pre-commit` com lint e typecheck, `commit-msg` com commitlint |
| **Cabeçalhos de segurança** | Desde 25/09: CSP (`connect-src` só Supabase, API e Cloudinary; `frame-ancestors 'none'`), `Referrer-Policy` e `X-Content-Type-Options` |

**O que está faltando, em ordem de gravidade:**

1. **Quatro das seis telas nunca foram abertas por ninguém** (Fase 1).
2. **O envio de comprovante em produção nunca rodou.** O servidor já aceita o domínio da Vercel
   (`ALLOWED_ORIGIN` conferido pelo dono na Render em 24/09), mas o caminho da Cloudinary nunca
   foi exercitado (Fase 2).
3. **O primeiro acesso pode deixar a senha padrão valendo para sempre**, o mesmo defeito do app
   (item 3.1).
4. **Nenhuma rede de proteção:** sem teste, sem hook, sem cabeçalho de segurança e sem PR.

---

## Fase 0 — Fundação (antes de mexer em código)

A web nasceu rápida, e tudo bem. Agora ela vai receber correções, e cada push na `main` vai
direto para produção.

| # | Item | Skill | Quem |
| --- | --- | --- | --- |
| 0.1 | [x] Script `typecheck` (`tsc --noEmit`) no `package.json`. Hoje o typecheck só roda à mão | `git-flow-projeto` | 🤖 |
| 0.2 | [x] Husky: **pre-commit** com lint e typecheck; **commit-msg** com commitlint (Conventional Commits, como nos irmãos) | `git-flow-projeto` | 🤖 |
| 0.3 | [x] **Trabalhar com branch e PR daqui em diante.** A Vercel gera uma URL de pré-visualização para cada PR, o que dá para testar no celular **antes** de chegar à produção | `git-flow-projeto` | 🤖 + 👤 |
| 0.4 | Proteger a `main` no GitHub (merge só por PR) | — | 👤 |

Jira fica de fora: foi adiado no app e recusado no servidor, e a web segue os irmãos.

---

## Fase 1 — Conferir tela por tela (ambiente local)

**Preparar o ambiente**, com a skill `rodar-projeto`:

1. No `snake-thai`, subir o banco com `scripts\db-dev start`. Para o item 1.2, subir também as
   Edge Functions com `scripts\db-dev funcoes`: o `start` **não** as sobe.
2. Aqui: `docker compose up`, e a página abre em <http://localhost:3001>.
3. Entrar com a conta de aluno do banco local. As credenciais estão em `snake-thai/.env.dev`,
   nas chaves `EXPO_PUBLIC_DEV_CONTAS` e `EXPO_PUBLIC_DEV_SENHA`. **Não as copie para
   documento nem para chat.**

**Roteiro** (👤 você clica; 🤖 `testes-projeto` confere o banco depois de cada passo):

### 1.1 `/termos` — aceite

- [ ] Aluno com documento pendente é levado para `/termos` ao entrar.
- [ ] Os textos aparecem e é possível ler até o fim.
- [ ] "Aceitar e continuar" leva à inicial.
- [ ] **O aceite ficou gravado:** uma linha nova em `public.consents` para esse aluno, uma por
  documento.
- [ ] Sair e entrar de novo: não pede o aceite outra vez.
- [ ] O botão de sair, em `/termos`, encerra a sessão.

### 1.2 `/primeiro-acesso` — nunca aberto

Precisa de uma conta com `is_first_login = true`. Crie um aluno pelo app DEV, ou redefina a
senha de um aluno em Gerenciar alunos → chave, e entre com a senha de primeiro acesso.

- [ ] **Aluno comum:** preencher nome, CPF, celular, nascimento e senha; concluir; cair na inicial.
- [ ] **A senha nova funciona e a padrão deixou de funcionar.**
- [ ] **Aluno marcado "Não usa o app"**, que é o público desta web: a tela já abre com nome e
  CPF preenchidos pela academia.
- [ ] **Validações:** CPF inválido, data inválida, senha fraca e as duas senhas diferentes. Cada
  uma diz o que fazer.
- [ ] **O caso de falha que motiva o item 3.1:** simular queda de rede **entre** a gravação do
  perfil e a troca de senha (DevTools → Network → Offline no momento certo). Confirmar o
  comportamento atual antes de corrigir.

### 1.3 `/pagar/[id]` — você testou, falhou, foi corrigido, e ninguém retestou

- [ ] Imagem JPG ou PNG: a mensalidade vira "Em análise".
- [ ] PDF: idem.
- [ ] **No banco:** `status = 'pending_approval'`, `proof_provider = 'supabase_storage'` e o
  caminho gravado. No ambiente local, o envio vai para o Storage **de propósito**, porque a
  Cloudinary de desenvolvimento não tem credenciais: precisa de
  `NEXT_PUBLIC_PROOF_UPLOAD_TO_STORAGE=true` no `.env.local` (desde o 3.4).
- [ ] O admin, no app DEV, abre o comprovante enviado pela web.
- [ ] Arquivo acima de 10 MB e tipo não aceito: mensagem clara, nada é enviado.
- [ ] **O id da mensalidade de outra pessoa na URL:** não mostra nem aceita envio (a RLS barra).

### 1.4 `/aulas` — nunca aberta

- [ ] As próximas aulas da turma aparecem. **Hoje aparecem as de todas as turmas:** é o defeito
  conhecido que o 6.1 corrige (ver a compatibilidade na Fase 6). Anote, não remende.
- [ ] **Avisar que vem ou que falta** grava em `attendance.declared_status`, **nunca** em
  `status`: a presença só vale pela chamada do professor.
- [ ] Justificar a falta: texto vazio é recusado; acima de 255 caracteres é recusado; o texto
  válido grava.
- [ ] **O professor vê o aviso e a justificativa no app DEV** e consegue aprovar ou recusar;
  a situação volta para a web.

### 1.5 Barreiras

- [ ] Professor e admin tentando entrar: a sessão é encerrada, com a explicação de que a gestão
  vive no app.
- [ ] Sessão expirada no meio de um envio: a mensagem manda entrar de novo, sem tela quebrada.

---

## Fase 2 — Produção

Depende da Fase 1 do [`snake-thai/ROADMAP-thai.md`](../snake-thai/ROADMAP-thai.md) (sem ela, o aluno
"Não usa" chega em produção sem nome nem CPF).

**O domínio em `ALLOWED_ORIGIN` já não bloqueia esta fase:** o dono conferiu na Render, em 24/09,
que o valor é o domínio da Vercel, sem barra (item 2.1 do
[`snake-server/ROADMAP-server.md`](../snake-server/ROADMAP-server.md); contrato § 13.4). A prova sem navegador
(item 2.2 do servidor) continua valendo antes do 2.2 daqui: se o primeiro envio falhar, ela
separa um erro de CORS de uma falha da Cloudinary.

- [ ] **2.1** 👤 Vercel → Settings → Environment Variables: as três variáveis com os valores de
  **produção** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
  `NEXT_PUBLIC_API_URL`, que é a URL da Render).
- [ ] **2.2** ⚠️👤 **Primeiro envio real pela Cloudinary**, com uma conta de aluno de teste em
  produção. Esse caminho nunca rodou: no local ele sempre cai para o Storage. Conferir
  `proof_provider = 'cloudinary'`, o admin abrindo no app e depois recusando para limpar.
- [ ] **2.3** 👤 O servidor da Render hiberna, e a primeira chamada do dia demora. Confirmar que
  a mensagem "O servidor está acordando" aparece e que tentar de novo funciona.
- [ ] **2.4** 👤 Repetir o 1.1 e o 1.2 em produção quando a Política e os Termos forem
  publicados com os dados reais (item 3.7 do roadmap do app).

---

## Fase 3 — Correções conhecidas

| # | Item | Skill | Gravidade |
| --- | --- | --- | --- |
| 3.1 | [x] **Primeiro acesso pode deixar a senha padrão para sempre** | `executar-projeto` + `testes-projeto` | **Alta** |
| 3.2 | [x] **Cabeçalhos de segurança** | `seguranca-projeto` | Média |
| 3.3 | [x] **`console.error` com a resposta do provedor** | `executar-projeto` | Baixa |
| 3.4 | [x] O desvio para o Storage é decidido por uma palavra dentro da URL assinada (`PREENCHER`) | `executar-projeto` | Baixa |

**3.1** — `app/primeiro-acesso/page.tsx`, linhas ~119–136.

- **O que acontece:** o perfil é gravado **já com `is_first_login: false`**, e só depois vem
  `supabase.auth.updateUser({ password })`. Se a troca de senha falhar e a pessoa sair, a
  próxima visita a `/primeiro-acesso` a manda para `/inicio`, e a **senha que a academia
  conhece continua valendo**.
- **Corrigido em 25/09** (`lib/primeiroAcesso.ts`): dados sem a flag → troca de senha → só então
  `is_first_login = false`. Na segunda tentativa, `same_password` quer dizer que a senha já é a
  nova, e a marcação segue.
- **Mesmo defeito no app:** item 2.4 do roadmap do app. **Corrigir os dois juntos, com a mesma
  regra**, e com teste do caminho de falha.

**3.2** — `next.config.ts` não envia nenhum cabeçalho de segurança. A página de login pode ser
embutida num site de terceiros (clickjacking), e não há CSP limitando para onde o navegador fala.
Os cabeçalhos a enviar: [#53][#59]

- `Content-Security-Policy`, com `connect-src` só para o Supabase, a API e a Cloudinary;
- `frame-ancestors 'none'`;
- `Referrer-Policy`;
- `X-Content-Type-Options`.

**3.3** — `lib/comprovante.ts:104` e `:150` escrevem no console do navegador o corpo da recusa da
Cloudinary e o erro do Storage. O corpo pode trazer o `public_id`, que carrega o id da pessoa. O
`CLAUDE.md` daqui diz "nenhum dado pessoal em log". Registrar só o status.

**3.4** — Funciona, mas é um desvio de desenvolvimento dentro do código de produção. Uma variável
explícita de ambiente deixa a intenção visível. Só se houver outro motivo para mexer no arquivo.

---

## Fase 4 — Testes mínimos (`testes-projeto`)

Hoje não existe nenhum. Proposta enxuta, focada no que quebra em silêncio: [#41][#47]

- [ ] **4.1** Vitest para `lib/validacao.ts` (CPF, data, celular e senha forte) e para
  `problemaNoArquivo`. **A regra de senha precisa bater com a do app e com a do Supabase**: se a
  web aceitar uma senha que o Supabase recusa, o item 3.1 vira realidade.
- [x] **4.2** Teste do caminho de falha do primeiro acesso, que nasce junto com a correção 3.1.
- [ ] **4.3** *(decisão sua)* E2E com Playwright contra o banco local, cobrindo o roteiro da
  Fase 1: é a versão automática do que hoje só você confere clicando. Vale se a web crescer.
  Se ela continuar deste tamanho, o roteiro manual basta. [#43]

---

## Fase 5 — Interface

| # | Item | Skill | Situação |
| --- | --- | --- | --- |
| 5.1 | **Navegação mínima.** Não há menu: as telas se alcançam por links na inicial. Um cabeçalho fixo em todas as páginas resolve, sem virar menu | `design-de-interface-projeto` | **Decidido em 24/09:** a linha F dos mockups, aprovada, traz o cabeçalho **Início · Aulas · Sair**. Fazer junto da Fase 6 (as pranchetas novas já o pressupõem), no mesmo layout do rodapé com "Falar com a academia" (6.15) |
| 5.2 | Auditoria de acessibilidade: área de toque de 44 px, rótulos, foco visível e contraste nos dois temas | `acessibilidade-projeto` | Depois da Fase 3 |
| 5.3 | **Anexo na justificativa** (atestado) | — | **Pedido pelo dono em 2026-09-24 (D34):** entrou na Fase 6, item 6.6 |

---

## Fase 6 — Nova direção: horário livre, à vontade e justificativa semanal

> **Contrato (fonte de todos os nomes, só leitura para este chat):**
> `C:\Users\USER\Desktop\GIT\academy\snake-thai\docs\CONTRATO.md`. Esta web implementa a
> **v3**, com a revisão de 25/09 (D43–D58). O que a v3 trouxe para o aluno: menu de aulas
> (§ 12.2), troca de aula (§ 9.4), aula extra do fixo (§ 9.5), contato da academia (§ 5.4) e as
> colunas novas de `aulas_do_aluno` e `historico_de_aulas_do_aluno` (§ 12).
>
> **Mockups:** artifact "Mockups Snake Thai — Horário livre", **versão 8** (25/09).
>
> - **Linha F** (web: início, aulas e justificativa): **aprovada em 24/09**.
> - **Linha G**, prancheta **"Web — escolher aulas e trocar"**: **aprovada em 25/09 (G0)**.
> - O comportamento que a web segue está nas pranchetas do aluno no app: linha B, as da linha G
>   ("Aluno livre — escolher aulas", "Aluno fixo — o mesmo menu: extra e troca", "trocar só nesta
>   semana", "troca permanente" e "meus pedidos de troca") e, na linha H, "Dados — falar com a
>   academia".

**Regras deste chat:**

1. **Nenhum nome de RPC, coluna, rota ou rótulo é inventado aqui.** Tudo vem do contrato. Se
   faltar algo, registre em "Decisões em aberto" e pare o item.
2. **Nenhuma regra de negócio nesta camada** (como sempre): quem decide o que o aluno vê, a conta
   da frequência, a cota, a meta, o prazo e se uma aula pode ser extra ou troca é o banco. A web
   chama as RPCs e mostra.
3. **Portões** (contrato § 14). Para saber se um portão abriu, **leia o roadmap do
   repositório dono** (`ROADMAP-thai.md` ou `ROADMAP-server.md`):
   - **G0** (você aprova o contrato v3 e os mockups versão 8, inclusive a prancheta da web da
     linha G; fica anotado no ROADMAP do `snake-thai`) → nada da Fase 6 começa antes, exceto o 6.0;
   - **G3** (as 23 RPCs do aluno no banco local; na v3 entraram `menu_de_aulas`,
     `pedir_troca_de_aula`, `desistir_da_troca`, `minhas_trocas`, `minhas_trocas_permanentes` e
     `contato_da_academia`) → pode desenvolver;
   - **G2** (rotas novas do servidor em produção, já com `allowed_formats`) → pode usar os anexos
     (justificativa, "Eu estava na aula" e troca permanente);
   - **G4** (banco de produção atualizado) → pode publicar na Vercel;
   - **G5** (Política nova) → pode publicar a justificativa com anexo.
4. **Só o que o aluno faz** (D34). Decidir troca, justificativa ou solicitação é do app, e o
   aviso de atualização (§ 12.3) também: a web está sempre na versão publicada (ver "Fora deste
   roadmap").

A numeração dos itens da v2 não mudou. Os itens da v3 entraram como **6.12 a 6.15** e ficam
antes da Política (6.10) e da publicação (6.11), que continuam por último.

| # | Item | Contrato | Portão | Skill |
| --- | --- | --- | --- | --- |
| 6.0 | **Guarda único nas páginas**: papel `user`, primeiro acesso e termos pendentes. Hoje `/aulas` não confere nada disso. As telas novas da Fase 6 nascem com ele | — | nenhum (fazer já) | `executar-projeto` |
| 6.1 | **Aulas do aluno**: trocar `buscarProximasAulas` (que mostra aulas de todas as turmas, um defeito atual) por `aulas_do_aluno`. Aula cancelada **riscada**, com selo **Cancelada** e sem botões. Selo **Livres** / **Fixos** conforme `audience`. **Rótulos, botões e aviso de cota vêm só das colunas da RPC** (`schedule_mode`, `weekly_target`, `marked_in_week`, `can_justify`, `justify_until`, `can_contest`, `contest_until` e, **na v3**, `origem`, `is_recurring`, `schedule_ends_on`, `can_mark_extra`, `can_swap_from`, `can_swap_from_permanent`, `can_swap_to`, `swap_id`, `swap_kind`, `swap_status`, `swap_decided_via`, `swap_role`, `swap_other_class_id`, `swap_other_date_time` e `can_cancel_swap`): nada é calculado aqui. **Fixo (v3):** selo **Sua aula** (`origem = 'turma'`), **Troca permanente**, **Troca** + "no lugar de {dia dd/mm hh:mm}", **Troca pendente** ou **Extra**; na aula que ele trocou, "Trocou para {dia dd/mm hh:mm}" ou "Troca pendente para {dia dd/mm hh:mm}", com **Desistir da troca** (6.14); troca negada com o bloco de contato (6.15). A turma de cada aula é a da data dela (D58) e já vem pronta. Botão **Escolher aulas** (6.12) | § 12, § 3 | G3 | `executar-projeto` + `design-de-interface-projeto` |
| 6.2 | **Declarar**: trocar o `upsert` direto em `attendance` por `declarar_aula(p_class_id, p_vou)`. Fixo, na aula dele: **Vou / Não vou**. Livre e à vontade: **Vou → Marcada + Desmarcar**. Com `acima_da_cota = true`, aviso que **não bloqueia** (texto do § 3) e **Desfazer**. **Fixo fora da grade (v3, D51):** **Vou (extra)** com `can_mark_extra`, em qualquer aula de rotina, **inclusive "só livres"** (D56) → selo **Extra** + **Desmarcar** (`p_vou = false` só limpa, nunca vira falta); no evento, **Vou** como qualquer aluno, sem Extra (T40); o fixo nunca vê o aviso de cota. As recusas do banco (aula cancelada, já começou, mesmo horário, fora do público e, na v3, *"Você já tem aula neste horário. Para ir nesta, peça a troca."*, *"Você trocou esta aula por outra."* e *"Você já pediu troca para esta aula."*) aparecem com a mensagem dele | § 9.2, § 9.5, § 3 | G3 | idem |
| 6.3 | **Frequência**: trocar `buscarFrequencia` (RPC legada) por `frequencia_semanal` + `frequencia_do_mes`, com os dois números (Semana e Mês), e a página de semanas por `semanas_do_mes` (**Semana extra**; "Fecha em dd/mm" só pela regra do § 3). Percentual nulo aparece como **—**. **Tirar a régua de 70 (`FREQUENCIA_MINIMA`) copiada na web**: o alerta de frequência baixa passa a depender do contrato (T10, T30) | § 11.6, § 3 | G3 | idem |
| 6.4 | **Barra da semana**: livre = **feitas + marcadas / cota**; à vontade = **feitas / meta** | § 3, § 9.2 | G3 | idem |
| 6.5 | **Meta do à vontade**: "Meta: {n}x por semana" + **Mudar**. A folha diz "Vale a partir de {seg dd/mm}. A meta desta semana continua {n}x." RPCs `definir_meta_semanal(p_meta)` e `meta_da_semana(p_user_id, p_week_start)` | § 5.3 | G3 | idem |
| 6.6 | **Justificativas**: `minhas_justificativas()`. Fixo: **por aula** (até 7 dias depois da aula). Livre com cota: **por semana** ("Justificar mais 1 aula", com `semanas_do_mes.justifications_left`). À vontade: **não justifica** (D39). **Texto obrigatório.** Envio: `enviar_justificativa(...)` → se houver arquivo, `POST /v1/justifications/sign-upload { "justificationId" }` → Cloudinary com os campos assinados como vieram (`overwrite=false` e, na v3, `allowed_formats`) → `anexar_a_justificativa(p_id)`. **Reenvio (D42):** com `can_resend`, "Reenviar até {dd/mm}" → `reenviar_justificativa(p_id, p_texto)` e o mesmo fluxo de anexo. Rótulos do § 3, inclusive as duas mensagens de negada; **a negada pela 2ª vez leva o bloco de contato** (6.15). Na aula original de uma troca, `can_justify` já vem `false` (T38). Sem Cloudinary, anexo indisponível, **nunca** o Storage (T25) | § 9.1, § 13.2, § 3 | G3 + G2 | idem |
| 6.7 | **"Eu estava na aula"** (com `can_contest`): `criar_motivo('request_evidence', p_class_id, p_texto)` → anexos opcionais por `POST /v1/motivos/sign-upload { motivoId, anexoId }` + `anexar_ao_motivo(motivoId, anexoId)` → `abrir_solicitacao('student_was_present', p_class_id, motivoId)`. Acompanhamento por `minhas_solicitacoes()`; **negado (`status = 'rejected'`): bloco de contato** (6.15). Vale também para o à vontade (D40). Na v3, `can_contest` também vale na aula nova de uma troca avulsa **expirada** e vem `false` na aula original de troca (T38) | § 9.3, § 5.4 | G3 (anexo: G2) | idem |
| 6.8 | **Histórico de aulas** do próprio aluno: `historico_de_aulas_do_aluno(auth.uid(), p_de, p_ate)`. O aluno vê a marca **Editada**, mas **nunca** quem editou nem o valor anterior (as colunas vêm nulas para ele, D20). **Na v3:** `origem`, `swap_kind` e `swap_other_date_time`; a aula original de troca aprovada vem com `origem = 'trocou'` e mostra "Trocou para {dia dd/mm hh:mm}" **no lugar de "Falta"** | § 12 | G3 | idem |
| 6.9 | **Rótulos unificados** com o app: justificativa, frequência e modalidade e, na v3, troca, extra e contato. Os antigos "Aceita", "Recusada" e "Em análise" saem | § 3 | — | idem |
| 6.12 | **Aulas da semana** (v3, D43): botão **Escolher aulas** na tela Aulas → tela **Aulas da semana**, abas **Esta semana** / **Próxima semana**, um bloco por dia de aula (`class_weekdays`, lido direto de `academy_settings`, § 12.2). Uma chamada `menu_de_aulas(p_semana)` por aba: só esta semana e a próxima (outra dá `22023`), inclusive as aulas que já passaram. **Ações só pelas colunas** (tabela de ações da § 12.2): livre e à vontade, **Vou** → **Marcada** + **Desmarcar**, com o aviso de acima da cota; fixo, **Vou / Não vou** na aula dele, **Vou (extra)** com `can_mark_extra` em **qualquer aula de rotina, inclusive "só livres"** (D56) → **Extra** + **Desmarcar**, **Trocar para esta** com `can_swap_to` (6.13) e **Desistir da troca** na troca pendente e, com `can_cancel_swap`, em `origem = 'trocou'` (6.14). A troca mais recente negada, expirada ou cancelada mostra o rótulo da § 3 (negada: + bloco de contato). Aula cancelada riscada e sem ação. **Sem vagas nem contagem** (T43). Link **Meus pedidos** (6.14), como na prancheta da web | § 12.2, § 3, § 9.5 | G3 | `executar-projeto` + `design-de-interface-projeto` |
| 6.13 | **Folha "Trocar aula"** (v3, D44–D47), aberta pela aula nova. **"Qual aula sua você quer trocar por esta?"**: as aulas da mesma semana com `can_swap_from` ou `can_swap_from_permanent`; as que já passaram (só `can_swap_from`) com o selo **Reposição**. **Tipo:** **Só nesta semana** se a escolhida tem `can_swap_from` (é o padrão); **Permanente** se ela tem `can_swap_from_permanent` e a aula nova tem `is_recurring`; com `schedule_ends_on`, "Este horário termina em {dd/mm}." **Só nesta semana:** `pedir_troca_de_aula(de, para, 'once')`, sem justificativa (P19). **Permanente, nesta ordem (§ 9.4):** (1) `criar_motivo('class_swap_evidence', null, texto)`, com o campo **"Por que você precisa mudar de horário?"** (obrigatório, até 500) → `motivoId`; (2) para cada arquivo (até 5; JPG, PNG, WEBP, HEIC ou PDF; 10 MB, T46): gerar o `anexoId` (UUID v4) → `POST /v1/motivos/sign-upload { motivoId, anexoId }` → Cloudinary com os campos assinados → `anexar_ao_motivo(motivoId, anexoId)`; se um falhar, avisar e deixar tentar de novo ou seguir sem ele; (3) `pedir_troca_de_aula(de, para, 'permanent', motivoId)`. Aviso **"A troca permanente muda a sua grade a partir da próxima aula depois da aprovação."** Botão **Pedir troca**. Recusas: a mensagem do banco (tabela da § 9.4). Depois, recarregar o menu: a extra marcada na aula nova vira o pedido. Sem Cloudinary, anexo indisponível, **nunca** o Storage (T25) | § 12.2, § 9.4, § 8, § 3 | G3 (anexo: G2) | idem |
| 6.14 | **Meus pedidos** e **Desistir da troca** (v3): `minhas_trocas()` sem parâmetros (últimos 60 dias e as futuras), com os rótulos da § 3: **Troca pendente** + **Desistir da troca** (com `can_cancel`); **Troca aprovada por {nome}**; com `decided_via = 'system'`, **Troca abonada: a aula nova foi cancelada**, sem nome (T50, D57); **Troca negada** + bloco de contato, nunca quem negou (D16); **Troca expirada · vale a aula original**; **Você desistiu da troca** (`decided_via = 'student'`) ou **Troca cancelada**. Na permanente, o texto que ele escreveu (`motivo_texto`). `desistir_da_troca(p_id)`, com as recusas da § 9.4 na mensagem do banco. **A web não tem push** (§ 10): é aqui, no menu e em Aulas que o aluno de iPhone fica sabendo da decisão | § 9.4, § 3, § 10 | G3 | idem |
| 6.15 | **Contato da academia** (v3, D52): `contato_da_academia()`, **nunca** `select` em `academy_settings` para isso. Links `https://wa.me/<whatsapp>` e `mailto:<email>`; o WhatsApp aparece como +55 (DD) NNNNN-NNNN. **Onde (lista fechada da § 5.4):** **"Falar com a academia"** no rodapé das páginas logadas (a web não tem Perfil); **bloco de contato** ("Para mais informações, fale com a academia:" + **WhatsApp** / **E-mail**, só os preenchidos) na troca negada (menu, Aulas e Meus pedidos), no "Eu estava na aula" negado e na justificativa negada pela **2ª** vez. **Não aparece** na tela de login, antes do login nem na negada pela 1ª vez. Sem contato cadastrado: o bloco mostra só a frase, e "Falar com a academia" mostra "A academia ainda não cadastrou um contato. Procure a recepção." | § 5.4, § 3 | G3 | idem |
| 6.10 | **Nova versão da Política** (atestado como dado de saúde, guardado 180 dias depois da decisão, D22 e D54; metas, solicitações e trocas de aula): conferir `/termos` com a versão nova | — | G5 | `testes-projeto` |
| 6.11 | ⚠️👤 **Publicar na Vercel**, **logo depois do G4**: a web é o último passo da ordem de publicação (§ 14), e até lá a web atual roda contra o banco novo (compatibilidade abaixo) | § 14 | **G4**; anexos (6.6, 6.7 e 6.13): **G2**; justificativa com anexo: também **G5** | — |

**Nomes do contrato que esta web usa** (copie exatamente, não traduza):

- **RPCs:** `aulas_do_aluno`, `declarar_aula`, `frequencia_semanal`, `frequencia_do_mes`,
  `semanas_do_mes`, `definir_meta_semanal`, `meta_da_semana`, `minhas_justificativas`,
  `enviar_justificativa`, `reenviar_justificativa`, `anexar_a_justificativa`, `criar_motivo`,
  `anexar_ao_motivo`, `abrir_solicitacao`, `minhas_solicitacoes`, `historico_de_aulas_do_aluno`,
  `documentos_legais_pendentes`, `documentos_legais_vigentes`, `aceitar_documentos_legais` e,
  **na v3**, `menu_de_aulas`, `pedir_troca_de_aula`, `desistir_da_troca`, `minhas_trocas` e
  `contato_da_academia`.
- **Enums:**
  - `plan_schedule_mode` (`fixed`, `free`, `unlimited`);
  - `class_audience` (`fixed`, `free`, `both`);
  - `justification_scope` (`class`, `week`);
  - `justification_status` (`pending`, `approved`, `rejected`);
  - `action_reason_kind` (a web usa só `request_evidence` e, na v3, `class_swap_evidence`);
  - `roll_call_request_kind` (a web usa só `student_was_present`);
  - `class_swap_kind` (`once` = Só nesta semana, `permanent` = Permanente), v3;
  - `class_swap_status` (`pending`, `approved`, `rejected`, `expired`, `cancelled`), v3.
- **Valores de texto das colunas novas (v3):**
  - `origem` (`turma`, `permanente`, `troca`, `troca_pendente`, `extra`, `trocou`, `marcou`,
    `incluido`; nula = aula que não é dele);
  - `swap_role` (`origem`, `destino`);
  - `swap_decided_via` e, em `minhas_trocas`, `decided_via` (`review`, `roll_call`, `student`,
    `system`).
- **Leitura direta nova (v3):** `academy_settings.class_weekdays`, para os dias do menu
  (§ 12.2). O contato **nunca** sai de `academy_settings` (6.15).
- **Rotas do servidor:**
  - `POST /v1/justifications/sign-upload` com `{ "justificationId": "<uuid>" }`;
  - `POST /v1/motivos/sign-upload` com `{ "motivoId": "<uuid>", "anexoId": "<uuid>" }`, para o
    "Eu estava na aula" e, na v3, para a justificativa da troca permanente;
  - as duas assinam com `overwrite=false` e, na v3, `allowed_formats` (`jpg,png,webp,heic,pdf`);
    a web envia os dois campos à Cloudinary como os recebeu (sem eles, a assinatura não bate);
  - a pasta é decidida pelo servidor;
  - o comprovante continua como está (`/v1/proofs/sign-upload`);
  - **CORS:** nada a pedir ao servidor. `ALLOWED_ORIGIN` é global, cobre `/v1/motivos/*` e foi
    conferido pelo dono com o domínio da Vercel em 24/09 (§ 13.4). O que falta é o G2.
- **Compatibilidade:** até G4, produção só tem a RPC legada `frequencia_mensal` e o `upsert`
  antigo. **Não publique** os itens 6.1 a 6.8 nem 6.12 a 6.15 antes de G4. Detalhes logo abaixo.

**Compatibilidade: a web atual até o 6.11 (contrato § 15)**

A web de hoje continua em produção até o 6.11. O que ela faz de errado com o aluno **fixo**:

- `/aulas` lista as próximas aulas de **todas as turmas** (`buscarProximasAulas` lê `classes`
  sem filtro), com **Vou / Não vou** em cada uma.
- **Vou** numa aula de outra turma grava `declared_status` numa aula que não é dele.
- **Não vou** grava `'absent'` nessa aula e abre o formulário de justificativa dela.
- Não conhece extra, troca, reenvio (D42), anexo nem contato, e usa os rótulos antigos
  ("Em análise", "Aceita", "Recusada").

**Até o G4** (produção com o banco de hoje), fica como está:

- **Nenhum remendo.** Filtrar as aulas pela turma aqui seria regra de negócio nesta camada
  (regra 2). Quem corrige é o `aulas_do_aluno` (6.1), que só existe em produção depois do G4.
- A inicial continua com `frequencia_mensal` e a régua de 70 (`FREQUENCIA_MINIMA`) até o 6.3.

**Do G4 até o 6.11**, o banco novo segura a web atual:

- **Vou** numa aula de outra turma vira **extra**, em aula de qualquer público (D56): presença a
  mais se ele for, e nada se não for.
- **Não vou** numa aula fora da grade é gravado como nulo (§ 9.2): nunca vira falta. A
  justificativa que a tela abre em seguida é recusada, porque a aula não é da grade dele
  (§ 9.1 c).
- Na aula original de uma troca: **Vou / Não vou** na troca avulsa aprovada dá `23514`,
  *"Você trocou esta aula por outra."*; a justificativa, com a troca pendente ou aprovada, dá
  `23514`, *"Esta aula foi trocada. Se faltar à aula nova, justifique a aula nova."*
- A justificativa numa aula da grade continua funcionando pelo `upsert` antigo (o gatilho
  preenche `scope` e `week_start`).
- `frequencia_mensal` passa a devolver o ritmo, já com a grade efetiva: troca, reposição e extra
  entram certos no número.
- Para o livre, **Vou** numa aula só de fixos é recusado (fora do público), e a web atual mostra
  o erro genérico de conexão.
- **Por isso o 6.11 sai logo depois do G4:** até lá, o aluno de iPhone não vê menu, troca, extra
  nem contato.

---

## Fase 7 — Acompanhar o app

**7.1 — Central de avisos na web (decisão sua; recomendo sim, só leitura).**

- O app vai ganhar central de avisos e **recado em massa** (item 5.1 do roadmap do app, que era
  o 4.4 antes da nova direção), e o recado chega **por push**.
- Aluno de iPhone não tem app, portanto não tem push. **Ele é exatamente quem perderia "sem aula
  na quinta".**
- Uma lista de avisos, só de leitura, na inicial da web fecha essa lacuna sem push.
- **Decida antes do item 5.1c do app**, para a central nascer num formato que as duas interfaces
  leiam do mesmo lugar.

**7.2 — Versão nova da Política.** A central de avisos do app muda o prazo de guarda e gera uma
versão nova da Política. A web já trata documento pendente, mas conferir o `/termos` com a versão
nova quando ela sair.

**7.3 — Mudanças de esquema.** Toda migration do `snake-thai` que mexa em `profiles`, `payments`,
`classes`, `attendance`, `absence_justifications`, `consents` ou nas funções de frequência e de
documentos pode quebrar esta web **sem nenhum aviso**: não há teste aqui que pegue. Até a Fase 4
existir, conferir à mão. **A partir do contrato, a regra é outra:** a web só usa o que está no
contrato, e o `snake-thai` só muda o contrato com uma versão nova.

---

## Fase 8 — CI (opcional)

`configurar-ci-cd-projeto`: lint, typecheck e os testes da Fase 4 a cada PR. **Opcional**: você
pediu "esquece o CI" para o app em 2026-09-16, e a Vercel já recusa publicar código que não
compila. O ganho real só aparece quando a Fase 4 existir. [#76]

---

## Decisões em aberto (suas)

| Decisão | Recomendação | Onde |
| --- | --- | --- |
| Trabalhar com branch e PR | **Adotado em 25/09** (PR da Fase 0). Falta o 0.4, proteger a `main` | 0.3 |
| Cabeçalho com "Início" e "Sair" | **Decidida em 24/09:** a linha F aprovada traz **Início · Aulas · Sair** | 5.1 |
| Central de avisos na web | Sim, só leitura | 7.1 |
| E2E com Playwright | Só se a web crescer | 4.3 |
| CI | Depois da Fase 4, se quiser | Fase 8 |
| Fonte Inter/Syne na web, igual ao app | Não por ora: os mockups da web usam a fonte do sistema | 6.9 |
| ~~A prancheta "Web — escolher aulas e trocar" mostrava textos que nenhuma coluna do contrato traz ("Suas aulas: …" e "dá para repor até …")~~ | **Resolvido em 25/09:** o cartão saiu dos mockups (versão 8). A tela usa só as linhas de `menu_de_aulas`; a reposição aparece na folha "Trocar aula", pelo selo **Reposição** | 6.12 |

## Fora deste roadmap, de propósito

- **Painel de admin ou de professor.** Só aluno entra aqui, e isso é bloqueio de verdade. Na v3,
  isso inclui **Revisar troca**, **Solicitações** (inclusive "Trocas de aula"), decidir
  justificativa, a chamada, cancelar aula, mudar o aluno de turma e o perfil do aluno com a turma
  por período: tudo isso vive no app.
- **Aviso de atualização** (contrato § 12.3). É só do app: a web está sempre na versão
  publicada.
- **Regra de negócio nesta camada.** Frequência, mensalidade e prazo são contas do banco.
- **Push pela web** (Web Push). Existe no iPhone para sites adicionados à tela inicial, mas pede
  service worker, chave VAPID e mudanças na fila de envio. Só se a central (7.1) não bastar. [#8]
- **Jira.**

---

## Registro

| Data | O que aconteceu |
| --- | --- |
| 2026-09-24 | Roadmap criado a partir do handoff. Conferido: `tsc --noEmit` limpo; nenhum teste, CI, hook nem cabeçalho de segurança; primeiro acesso grava `is_first_login: false` antes da troca de senha; aceite gravado em `public.consents`. |
| 2026-09-24 | **Fase 6 criada** a partir do contrato v2 (`snake-thai/docs/CONTRATO.md`): a web acompanha o aluno do app (D34). As antigas Fases 6 e 7 viraram 7 e 8. O anexo na justificativa entrou (antes era "só com pedido"). Depende dos portões G2, G3 e G4, anotados nos ROADMAPs donos. |
| 2026-09-24 | Contrato **v3** (D43–D55): menu de aulas, troca de aula, aula extra do fixo, contato da academia, aviso de atualização (só do app) e guarda de 180 dias; D34 ampliada ("a web faz tudo o que o aluno faz"). Mockups na **versão 6**, com as linhas G e H. **Linha F (web) aprovada pelo dono**, com o cabeçalho Início · Aulas · Sair (5.1 decidido). O dono conferiu na Render que o `ALLOWED_ORIGIN` é o domínio da Vercel (contrato § 13.4): a Fase 2 não espera mais por isso. |
| 2026-09-25 | Revisão da v3 com as respostas do dono às P1–P22: **D56** (extra em qualquer aula, inclusive "só livres"), **D57** e **T50** (troca abonada quando a aula nova é cancelada), **D58** (histórico de turma); G3 passa a 23 RPCs. Mockups na **versão 8**; a prancheta "Web — escolher aulas e trocar" (linha G) aguarda o **G0**. **Fase 6 atualizada para a v3:** itens novos 6.12 a 6.15; 6.0, 6.1, 6.2, 6.6 a 6.11 ampliados; G0 e G5 entre os portões; compatibilidade da web atual (§ 15). Referências ao roadmap do app corrigidas (central de avisos: 4.4 → 5.1). *Só como informação:* no servidor, o lote de dependências (PR #22) foi mesclado em 25/09, e o `/health` respondeu ok. |
| 2026-09-25 | **G0 aberto** (registrado no ROADMAP do `snake-thai`): mockups versão 8 aprovados, inclusive a prancheta "Web — escolher aulas e trocar", e contrato v3 com a revisão de 25/09. A Fase 6 pode começar; a publicação espera o G4. |
| 2026-09-25 | **Fase 0 (0.1 a 0.3) feita** na branch `chore/fundacao`, em PR (plano em `docs/planos/PLANO-fase-0-fundacao.md`): script `typecheck`; Husky com `pre-commit` (lint + typecheck) e `commit-msg` (commitlint com a regra do `snake-server`); `prepare` com `|| exit 0` para não quebrar a instalação da Vercel. Para o gate nascer verde, os 3 erros de lint que já existiam foram corrigidos (`<a>` → `Link` na inicial; carga fora do corpo do efeito em `/aulas` e `/termos`); ficam 16 avisos de `window.location.href`, que o guarda do 6.0 resolve. **O PR não foi mesclado:** mesclar publica. Falta o **0.4** (👤). |
| 2026-09-25 | **3.1 e 4.2 feitos** na branch `fix/primeiro-acesso-senha` (sobre a da Fase 0), em PR; plano em `docs/planos/PLANO-3.1-senha-do-primeiro-acesso.md`. Ordem nova: dados **sem** a flag → `auth.updateUser` → `is_first_login = false`; se a segunda tentativa receber `same_password`, a senha já tinha mudado e a marcação segue. **Conferido no banco local** com 3 contas sintéticas (apagadas no fim): `weak_password` real mantém a flag `true`; `same_password` real conclui. Primeira suíte: Vitest, 6 testes, no `pre-commit`. `@types/node` foi para ^22 (o Vitest 5 pede 22+; o contêiner usa Node 24). **Para o app (2.4), a mesma regra:** flag por último e `same_password` tratado como senha já trocada. O último item do 1.2 (simular a queda antes de corrigir) ficou para trás: o comportamento antigo está descrito no 3.1. |
| 2026-09-25 | **3.2, 3.3 e 3.4 feitos** na branch `fix/log-sem-dado-pessoal` (sobre a do 3.1), em PR; plano em `docs/planos/PLANO-3.2-a-3.4-correcoes.md`. **3.3:** o console registra só o status das recusas da Cloudinary e do Storage. **3.4** (entrou porque o 3.3 mexeu no arquivo): o desvio para o Storage passa a ser `NEXT_PUBLIC_PROOF_UPLOAD_TO_STORAGE=true`, só no `.env.local` (já acrescentado aqui; o contêiner `snake-web-dev` precisa ser reiniciado para ler); ausente, vale a Cloudinary, e a Vercel não precisa de nada novo. **3.2:** CSP, `Referrer-Policy` e `X-Content-Type-Options` em `next.config.ts`; `'unsafe-inline'` fica por causa das páginas estáticas (nonce obrigaria renderizar a cada acesso). Conferido: cabeçalhos no `next start` e, no Chrome headless, a página hidrata sem violação de CSP. **Falta conferir na pré-visualização do PR** entrar e enviar um comprovante. |
