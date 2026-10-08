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
| **Código** | Branch e PR desde 25/09. A Fase 6 (6.1 a 6.9 e 6.12 a 6.15, mais o 5.1) está na branch de integração `fase-6` (D15), que só vai para a `main` no G4. 10 telas na `fase-6` |
| **Produção** | <https://snake-web-eight.vercel.app> |
| **Visto funcionando** | **Só o login e a página inicial**, por você |
| **Testes** | Vitest no `pre-commit`: 162 testes na `fase-6`. E2E com Playwright contra o banco local (4.3, `npm run e2e`): 40 testes, com dados sintéticos criados e apagados pela rodada (C6) |
| **CI** | Sem CI por ora (D10): o `pre-commit` e o check da Vercel em cada PR |
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
  `is_first_login = false`.
- **Revisto em 29/09 (C1 da coordenação):** `same_password` **nunca** conta como sucesso. Quem
  digita como senha nova a senha que a academia deu recebe "A nova senha precisa ser diferente da
  anterior." e continua pendente. Uma senha que já passou nesta tela não é trocada de novo quando a
  pessoa repete o envio (a marcação falhou). Plano: `docs/planos/PLANO-3.1b-senha-igual-nao-conclui.md`.
- **Mesmo defeito no app:** item 2.4 do roadmap do app. **Vale a regra do app** (P2 a P4 de
  `snake-thai/docs/planos/PLANO-2.4-senha-antes-da-flag.md`), e a web a segue.

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

- [x] **4.1** Vitest para `lib/validacao.ts` (CPF, data, celular e senha forte) e para
  `problemaNoArquivo`. **A regra de senha precisa bater com a do app e com a do Supabase**: se a
  web aceitar uma senha que o Supabase recusa, o item 3.1 vira realidade.
- [x] **4.2** Teste do caminho de falha do primeiro acesso, que nasce junto com a correção 3.1.
- [x] **4.3** E2E com Playwright contra o banco local, cobrindo o roteiro da Fase 1: é a versão
  automática do que hoje só você confere clicando. **Decidido em 29/09 (D11): sim, agora.** Segue a
  C6: contas e dados sintéticos próprios, criados e apagados pelo teste; nunca `db-dev reset` nem
  `db-dev test`; reler o Registro do app na `origin/main` antes de rodar; só as chaves do banco
  local. Cresce a cada tela da Fase 6. **Feito em 02/10:** `npm run e2e`, plano em
  `docs/planos/PLANO-4.3-e2e.md`. [#43]

---

## Fase 5 — Interface

| # | Item | Skill | Situação |
| --- | --- | --- | --- |
| 5.1 | [x] **Navegação mínima.** Não há menu: as telas se alcançam por links na inicial. Um cabeçalho fixo em todas as páginas resolve, sem virar menu | `design-de-interface-projeto` | **Decidido em 24/09:** a linha F dos mockups, aprovada, traz o cabeçalho **Início · Aulas · Sair**. Fazer junto da Fase 6 (as pranchetas novas já o pressupõem), no mesmo layout do rodapé com "Falar com a academia" (6.15) |
| 5.2 | [x] Auditoria de acessibilidade: área de toque de 44 px, rótulos, foco visível e contraste nos dois temas | `acessibilidade-projeto` | **Feita em 25/09** (`docs/planos/ENTREGA-5.2-acessibilidade.md`) |
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
     (justificativa, "Eu estava na aula" e troca permanente). **Aberto em 07/10;**
   - **G4** (banco de produção atualizado) → pode publicar na Vercel, junto com o banco e o
     servidor e antes de o APK 2.0.0 ser liberado a todos (D39 da coordenação);
   - **G5** (Política nova). Pela D46 da coordenação, sai **no mesmo dia do G4**: com o APK
     2.0.0 instalado, o dono roda `legal:publicar` da Política antes de liberar o app aos
     alunos. A justificativa com anexo sobe no G4, **sem trava** no site, e o guarda (6.0) pede
     o aceite da versão nova na próxima página que o aluno abrir.
4. **Só o que o aluno faz** (D34). Decidir troca, justificativa ou solicitação é do app, e o
   aviso de atualização (§ 12.3) também: a web está sempre na versão publicada (ver "Fora deste
   roadmap").

A numeração dos itens da v2 não mudou. Os itens da v3 entraram como **6.12 a 6.15** e ficam
antes da Política (6.10) e da publicação (6.11), que continuam por último.

| # | Item | Contrato | Portão | Skill |
| --- | --- | --- | --- | --- |
| 6.0 | [x] **Guarda único nas páginas**: papel `user`, primeiro acesso e termos pendentes. Hoje `/aulas` não confere nada disso. As telas novas da Fase 6 nascem com ele | — | nenhum (fazer já) | `executar-projeto` |
| 6.1 | [x] **Aulas do aluno**: trocar `buscarProximasAulas` (que mostra aulas de todas as turmas, um defeito atual) por `aulas_do_aluno`. Aula cancelada **riscada**, com selo **Cancelada** e sem botões. Selo **Livres** / **Fixos** conforme `audience`. **Rótulos, botões e aviso de cota vêm só das colunas da RPC** (`schedule_mode`, `weekly_target`, `marked_in_week`, `can_justify`, `justify_until`, `can_contest`, `contest_until` e, **na v3**, `origem`, `is_recurring`, `schedule_ends_on`, `can_mark_extra`, `can_swap_from`, `can_swap_from_permanent`, `can_swap_to`, `swap_id`, `swap_kind`, `swap_status`, `swap_decided_via`, `swap_role`, `swap_other_class_id`, `swap_other_date_time` e `can_cancel_swap`): nada é calculado aqui. **Fixo (v3):** selo **Sua aula** (`origem = 'turma'`), **Troca permanente**, **Troca** + "no lugar de {dia dd/mm hh:mm}", **Troca pendente** ou **Extra**; na aula que ele trocou, "Trocou para {dia dd/mm hh:mm}" ou "Troca pendente para {dia dd/mm hh:mm}", com **Desistir da troca** (6.14); troca negada com o bloco de contato (6.15). A turma de cada aula é a da data dela (D58) e já vem pronta. Botão **Escolher aulas** (6.12) | § 12, § 3 | G3 | `executar-projeto` + `design-de-interface-projeto` |
| 6.2 | [x] **Declarar**: trocar o `upsert` direto em `attendance` por `declarar_aula(p_class_id, p_vou)`. Fixo, na aula dele: **Vou / Não vou**. Livre e à vontade: **Vou → Marcada + Desmarcar**. Com `acima_da_cota = true`, aviso que **não bloqueia** (texto do § 3) e **Desfazer**. **Fixo fora da grade (v3, D51):** **Vou (extra)** com `can_mark_extra`, em qualquer aula de rotina, **inclusive "só livres"** (D56) → selo **Extra** + **Desmarcar** (`p_vou = false` só limpa, nunca vira falta); no evento, **Vou** como qualquer aluno, sem Extra (T40); o fixo nunca vê o aviso de cota. As recusas do banco (aula cancelada, já começou, mesmo horário, fora do público e, na v3, *"Você já tem aula neste horário. Para ir nesta, peça a troca."*, *"Você trocou esta aula por outra."* e *"Você já pediu troca para esta aula."*) aparecem com a mensagem dele | § 9.2, § 9.5, § 3 | G3 | idem |
| 6.3 | [x] **Frequência**: trocar `buscarFrequencia` (RPC legada) por `frequencia_semanal` + `frequencia_do_mes`, com os dois números (Semana e Mês), e a página de semanas por `semanas_do_mes` (**Semana extra**; "Fecha em dd/mm" só pela regra do § 3). Percentual nulo aparece como **—**. **Tirar a régua de 70 (`FREQUENCIA_MINIMA`) copiada na web**: o alerta de frequência baixa passa a depender do contrato (T10, T30) | § 11.6, § 3 | G3 | idem |
| 6.4 | [x] **Barra da semana**: livre = **feitas + marcadas / cota**; à vontade = **feitas / meta** | § 3, § 9.2 | G3 | idem |
| 6.5 | [x] **Meta do à vontade**: "Meta: {n}x por semana" + **Mudar**. A folha diz "Vale a partir de {seg dd/mm}. A meta desta semana continua {n}x." RPCs `definir_meta_semanal(p_meta)` e `meta_da_semana(p_user_id, p_week_start)` | § 5.3 | G3 | idem |
| 6.6 | [x] *(anexo feito em 07/10, depois do G2; a justificativa com anexo sobe no G4, sem trava, e o G5 sai no mesmo dia: D46 da coordenação)* **Justificativas**: `minhas_justificativas()`. Fixo: **por aula** (até 7 dias depois da aula). Livre com cota: **por semana** ("Justificar mais 1 aula", com `semanas_do_mes.justifications_left`). À vontade: **não justifica** (D39). **Texto obrigatório.** Envio: `enviar_justificativa(...)` → se houver arquivo, `POST /v1/justifications/sign-upload { "justificationId" }` → Cloudinary com os campos assinados como vieram (`overwrite=false` e, na v3, `allowed_formats`) → `anexar_a_justificativa(p_id)`. **Reenvio (D42):** com `can_resend`, "Reenviar até {dd/mm}" → `reenviar_justificativa(p_id, p_texto)` e o mesmo fluxo de anexo. Rótulos do § 3, inclusive as duas mensagens de negada; **a negada pela 2ª vez leva o bloco de contato** (6.15). Na aula original de uma troca, `can_justify` já vem `false` (T38). Sem Cloudinary, anexo indisponível, **nunca** o Storage (T25) | § 9.1, § 13.2, § 3 | G3 + G2 | idem |
| 6.7 | [x] *(anexos feitos em 07/10, depois do G2)* **"Eu estava na aula"** (com `can_contest`): `criar_motivo('request_evidence', p_class_id, p_texto)` → anexos opcionais por `POST /v1/motivos/sign-upload { motivoId, anexoId }` + `anexar_ao_motivo(motivoId, anexoId)` → `abrir_solicitacao('student_was_present', p_class_id, motivoId)`. Acompanhamento por `minhas_solicitacoes()`; **negado (`status = 'rejected'`): bloco de contato** (6.15). Vale também para o à vontade (D40). Na v3, `can_contest` também vale na aula nova de uma troca avulsa **expirada** e vem `false` na aula original de troca (T38) | § 9.3, § 5.4 | G3 (anexo: G2) | idem |
| 6.8 | [x] **Histórico de aulas** do próprio aluno: `historico_de_aulas_do_aluno(auth.uid(), p_de, p_ate)`. O aluno vê a marca **Editada**, mas **nunca** quem editou nem o valor anterior (as colunas vêm nulas para ele, D20). **Na v3:** `origem`, `swap_kind` e `swap_other_date_time`; a aula original de troca aprovada vem com `origem = 'trocou'` e mostra "Trocou para {dia dd/mm hh:mm}" **no lugar de "Falta"** | § 12 | G3 | idem |
| 6.9 | [x] **Rótulos unificados** com o app: justificativa, frequência e modalidade e, na v3, troca, extra e contato. Os antigos "Aceita", "Recusada" e "Em análise" saem | § 3 | — | idem |
| 6.12 | [x] **Aulas da semana** (v3, D43): botão **Escolher aulas** na tela Aulas → tela **Aulas da semana**, abas **Esta semana** / **Próxima semana**, um bloco por dia de aula (`class_weekdays`, lido direto de `academy_settings`, § 12.2). Uma chamada `menu_de_aulas(p_semana)` por aba: só esta semana e a próxima (outra dá `22023`), inclusive as aulas que já passaram. **Ações só pelas colunas** (tabela de ações da § 12.2): livre e à vontade, **Vou** → **Marcada** + **Desmarcar**, com o aviso de acima da cota; fixo, **Vou / Não vou** na aula dele, **Vou (extra)** com `can_mark_extra` em **qualquer aula de rotina, inclusive "só livres"** (D56) → **Extra** + **Desmarcar**, **Trocar para esta** com `can_swap_to` (6.13) e **Desistir da troca** na troca pendente e, com `can_cancel_swap`, em `origem = 'trocou'` (6.14). A troca mais recente negada, expirada ou cancelada mostra o rótulo da § 3 (negada: + bloco de contato). Aula cancelada riscada e sem ação. **Sem vagas nem contagem** (T43). Link **Meus pedidos** (6.14), como na prancheta da web | § 12.2, § 3, § 9.5 | G3 | `executar-projeto` + `design-de-interface-projeto` |
| 6.13 | [x] **Folha "Trocar aula"** (v3, D44–D47), aberta pela aula nova. **"Qual aula sua você quer trocar por esta?"**: as aulas da mesma semana com `can_swap_from` ou `can_swap_from_permanent`; as que já passaram (só `can_swap_from`) com o selo **Reposição**. **Tipo:** **Só nesta semana** se a escolhida tem `can_swap_from` (é o padrão); **Permanente** se ela tem `can_swap_from_permanent` e a aula nova tem `is_recurring`; com `schedule_ends_on`, "Este horário termina em {dd/mm}." **Só nesta semana:** `pedir_troca_de_aula(de, para, 'once')`, sem justificativa (P19). **Permanente, nesta ordem (§ 9.4):** (1) `criar_motivo('class_swap_evidence', null, texto)`, com o campo **"Por que você precisa mudar de horário?"** (obrigatório, até 500) → `motivoId`; (2) para cada arquivo (até 5; JPG, PNG, WEBP, HEIC ou PDF; 10 MB, T46): gerar o `anexoId` (UUID v4) → `POST /v1/motivos/sign-upload { motivoId, anexoId }` → Cloudinary com os campos assinados → `anexar_ao_motivo(motivoId, anexoId)`; se um falhar, avisar e deixar tentar de novo ou seguir sem ele; (3) `pedir_troca_de_aula(de, para, 'permanent', motivoId)`. Aviso **"A troca permanente muda a sua grade a partir da próxima aula depois da aprovação."** Botão **Pedir troca**. Recusas: a mensagem do banco (tabela da § 9.4). Depois, recarregar o menu: a extra marcada na aula nova vira o pedido. Sem Cloudinary, anexo indisponível, **nunca** o Storage (T25) | § 12.2, § 9.4, § 8, § 3 | G3 (anexo: G2) | idem |
| 6.14 | [x] **Meus pedidos** e **Desistir da troca** (v3): `minhas_trocas()` sem parâmetros (últimos 60 dias e as futuras), com os rótulos da § 3: **Troca pendente** + **Desistir da troca** (com `can_cancel`); **Troca aprovada por {nome}**; com `decided_via = 'system'`, **Troca abonada: a aula nova foi cancelada**, sem nome (T50, D57); **Troca negada** + bloco de contato, nunca quem negou (D16); **Troca expirada · vale a aula original**; **Você desistiu da troca** (`decided_via = 'student'`) ou **Troca cancelada**. Na permanente, o texto que ele escreveu (`motivo_texto`). `desistir_da_troca(p_id)`, com as recusas da § 9.4 na mensagem do banco. **A web não tem push** (§ 10): é aqui, no menu e em Aulas que o aluno de iPhone fica sabendo da decisão | § 9.4, § 3, § 10 | G3 | idem |
| 6.15 | [x] **Contato da academia** (v3, D52): `contato_da_academia()`, **nunca** `select` em `academy_settings` para isso. Links `https://wa.me/<whatsapp>` e `mailto:<email>`; o WhatsApp aparece como +55 (DD) NNNNN-NNNN. **Onde (lista fechada da § 5.4):** **"Falar com a academia"** no rodapé das páginas logadas (a web não tem Perfil); **bloco de contato** ("Para mais informações, fale com a academia:" + **WhatsApp** / **E-mail**, só os preenchidos) na troca negada (menu, Aulas e Meus pedidos), no "Eu estava na aula" negado e na justificativa negada pela **2ª** vez. **Não aparece** na tela de login, antes do login nem na negada pela 1ª vez. Sem contato cadastrado: o bloco mostra só a frase, e "Falar com a academia" mostra "A academia ainda não cadastrou um contato. Procure a recepção." | § 5.4, § 3 | G3 | idem |
| 6.10 | **Nova versão da Política** (atestado como dado de saúde, guardado 180 dias depois da decisão, D22 e D54; metas, solicitações e trocas de aula): conferir `/termos` com a versão nova. **Código conferido em 08/10 (D46 da coordenação), sem mudança:** o guarda (6.0) chama `documentos_legais_pendentes` em toda página logada. A função devolve todo documento vigente sem aceite da pessoa, então a versão nova vira pendente e manda o aluno para `/termos`, que mostra só ela. **Falta só a conferência no ar:** depois do `legal:publicar`, no dia do G4, o dono abre o site com uma conta de aluno e vê a Política nova pedindo aceite | — | G5 (no dia do G4, D46 da coordenação) | `testes-projeto` |
| 6.11 | ⚠️👤 **Publicar na Vercel**, **no G4, junto com o banco e o servidor** (D39 da coordenação, 08/10): o `db-push-prod` (com o #94 do `snake-thai` mesclado logo antes, D41) e o servidor sobem, e a `fase-6` vai para a `main` em seguida, com a confirmação do dono. Só depois o dono testa o APK 2.0.0 no próprio celular e o libera a todos. Entre o `db-push-prod` e o merge, a web atual roda contra o banco novo (compatibilidade abaixo) | § 14, D39 | **G4**. Os anexos (6.6, 6.7 e 6.13) já não esperam nada: o G2 abriu em 07/10. A justificativa com anexo sobe junto, sem trava: o G5 sai no mesmo dia, antes de o app ser liberado aos alunos (D46 da coordenação) | — |

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
    conferido pelo dono com o domínio da Vercel em 24/09 (§ 13.4). O G2 abriu em 07/10, e na
    mesma noite o dono tirou do `ALLOWED_ORIGIN` a origem da prévia usada no teste do comprovante.
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
  preenche `scope` e `week_start`). Ela vai **só com o texto**: a web da `main` nunca anexou
  justificativa e não grava `proof_*` nela. Pela D42 revista da coordenação, o jeito velho de
  anexar é desligado no `db-push-prod`. Por isso, **a partir do `db-push-prod` e até a
  `fase-6` entrar, a web da `main` não anexa justificativa**, e nada muda na tela dela.
- `frequencia_mensal` passa a devolver o ritmo, já com a grade efetiva: troca, reposição e extra
  entram certos no número.
- Para o livre, **Vou** numa aula só de fixos é recusado (fora do público), e a web atual mostra
  o erro genérico de conexão.
- **Por isso o 6.11 sai no próprio G4, junto com o banco e o servidor (D39 da coordenação):** o
  intervalo em que a web atual roda contra o banco novo fica curto, e até o merge o aluno de
  iPhone não vê menu, troca, extra nem contato.

---

## Fase 7 — Acompanhar o app

**7.1 — Central de avisos na web. Decidida em 29/09 (D9): sim, só leitura.** O app desenha o 5.1
para as duas interfaces lerem do mesmo lugar (tabela ou RPC que o aluno lê, com RLS de aluno), e
isso entra no contrato antes do 5.1c. **A tela da web espera o 5.1 do app na `main`.** A guarda da
central é de 90 dias (D17) e gera uma versão nova da Política, com aceite novo aqui (7.2).

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

**7.4 — Alerta de frequência baixa. Decidido em 02/10 (D21): sim, depois da 2.0.0.** O banco
calcula o risco (T10, T30) e expõe ao aluno uma coluna nova, com versão nova do contrato, no item
do app. **A web só mostra** o que a coluna disser, sem refazer a conta nem voltar a régua de 70%
que saiu no 6.3. O à vontade fica de fora (D35). Espera a 2.0.0 e o contrato com a coluna.

---

## Fase 8 — CI (opcional)

**Decidida em 29/09 (D10): não por ora.** Continuam o gate local (`pre-commit`) e o check da
Vercel. Se você proteger a `main` (0.4), o check exigido é o da Vercel.

`configurar-ci-cd-projeto`: lint, typecheck e os testes da Fase 4 a cada PR. **Opcional**: você
pediu "esquece o CI" para o app em 2026-09-16, e a Vercel já recusa publicar código que não
compila. O ganho real só aparece quando a Fase 4 existir. [#76]

---

## Decisões em aberto (suas)

| Decisão | Recomendação | Onde |
| --- | --- | --- |
| Trabalhar com branch e PR | **Adotado em 25/09** (PR da Fase 0). Falta o 0.4, proteger a `main` | 0.3 |
| Cabeçalho com "Início" e "Sair" | **Decidida em 24/09:** a linha F aprovada traz **Início · Aulas · Sair** | 5.1 |
| Central de avisos na web | **Decidida em 29/09 (D9): sim, só leitura.** O app desenha o 5.1 para as duas interfaces lerem do mesmo lugar; a tela da web espera o 5.1 do app na `main` | 7.1 |
| E2E com Playwright | **Decidida em 29/09 (D11): sim, agora**, contra o banco local, cobrindo o roteiro da Fase 1 e seguindo a C6 | 4.3 |
| CI | **Decidida em 29/09 (D10): não por ora.** Continuam o gate local e o check da Vercel; com a `main` protegida (0.4), o check exigido é o da Vercel | Fase 8 |
| Branch da Fase 6 | **Decidida em 01/10 (D15):** branch de integração `fase-6`; cada item é um PR para ela, mesclado pelo chat com o check da Vercel verde (não publica). A `fase-6` vai para a `main` só no **G4** e com a confirmação do dono | Fase 6 |
| Merge do #9 (C5, frase do banco) | **Decidida em 02/10 (D18): autorizado.** Mesclado em 05/10 com o check da Vercel verde na cabeça; depois da publicação, a `main` veio para a `fase-6` | C5 |
| Mensagem de erro | **Decidida em 02/10 (D20), regra geral nos três repositórios:** cada erro identificado (o `SQLSTATE` e a frase do banco, o código do servidor) mostra a sua mensagem própria; só o não identificado cai na genérica. Vale no código tocado daqui em diante. **Parte do banco feita em 05/10** (`mensagemDaFalha`, Registro de 05/10). **Parte do servidor feita em 07/10 (C16):** `mensagemDoServidor` cobre a tabela da § 13.6 da v6, e o `pedirAssinatura` a usa (Registro de 07/10). **Telas de leitura feitas em 07/10 (D28).** Regra aplicada na web inteira | C16, D28 |
| Telas "Não foi possível carregar" | **Decidida em 07/10 (D28): também passam pela D20.** **Feita em 07/10:** `motivoDaFalhaDeLeitura` escolhe a frase em todas as telas de leitura, no guarda e no contato (Registro de 07/10). **Página de pagar, decidida e feita em 07/10 (D32):** a falha de leitura mostra o motivo real no lugar de "Mensalidade não encontrada" | D20, D32 |
| Alerta de frequência baixa na web | **Decidida em 02/10 (D21): sim, depois da 2.0.0.** O banco calcula (T10, T30) e expõe ao aluno uma coluna de risco, com mudança de contrato no próprio item do app; a web só mostra. O à vontade fica de fora (D35). A web não refaz a regra nem volta a régua de 70% | 7.4 |
| Fonte Inter/Syne na web, igual ao app | Não por ora: os mockups da web usam a fonte do sistema | 6.9 |
| Numeração das decisões | **Decidida em 07/10 (C21 da coordenação):** as séries se repetem e nada é renumerado. A decisão que vem da coordenação é citada com a origem: "D35 da coordenação" ou "D35 (COORDENACAO 07/10)". O "(D35)" deste roadmap, no 7.4, é o à vontade fora do alerta; a D35 da coordenação é o botão de mostrar a senha | Registro de 08/10 |
| Quando publicar a web | **Decidida em 08/10 (D39 da coordenação):** no G4, junto com o banco e o servidor, **antes** de o APK 2.0.0 ser liberado a todos. A `fase-6` vai para a `main` com a confirmação do dono | 6.11 |
| Justificativa com anexo antes do G5 | **Decidida em 08/10 (D46 da coordenação): sem trava.** O G5 sai no mesmo dia do G4, durante o teste: com o APK 2.0.0 instalado, o dono preenche os "Dados dos termos" e roda `npm run legal:publicar -- politica 1.0` antes de liberar o app aos alunos. Isso substitui o "depois da 2.0.0" da D40 da coordenação. O site já pede o aceite da versão nova (6.10) | 6.6, 6.10, 6.11 |
| Jeito velho de anexar a justificativa | **Decidida em 08/10 (D42 revista da coordenação):** o `proof_*` legado gravado direto pelo aluno e o `sign-upload {classId}` são desligados na 2.0.0, sem os 90 dias. A `fase-6` não usa nenhum dos dois (conferido em 08/10); a web da `main` não anexa justificativa | 6.6, compatibilidade |
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
| 2026-09-25 | **3.1 e 4.2 feitos** na branch `fix/primeiro-acesso-senha` (sobre a da Fase 0), em PR; plano em `docs/planos/PLANO-3.1-senha-do-primeiro-acesso.md`. Ordem nova: dados **sem** a flag → `auth.updateUser` → `is_first_login = false`; se a segunda tentativa receber `same_password`, a senha já tinha mudado e a marcação segue. **Conferido no banco local** com 3 contas sintéticas (apagadas no fim): `weak_password` real mantém a flag `true`; `same_password` real conclui. Primeira suíte: Vitest, 6 testes, no `pre-commit`. `@types/node` foi para ^22 (o Vitest 5 pede 22+; o contêiner usa Node 24). ~~**Para o app (2.4), a mesma regra:** flag por último e `same_password` tratado como senha já trocada.~~ *(Pedido retirado em 29/09: vale a regra do app, C1.)* O último item do 1.2 (simular a queda antes de corrigir) ficou para trás: o comportamento antigo está descrito no 3.1. |
| 2026-09-25 | **3.2, 3.3 e 3.4 feitos** na branch `fix/log-sem-dado-pessoal` (sobre a do 3.1), em PR; plano em `docs/planos/PLANO-3.2-a-3.4-correcoes.md`. **3.3:** o console registra só o status das recusas da Cloudinary e do Storage. **3.4** (entrou porque o 3.3 mexeu no arquivo): o desvio para o Storage passa a ser `NEXT_PUBLIC_PROOF_UPLOAD_TO_STORAGE=true`, só no `.env.local` (já acrescentado aqui; o contêiner `snake-web-dev` precisa ser reiniciado para ler); ausente, vale a Cloudinary, e a Vercel não precisa de nada novo. **3.2:** CSP, `Referrer-Policy` e `X-Content-Type-Options` em `next.config.ts`; `'unsafe-inline'` fica por causa das páginas estáticas (nonce obrigaria renderizar a cada acesso). Conferido: cabeçalhos no `next start` e, no Chrome headless, a página hidrata sem violação de CSP. **Falta conferir na pré-visualização do PR** entrar e enviar um comprovante. |
| 2026-09-25 | **4.1 feito** na branch `test/validacao` (sobre a do 3.2–3.4), em PR: testes de `lib/validacao.ts` (senha, CPF, celular, data, nome e máscaras) e de `problemaNoArquivo`; 34 testes no total. **Regra de senha conferida:** a regex da web é a mesma do app (`snake-thai/src/utils/validation.ts`), e o Supabase local não tem política extra (`config.toml` sem `minimum_password_length`, padrão 6). Então a web é mais exigente que o Supabase, e um teste guarda isso. **Falta conferir (👤):** a política de senha do Supabase de **produção** (Authentication → Policies), que não fica no repositório. Se ela for mais exigente que a da web, o primeiro acesso falha, e o 3.1 garante que a pessoa volta para a tela. |
| 2026-09-25 | **6.0 feito** na branch `feat/guarda-unico` (sobre a do 4.1), em PR; plano em `docs/planos/PLANO-6.0-guarda-unico.md`. `lib/guarda.ts` (`verificarAcesso`, sessão → papel `user` → primeiro acesso → termos pendentes; na dúvida, erro, nunca libera) e `components/Protegida.tsx`, que só monta a página liberada. As cinco páginas logadas usam o guarda, cada uma até a etapa anterior à dela; as telas "Esta página é só para alunos" e "Não foi possível carregar" são as que já existiam na inicial (nenhum texto novo). **Conferido no Chrome headless contra o banco local**, com 4 contas sintéticas apagadas no fim: primeiro acesso abrindo `/aulas` e `/termos` → `/primeiro-acesso`; professor → barrado, com a sessão encerrada; termo pendente abrindo `/pagar/…` → `/termos`; aluno em dia → `/aulas` e `/inicio` abrem, `/primeiro-acesso` volta à inicial; sem sessão → login. 16 testes novos (50 no total). Avisos de lint: de 16 para 8. **A Fase 6 para aqui até o G3.** |
| 2026-09-25 | **5.2 feito** na branch `feat/a11y` (sobre a do 6.0), em PR, com a `acessibilidade-projeto`; relatório em `docs/planos/ENTREGA-5.2-acessibilidade.md`. Área de toque, rótulos e foco já estavam certos. **Dois achados sérios, corrigidos:** 3 selos do tema claro abaixo de 4,5:1 (3,81 a 4,39) → tinta misturada ao texto principal (≥ 5,15); borda dos campos a 1,3:1 → token derivado `--input-border` (3,44 no claro, 4,22 no escuro). **Menores:** dica de senha anunciada (`aria-live`) e ligada ao campo, "Carregando…" com `role="status"`, "✓" escondido do leitor de tela. Nenhum texto novo. **A validar com leitor de tela no celular (👤).** |
| 2026-09-29 | **Correção C1 no 3.1** (`handoffs/COORDENACAO.md`, 28/09), na `fix/primeiro-acesso-senha` (PR #4), levada às branches de cima com merge. `same_password` deixou de concluir o primeiro acesso: a senha que a academia deu nunca continua valendo. A web segue a regra do app (P2 a P4 do `PLANO-2.4-senha-antes-da-flag.md` do `snake-thai`, PR #45): a senha que já passou nesta tela não é trocada de novo ao repetir o envio (um `useRef` na página), e "senha igual" mostra "A nova senha precisa ser diferente da anterior.", a mesma frase do app. Testes: 9 (4 novos, com o caminho de falha da senha igual). **Retirado** o pedido do Registro de 25/09 para o app copiar a regra da web. Plano: `docs/planos/PLANO-3.1b-senha-igual-nao-conclui.md`. |
| 2026-09-29 | **PRs #3 e #4 mesclados** na `main` (merge commit, autorizados pela D1), e a produção da Vercel publicou os dois. O #4 já leva a correção C1. O #5 foi reapontado para a `main` e está verde; **o merge espera o dono enviar um comprovante pela prévia do #5** (`https://snake-owd058pyt-yagoriccomis-projects.vercel.app`), o único caminho que passa pela CSP nova rumo à Render e à Cloudinary. Depois, #5 a #8 em ordem, cada um com o check verde. As branches `chore/fundacao` e `fix/primeiro-acesso-senha` só serão apagadas no fim da pilha. **G3 conferido na `origin/main` do `snake-thai` (29/09, 11:34): fechado** (4.9b em aberto). Depois da pilha, não há item da web na fila. |
| 2026-10-02 | **Decisões de 29/09 e 01/10 registradas** (`handoffs/COORDENACAO.md`; a entrada de 29/09 não tinha chegado a este chat, C7). **D9:** central de avisos na web, só leitura (7.1); a tela espera o 5.1 do app na `main`. **D10:** sem CI por ora (Fase 8); com a `main` protegida, o check exigido é o da Vercel. **D11:** E2E com Playwright agora (4.3), seguindo a C6. **D15:** a Fase 6 vai numa branch de integração `fase-6`, criada hoje a partir da `feat/a11y` (topo da pilha, com o 6.0); cada item é um PR para ela, mesclado por este chat com o check da Vercel verde; a `fase-6` vai para a `main` só no G4 e com a confirmação do dono; quando a pilha #5–#8 entrar, a `main` vem para a `fase-6` com merge. **G3 aberto em 29/09** (Registro do app na `origin/main`, PR #75): as 23 RPCs do aluno estão na `main` e no banco local, e a Fase 6 pode ser desenvolvida a partir do 6.1. Contrato na `origin/main`: ainda **v4**; a v5 (D12) não muda nada para a web. **C5 no PR #9** (a partir da `main`): com o código `23514`, o Vou / Não vou e a justificativa mostram a frase do banco; nos outros erros, a frase de conexão. Precisa estar no ar antes do `db-push-prod` da 2.0.0; **o merge publica e espera o dono**. Plano: `docs/planos/PLANO-C5-frase-do-banco.md`. *Só como informação:* D14 (comprovante guardado 90 dias) e D17 (central com guarda de 90 dias) entram na Política; a da D17 gera aceite novo aqui (7.2). |
| 2026-10-02 | **4.3 feito** (D11), na branch `test/e2e-fase-1`, em PR para a `fase-6`; plano em `docs/planos/PLANO-4.3-e2e.md`. `npm run e2e` (Playwright, Chromium) sobe a página na porta 3101 e repete o roteiro da Fase 1 contra o banco local: **1.1** aceite gravado, uma linha por documento, e "Sair sem aceitar"; **1.2** dados e senha, a senha nova entra e a antiga não, o "Não usa o app" já preenchido e as quatro validações sem gravar nada; **1.3** PNG e PDF em análise no Storage, acima de 10 MB, tipo não aceito e a mensalidade de outra pessoa; **1.4** Vou só em `declared_status` e a justificativa (vazio, limite de 255, texto válido em análise); **1.5** professor barrado e sem sessão → login. **13 testes verdes.** **C6 à risca:** trava que recusa qualquer endereço que não seja `localhost` (no `.env.local` e no `supabase status`); a chave de serviço vem do `supabase status` do `snake-thai`, na hora, e não vai para arquivo; contas, turma, plano e, se faltarem, documentos sintéticos com marca própria (`@e2e.invalid`, `e2e-…`), criados e apagados pela rodada, inclusive o rastro no `audit_log`; nenhum `db-dev reset` nem `test`. Registro do app relido na `origin/main` antes de rodar: nada novo desde 29/09; o banco local estava **sem dados** (o último comando do app foi `db-dev test`), e o E2E não depende do seed. Conferido depois da rodada: nada com a marca do E2E no banco. Ficam no roteiro manual: o admin abrindo o comprovante e o professor decidindo no app DEV, a queda de rede do 1.2 (coberta pelos testes de unidade do 3.1) e a sessão expirada. |
| 2026-10-02 | **6.1 feito** (Fase 6, D15), na branch `feat/6.1-aulas-do-aluno`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.1-aulas-do-aluno.md`, com a `design-de-interface-projeto`. `/aulas` e o bloco "Próximas aulas" da inicial leem `aulas_do_aluno`: **acabou o defeito de mostrar as aulas de todas as turmas.** `/aulas` mostra de hoje a 7 dias, por dia ("Hoje · qua 23/09"); a inicial, as 3 próximas. Cartão da linha F (hora, trilho com a cor do professor, título, selos e professores, estado à direita); rótulos da § 3 só pelas colunas: **Cancelada** (riscada e sem botões), **Livres** / **Fixos**, **Sua aula**, **Troca permanente**, **Troca** + "no lugar de…", **Troca pendente**, **Extra**, **Marcada**, "Trocou para…", "Troca pendente para…" e os rótulos da troca negada, expirada e cancelada. Token novo `--info`: no escuro, `#93c5fd` dos mockups, porque o `#1e3a8a` do app fica perto de 2:1 sobre o fundo escuro (*para o app, só como informação: o mesmo valor está no tema escuro dele*). Os botões **Vou / Não vou** e a justificativa continuam os de antes até o 6.2. **Mockups:** o artifact do roadmap do app não abre nesta conta; foi usada a cópia da versão 8 gerada em 25/09 pela sessão que os publicou (premissa P1). Testes: 18 de unidade novos (71 no total); E2E com a aula de outra turma (não aparece) e a cancelada, **15 verdes**. O E2E passou a subir a página compilada (`next build` + `next start`): no `next dev`, a primeira compilação de cada rota, com a máquina ocupada, passava do tempo do teste. |
| 2026-10-02 | **6.2 feito**, na branch `feat/6.2-declarar-aula`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.2-declarar-aula.md`. O aviso deixa o `upsert` direto e passa por `declarar_aula`; os botões saem só das colunas de `aulas_do_aluno`, pela tabela de ações da § 12.2: livre e à vontade **Vou** → **Marcada** + **Desmarcar**; fixo **Vou / Não vou** na aula da grade (o que ele já avisou fica preenchido), **Vou (extra)** com `can_mark_extra` e **Desmarcar** na extra; evento, **Vou** para qualquer aluno; nenhum botão na aula cancelada, depois do início ou com troca saindo dela (lá entra o **Desistir da troca** do 6.14). Acima da cota: "Marcada, acima do plano" com o texto da § 3 e **Desfazer**, sem bloquear. **As recusas `23514` aparecem com a frase do banco**: o `lib/erros.ts` da C5 (PR #9) veio para a `fase-6` com o conteúdo idêntico, para a `main` entrar depois sem conflito nesse arquivo. Testes: 21 de unidade novos (92 no total); E2E com o livre (marcar, desmarcar, acima da cota, mesmo horário com a frase do banco), a extra do fixo e a aula que já começou; **20 verdes**. O E2E achou duas regras do banco que a tela segue sem calcular: a cota da semana é proporcional aos dias em que o plano vale (um plano 1x que começa na sexta vale 0x), e as aulas da turma anteriores à entrada do aluno não são dele (D58); o aluno sintético passou a nascer com plano e turma de 30 dias atrás. |
| 2026-10-02 | **6.3 feito**, na branch `feat/6.3-frequencia`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.3-frequencia.md`. A inicial mostra **Semana · {p}%** e **Mês · {p}%** com "{a} de {e}" (`frequencia_semanal` e `frequencia_do_mes`), **—** com esperado zero e, no à vontade, **Meta da semana** e **Meta do mês**; o cartão leva à página nova `/frequencia`, com as semanas do mês (`semanas_do_mes`), a **Semana extra** e o "Fecha em {dd/mm}, quando a semana extra terminar" só depois do fim do mês e enquanto o banco disser que ele não fechou. **Saiu a régua de 70% (`FREQUENCIA_MINIMA`) e a `frequencia_mensal`.** O alerta de frequência baixa não foi refeito aqui (a T10 é regra do banco, sem coluna para o aluno): está em "Decisões em aberto". Testes: 12 de unidade novos (104 no total); E2E da inicial e da página, **22 verdes**. |
| 2026-10-02 | **6.4 feito**, na branch `feat/6.4-barra-da-semana`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.4-barra-da-semana.md`. Cartão "Esta semana" na inicial: livre, "cota {n}x", barra e "{f} feitas · {m} marcadas"; à vontade, **Meta: {n}x por semana** (rótulo da § 3) com as feitas; o fixo não tem o cartão. Feitas e marcadas saem das colunas de `aulas_do_aluno` da semana (seg a dom) **com a mesma leitura do app** (`resumoDaSemana` do `snake-thai`): feitas = rotina não cancelada com `status = 'present'`; marcadas = `declared_status = 'present'` sem chamada. *Para o app, só como informação:* ele mostra "Sua meta: …" (da prancheta); a § 3 diz "Meta: {n}x por semana", e a web seguiu o contrato. Testes: 4 de unidade novos (108 no total); E2E do livre e do fixo, **24 verdes**. |
| 2026-10-02 | **6.5 feito**, na branch `feat/6.5-meta-do-a-vontade`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.5-meta-do-a-vontade.md`. **Mudar** ao lado de "Meta: {n}x por semana" abre, dentro do cartão, a folha "Meta da próxima semana" (de 1 a 6, com os textos e a faixa do app), que abre com a meta que já vale na semana que vem (`meta_da_semana`). Salvar chama `definir_meta_semanal(p_meta)` e mostra "Vale a partir de {seg dd/mm}. A meta desta semana continua {n}x." com a data que o banco devolve. A recusa do banco aparece com a frase dele. Testes: 5 de unidade novos (113 no total); E2E do à vontade (grava em `weekly_goals`, a meta desta semana não muda) e do livre (sem **Mudar**), **26 verdes**. |
| 2026-10-02 | **6.6 feito, menos o anexo**, na branch `feat/6.6-justificativas`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.6-justificativas.md`. A justificativa deixa o `upsert` e vai por `enviar_justificativa`, com **texto obrigatório**: na aula do fixo, pelo **Não vou** (só com `can_justify` e sem justificativa na aula, como o app); na semana do livre, pelo bloco **Justificativas** de `/frequencia` (`semanas_do_mes`), com **Justificar mais 1 aula**, "Até dd/mm" e quantas restam. Página nova **Minhas justificativas** (`minhas_justificativas`) com os rótulos da § 3 (em análise, aprovada por {nome}, negada · você pode reenviar até {dd/mm}, e a frase da 2ª negada) e **Reenviar até {dd/mm}** (`reenviar_justificativa`, D42). Saem os rótulos antigos "Em análise", "Aceita" e "Recusada". **Espera o G2:** o anexo (`sign-upload {justificationId}` → Cloudinary → `anexar_a_justificativa`); para publicar com anexo, também o G5. **Espera o 6.15:** o bloco de contato na 2ª negada. Testes: 13 de unidade novos (126 no total); E2E do envio, do reenvio e da 2ª negada, **28 verdes**. |
| 2026-10-02 | **6.7 feito, menos os anexos**, na branch `feat/6.7-eu-estava-na-aula`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.7-eu-estava-na-aula.md`. **Eu estava na aula** nas aulas com `can_contest`: as de hoje, na lista, e as de até 7 dias atrás, na seção nova **Para conferir** de `/aulas`. O pedido vai por `criar_motivo('request_evidence', …)` → `abrir_solicitacao('student_was_present', …)`, com os textos do app. Página nova **Meus pedidos** (`/pedidos`, `minhas_solicitacoes`): "Pedido em análise", "Pedido aprovado por {nome}" e "Pedido negado"; quem negou nunca aparece (D16). O formulário do 6.6 virou `FormularioDeMotivo`, que serve às duas coisas. **Espera o G2:** os anexos do pedido. **Espera o 6.15:** o bloco de contato no pedido negado. **No 6.14:** as trocas entram em Meus pedidos. Testes: 6 de unidade novos (132 no total); E2E do pedido numa aula com chamada e da aula sem chamada. **A limpeza do E2E mudou (C6):** a API não apaga aula com chamada concluída, e a primeira rodada deixou dados sintéticos no banco local; agora essas aulas são apagadas por conexão direta ao Postgres local (`DB_URL` do status, só endereço local), numa transação que desliga a trava `enforce_class_state_rules` e a religa antes do commit, sem que outra sessão veja a trava desligada. A rodada seguinte limpou o que tinha ficado. |
| 2026-10-02 | **6.8 feito**, na branch `feat/6.8-historico`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.8-historico.md`. Seção **Histórico de aulas** em `/frequencia`, no mês escolhido (`historico_de_aulas_do_aluno`): data e hora, aula, a marca **Editada** e "Feita {x} dia(s) depois" (T14), e a situação com a leitura do app ("Presente", "Falta", "Falta justificada", "Cancelada", "Sem registro" e "Trocou para {dia dd/mm hh:mm}" no lugar de "Falta" na aula trocada). Quem editou e o valor anterior nem são lidos (D20). Testes: 5 de unidade novos (137 no total); E2E com presença e falta editada, **31 verdes**. |
| 2026-10-02 | **6.9 feito**, na branch `feat/6.9-rotulos`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.9-rotulos.md`. Os rótulos da § 3 de justificativa, frequência, troca e extra vieram nos itens 6.1 a 6.8; aqui entrou a modalidade (**Horário fixo**, **Horário livre**, **À vontade**) no resumo de `/frequencia`. Conferido: "Aceita", "Recusada" e o "Em análise" da justificativa não aparecem mais. O "Em análise" da **mensalidade** fica: é o rótulo do pagamento, o mesmo do app. Testes: 1 de unidade novo (138 no total); E2E de `/frequencia`. |
| 2026-10-02 | **6.12 feito**, na branch `feat/6.12-aulas-da-semana`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.12-aulas-da-semana.md`. **Escolher aulas** em `/aulas` leva à página nova **Aulas da semana** (`/aulas/semana`): abas **Esta semana** / **Próxima semana**, um botão por dia de aula (`academy_settings.class_weekdays`, leitura direta; aula fora desses dias aparece no dia dela), a lista do dia por `menu_de_aulas(p_semana)` e as ações só pelas colunas (tabela da § 12.2): **Vou**, **Marcada** + **Desmarcar**, **Vou / Não vou**, **Vou (extra)** em qualquer aula de rotina (D56) → **Extra** + **Desmarcar**, o aviso de acima da cota e os rótulos da troca. Sem vagas nem contagem (T43); link **Meus pedidos**. As ações de `/aulas` saíram para `hooks/useAcoesDaAula.ts` e `components/AulaComAcoes.tsx`, os mesmos nas duas telas. **Ficam para os próximos itens:** **Trocar para esta** (6.13), **Desistir da troca** (6.14), o bloco de contato e o rodapé "Falar com a academia" (6.15, com o cabeçalho do 5.1). Testes: 7 de unidade novos (145 no total); E2E do **Vou (extra)** do fixo e da próxima semana, **33 verdes**. |
| 2026-10-02 | **6.13 feito, menos os anexos da permanente**, na branch `feat/6.13-trocar-aula`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.13-trocar-aula.md`. No menu, **Trocar para esta** (`can_swap_to`) abre a folha **Trocar aula**: o tipo (**Só nesta semana**, o padrão; **Permanente** com `can_swap_from_permanent` e a nova `is_recurring`), "Qual aula sua você quer trocar por esta?" (com **Reposição** na que já passou) e, na permanente, a justificativa obrigatória, "Este horário termina em {dd/mm}." e o aviso da § 3. Avulsa: `pedir_troca_de_aula(de, para, 'once')`; permanente: `criar_motivo('class_swap_evidence', null, texto)` → `pedir_troca_de_aula(…, 'permanent', motivoId)`. Recusas com a frase do banco. **Espera o G2:** os anexos da permanente. No E2E, os dados sintéticos passaram a criar o horário da grade (`class_schedules`) para a aula recorrente, e a limpeza apaga os horários com a marca. Testes: 8 de unidade novos (153 no total); E2E da avulsa e da permanente, **35 verdes**. A limpeza do E2E passou a apagar também o motivo sem aula da troca permanente (o autor vira nulo quando a conta sai): na primeira rodada, 2 tinham ficado no banco local e foram apagados à mão. |
| 2026-10-02 | **6.14 feito**, na branch `feat/6.14-meus-pedidos-e-desistir`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.14-meus-pedidos-e-desistir.md`. **Meus pedidos** ganhou a seção **Trocas de aula** (`minhas_trocas()`): o tipo, **Reposição**, "Sai: …" e "Entra: …", o texto da permanente e os rótulos da § 3 (pendente, aprovada por {nome}, abonada pela aula nova cancelada, negada, expirada, você desistiu, cancelada), sem nunca mostrar quem negou. **Desistir da troca** em Meus pedidos (`can_cancel`) e na lista de aulas e no menu (`can_cancel_swap`), com a confirmação do app, por `desistir_da_troca`; recusas com a frase do banco. É por essas telas que o aluno de iPhone, sem push, fica sabendo da decisão. **Espera o 6.15:** o bloco de contato na troca negada. **Defeito do 6.12 corrigido aqui:** em Aulas da semana, trocar de aba com a primeira leitura no ar deixava a resposta atrasada de "Esta semana" sobrescrever a da próxima; agora a resposta de uma leitura que já não é a última é descartada (o E2E pegou com a máquina carregada e passou a trocar de aba de propósito antes de a primeira leitura terminar). Testes: 4 de unidade novos (157 no total); E2E da desistência no menu e em Meus pedidos, **37 verdes**. |
| 2026-10-02 | **6.15 e 5.1 feitos**, na branch `feat/6.15-contato-e-cabecalho`, em PR para a `fase-6`; plano em `docs/planos/PLANO-6.15-contato-e-cabecalho.md`. Toda página logada do aluno ganhou o cabeçalho **Início · Aulas · Sair** (5.1, linha F; a seção atual marcada e sublinhada) e o rodapé "Dúvidas? **Falar com a academia**", que abre **WhatsApp** / **E-mail** (só os preenchidos) ou "A academia ainda não cadastrou um contato. Procure a recepção." O primeiro acesso e os termos ficam sem a moldura. O **bloco de contato** ("Para mais informações, fale com a academia:") aparece na troca negada (menu, Aulas e Meus pedidos), no "Eu estava na aula" negado e na justificativa negada pela 2ª vez; nunca na tela de login nem na 1ª negada. O contato só sai de `contato_da_academia()`, com o WhatsApp como +55 (DD) NNNNN-NNNN. O **Sair** da inicial passou para o cabeçalho. O E2E não muda o contato (configuração da academia inteira): lê o do banco local, hoje vazio, e confere a tela de acordo. Testes: 5 de unidade novos (162 no total); E2E do cabeçalho, do rodapé, da tela de login e do bloco só na 2ª negada, **40 verdes**. |
| 2026-10-02 | **Fase 6 até onde dá sem portão.** Na `fase-6`: 6.1 a 6.9 e 6.12 a 6.15, mais o 5.1 (PRs #12 a #24, cada um mesclado com o check da Vercel verde). README e "Onde estamos" atualizados; saiu da inicial o aviso antigo "Enviar comprovante e justificar falta entram aqui em seguida." **Esperam portão:** os anexos do 6.6, 6.7 e 6.13 (**G2**); o 6.10, Política nova (**G5**); o 6.11, publicar (**G4** e confirmação do dono, D15). **Espera o app:** a central de avisos (7.1, D9: depois do 5.1 do app na `main`). **Esperam o dono:** o merge do #9 (C5, publica, antes do `db-push-prod` da 2.0.0) e o comprovante pela prévia do #5, que destrava os merges #5 a #8 e a vinda da `main` para a `fase-6`. Conferido na `origin/main` do app no fim do dia: **contrato v5** na `main` (#86, D12), sem mudança para a web; G2 ainda fechado; o Registro do app aponta a C5 como correção da web (PR #9). |
| 2026-10-05 | **D18, D20 e D21 registradas** (`handoffs/COORDENACAO.md`, segunda rodada de 02/10). **D18:** o #9 (C5) foi mesclado na `main` (`e0cd5fa`) com o check da Vercel verde no commit da cabeça (`34d172d`), e a produção publicou; a frase do banco no `23514` está no ar antes da 2.0.0. A `main` veio para a `fase-6` com merge (`55d8c77`). O `lib/erros.ts` **não** estava idêntico: a `fase-6` exporta a `fraseDaRecusa` (usada pela meta e pela desistência). Os conflitos (`lib/erros.ts`, `lib/dados.ts` e `app/aulas/page.tsx`) ficaram com a versão da `fase-6`, que já leva a C5 pelo `useAcoesDaAula` e pelo `lib/justificativas.ts`; 162 testes verdes no merge. **D20:** regra geral de erros em "Decisões em aberto" (cada erro identificado com a sua mensagem; só o não identificado na genérica), e o `lib/erros.ts` cobre a tabela de códigos da v6 quando ela estiver na `main` do app (C16). **D21:** alerta de frequência baixa vira o item 7.4, depois da 2.0.0; a web só mostra a coluna de risco que o banco expuser, e o à vontade fica de fora. |
| 2026-10-05 | **D20 na web, parte do banco**, na branch `fix/d20-erros-do-banco`, em PR para a `fase-6`; plano em `docs/planos/PLANO-D20-erros.md`. Conferido contra o contrato v5 (`origin/main` do app, `6bff7d2`): a web só reconhecia o `23514`, e as frases com `22023`, `P0002` e `42501` ("Escolha o tipo da troca.", "Troca não encontrada.") caíam em "Verifique a conexão", como qualquer falha. Agora uma função só, `mensagemDaFalha(falha, ação)` no `lib/erros.ts`, decide na ordem: validação local; frase do banco (um dos quatro códigos com a primeira letra maiúscula, porque o Postgres escreve as mensagens nativas em minúscula e a RLS não pode vazar inglês para a tela); mensagem própria do SQLSTATE sem frase (`42501` "Você não tem permissão para esta ação.", como o app, e `23514`, `22023`, `P0002` e `23505`, este com o CPF repetido como no app); "Verifique a conexão" só para a rede; e a genérica "Não foi possível <ação>. Tente de novo em instantes." Vale no aviso, na justificativa, na troca, na desistência, na meta (salvar e abrir), no aceite dos termos e no primeiro acesso (a senha igual continua com a frase dela). **Fora:** as telas "Não foi possível carregar" (leitura, com bloco próprio; a D20 não é auditoria geral) e a tabela de códigos do servidor, que espera a v6 na `main` do app (C16). Testes: os 10 antigos do `lib/erros.ts` viraram 15 (167 no total). |
| 2026-10-07 | **C17, D25 e D28 registradas** (`handoffs/COORDENACAO.md`, entradas de 06/10 e 07/10). **C17:** teste novo, nos três repositórios, monta as datas a partir de "hoje" ou fixa o relógio, e nunca usa uma data do calendário que só é passada, ou futura, durante alguns dias. Aqui, os testes de unidade com datas de setembro já recebem o "agora" como parâmetro (relógio fixo), e o E2E cria os dados a partir de hoje (plano e turma de 30 dias atrás, 6.2). **D25:** os handoffs seguem o padrão novo da `handoff-mp`, em `snake-web\handoff\loop\<NNN> - <DD_MM_AAAA> <resumo>.md`, fora do Git pelo `.git/info/exclude` (conferido hoje); os antigos ficam em `academy\handoffs\snake-web\` como arquivo. **D28:** as telas "Não foi possível carregar" (leitura) também passam pela D20: cada erro conhecido com a sua mensagem e o desconhecido com a genérica, num PR próprio para a `fase-6`, **depois da C16**, mesclado pelo chat com o check verde (D15). Responde à pergunta de 05/10. **Sinal da C16:** o contrato **v6** está na `main` do `snake-thai` desde 06/10 (#88, `48d8b20`), com a § 13.6. |
| 2026-10-07 | **C16 na web**, na branch `fix/c16-codigos-do-servidor`, em PR para a `fase-6`; plano em `docs/planos/PLANO-C16-codigos-do-servidor.md`. Conferido contra a § 13.6 do contrato v6 (`origin/main` do `snake-thai`, `48d8b20`). O `lib/erros.ts` ganhou `mensagemDoServidor({ status, code }, ação)`, com uma frase da web para cada `code` da § 13.6 (comuns, falha do Supabase e os de cada rota, inclusive os de justificativa e motivos que os anexos do G2 vão usar). A web decide pelo `code` e nunca mostra o texto do servidor; sem `code` (corpo que não é JSON), decide pelo status só no 401, 403, 413 e 429, que têm um sentido só. `bad_request`, `internal_error`, o `supabase_error` que a v6 tirou e qualquer `code` desconhecido caem na genérica "Não foi possível preparar o envio. Tente de novo em instantes." O `pedirAssinatura` (`lib/comprovante.ts`) usa a função; saiu o "O servidor está acordando", que era palpite para qualquer 5xx. Testes: um por `code`, o status sem `code`, os genéricos, o desconhecido e o `pedirAssinatura` com o `fetch` simulado. Sem `design-de-interface-projeto`: só a frase do alerta que já existe muda |
| 2026-10-07 | **D28 na web**, na branch `fix/d28-telas-de-carregamento`, em PR para a `fase-6`, depois da C16; plano em `docs/planos/PLANO-D28-telas-de-carregamento.md`. As telas "Não foi possível carregar" diziam sempre "Verifique sua internet e tente de novo.", e o guarda e o contato jogavam a falha fora antes da tela. Agora a falha chega até a tela, e `motivoDaFalhaDeLeitura(falha)` (`lib/erros.ts`) escolhe a frase pela mesma ordem da `mensagemDaFalha`, sem repetir o "Não foi possível": a frase do banco ou a mensagem própria do SQLSTATE; "Verifique sua internet e tente de novo." só na falha de rede; e a genérica "Tente de novo em instantes." no resto. Vale em `/inicio`, `/frequencia`, `/aulas`, `/aulas/semana`, `/termos`, `/pedidos`, `/justificativas`, no guarda (`Protegida`) e no contato do rodapé. Título e botão não mudam. Com a `design-de-interface-projeto`: `/aulas`, a única tela de erro sem parágrafo, ganhou o motivo entre o título e o botão, sem mockup. **Fora, para o dono decidir:** `/pagar/[id]` ignora o `error` da leitura e mostra "Mensalidade não encontrada" numa falha de rede; não é uma tela "Não foi possível carregar". Testes: 6 de unidade novos (220 no total) e os 2 do guarda com a falha. |
| 2026-10-07 | **D32 registrada e feita** (`handoffs/COORDENACAO.md`, quarta rodada de 07/10), na branch `fix/d32-pagar-falha-de-leitura`, em PR para a `fase-6`; plano em `docs/planos/PLANO-D32-pagar-falha-de-leitura.md`. **D32:** na página de pagar, a falha de leitura mostra o motivo real, no padrão da D28; responde à pergunta do handoff 005. A página ignorava o `error` das duas leituras: a internet caída virava "Mensalidade não encontrada", e a falha na chave PIX virava "A academia ainda não cadastrou a chave PIX". Agora `buscarMensalidadeParaPagar` (`lib/pagamento.ts`) faz as duas leituras e sobe o erro de qualquer uma, e a página mostra "Não foi possível carregar", o motivo de `motivoDaFalhaDeLeitura` e "Tentar de novo". "Mensalidade não encontrada" fica só para o banco que responde sem ela. Com a `design-de-interface-projeto`, sem mockup: o padrão da D28 sem o link "Voltar" (o menu da moldura leva ao início) e sem CSS novo. Testes: 6 de unidade novos (226 no total). |
| 2026-10-07 | **D36 feita** (`handoffs/COORDENACAO.md`, sexta rodada de 07/10, autorizada pelo dono às 16:20). A pilha entrou na `main`, um PR por vez, cada um com o check da Vercel verde e a produção conferida depois do merge (login abre; CSP com Supabase, Render e `api.cloudinary.com`; `Referrer-Policy` e `X-Content-Type-Options`): #5 (`1364311`), #6 (`abe22f1`), #7 (`630e9d8`) e #8 (`36b338e`). Nenhum precisou de reversão. A `main` voltou para a `fase-6` no #32 (`5b0c838`, D15); o conflito em `app/aulas/page.tsx` ficou com a versão da `fase-6`, que já tinha a pilha. |
| 2026-10-07 | **D35 feita**, na branch `feat/d35-mostrar-senha`, em PR para a `fase-6`. Os três campos de senha (login e os dois do primeiro acesso) usam um componente só, `components/CampoDeSenha.tsx`: o botão de olho dentro do campo, à direita, como no app. Com a `design-de-interface-projeto` e a `acessibilidade-projeto`, sem mockup: `<button type="button">` (não envia o formulário) com o nome que muda com o estado, "Mostrar senha" e "Ocultar senha", e `aria-controls` no campo, sem `aria-pressed` (os dois juntos fariam o leitor anunciar "Ocultar senha, pressionado"); ícone em SVG com `aria-hidden`; alvo de 44 px; foco visível por dentro do botão; cor por token (`--text-secondary`). Cada campo mantém o seu `autoComplete` e o `aria-describedby`. Com a senha à mostra, o campo desliga o corretor, a maiúscula automática e a verificação ortográfica, para o teclado não "corrigir" a senha nem mandá-la para fora do aparelho. Testes: 6 de unidade novos (232 no total). |
| 2026-10-07 | **Anexo do 6.6 feito** (G2 aberto em 07/10), na branch `feat/6.6-anexo-justificativa`, mesclado na `fase-6` (#34). Com texto e arquivo, a justificativa e o reenvio (D42) seguem em três tempos: gravam o texto, enviam o anexo (`POST /v1/justifications/sign-upload { justificationId }` → Cloudinary com os campos assinados como vieram → `anexar_a_justificativa`) e concluem. Se o anexo falha, o formulário avisa que o texto já foi registrado e oferece **Tentar de novo** ou **Seguir sem o anexo**. Sem Cloudinary (`uploadUrl` com `PREENCHER`), o anexo fica indisponível, e o Storage nunca é usado (T25). O que é comum aos três itens de anexo ficou em `lib/envioAssinado.ts` (assinatura e envio) e `lib/anexos.ts` (formatos, 10 MB, envio em série com as falhas), e o campo, em `components/CampoDeAnexos.tsx`. **Para publicar com anexo, falta o G5.** Testes: unidade (266 no total); E2E do envio, da falha com nova tentativa, do sem Cloudinary e do reenvio. |
| 2026-10-07 | **Anexos do 6.7 feitos**, na branch `feat/6.7-anexos-eu-estava`, em PR para a `fase-6`. O "Eu estava na aula" aceita até 5 arquivos, na ordem da § 9.3: `criar_motivo` → cada anexo (`POST /v1/motivos/sign-upload { motivoId, anexoId }` → Cloudinary → `anexar_ao_motivo`) → `abrir_solicitacao`. O pedido só abre depois dos anexos, porque o banco não aceita anexo num motivo já usado (`pode_anexar_ao_motivo`). Cada arquivo ganha o seu `anexoId` na primeira tentativa e o mantém no **Tentar de novo**, para não deixar cópia órfã na Cloudinary; o **Tentar de novo** depois do pedido aberto não abre um segundo. Com anexo de fora, o recado diz "Pedido enviado, sem os anexos que falharam." O motivo e os anexos ficaram em `lib/motivos.ts`, que a troca permanente (6.13) também usa. A limpeza do E2E apaga os anexos antes da conta (o autor do anexo não cai em cascata) e a fila de exclusão que eles geram. Testes: unidade (275 no total); E2E dos anexos, da nova tentativa e do seguir sem. |
| 2026-10-07 | **Anexos do 6.13 feitos**, na branch `feat/6.13-anexos-troca`, em PR para a `fase-6`. A troca permanente aceita até 5 arquivos, na ordem da § 9.4: `criar_motivo('class_swap_evidence', null, texto)` → cada anexo (`POST /v1/motivos/sign-upload { motivoId, anexoId }` → Cloudinary → `anexar_ao_motivo`) → `pedir_troca_de_aula(de, para, 'permanent', motivoId)`. A avulsa continua só com o pedido, sem motivo nem anexo (P19). Depois do motivo criado, a folha trava o tipo, a aula e o texto; se um anexo falha, avisa e deixa **Tentar de novo** (mesmo `anexoId`) ou **Seguir sem o anexo**, e o **Tentar de novo** depois da troca pedida não pede uma segunda. Com anexo de fora, o recado diz "Pedido de troca enviado, sem os anexos que falharam." O envio em três tempos saiu do formulário para `hooks/useEnvioComAnexos.ts` e `components/EnvioComAnexos.tsx` (mensagens e botões de cada fase), os mesmos na justificativa, no "Eu estava na aula" e na folha da troca. Testes: unidade (278 no total); E2E da permanente com anexos, da nova tentativa e do seguir sem, mais os do 6.6, 6.7 e 6.14, **22 verdes**. |
| 2026-10-08 | **C21, C22 e D37 a D42 registradas** (`handoffs/COORDENACAO.md`, sétima rodada de 07/10 e oitava rodada de 08/10). **C21:** as séries de números se repetem e nada é renumerado; a decisão vinda da coordenação é citada como "D35 da coordenação" (ou "D35 (COORDENACAO 07/10)"). Neste roadmap, o "(D35)" do 7.4 é o à vontade fora do alerta; a D35 da coordenação é o botão de mostrar a senha (Registro de 07/10). **C22, em conferência pelo servidor:** o `sign-upload` respondeu 403 onde o contrato pede 409 (`justification_not_pending`, `justification_already_has_attachment`); a web mostra a mensagem do servidor nos dois casos (C16). **E2E local:** a falha do `e2e/pagar.spec.ts` (Storage 500 / `42P10`) foi fechada pelo dono sem investigação. **Render:** o dono tirou a origem da prévia do `ALLOWED_ORIGIN` (07/10, à noite). **D39, a que muda o site:** no G4, o banco (`db-push-prod`), o servidor e o site sobem; a `fase-6` vai para a `main` nesse momento, com a confirmação do dono, **antes** de o APK 2.0.0 ser liberado a todos. O dono testa a 2.0.0 no próprio celular e só então a libera e dispara o aviso (D38). A linha 6.11, os portões e a compatibilidade foram ajustados. **D41:** o #94 do `snake-thai` (C11) é mesclado logo antes do `db-push-prod`. É ele que traz a trava do caminho do anexo em `anexar_a_justificativa`, então a `fase-6` só vai para a `main` depois do banco novo em produção. **D40:** o texto da Política (#78) está aprovado; o dono a publica depois da 2.0.0, o que abre o G5 e o 6.10. Com a D39, o G5 fica depois da publicação da web: a justificativa com anexo virou pergunta (Decisões em aberto). **D42:** o jeito velho de anexar (o aluno grava `proof_*` com o caminho legado) fica ligado por 90 dias depois da 2.0.0. A `fase-6` não o usa, e a web da `main` grava a justificativa sem anexo. *Só como informação:* **D37** (a 1.9.0 sai antes da 2.0.0; o #54 do app espera a tag) e **D38** (aviso de versão nova por notificação e ao abrir o app; é só do app, porque a web está sempre na versão publicada). **Linha 6.11 corrigida:** os anexos (6.6, 6.7 e 6.13) não esperam mais o G2, que abriu em 07/10. A resposta de compatibilidade da D39 (a `fase-6` com o banco novo, o servidor #37 e os APKs 1.8/1.9; a web da `main` com o banco novo) está no handoff 008. |
| 2026-10-08 | **D43 a D48 e D42 revista registradas** (`handoffs/COORDENACAO.md`, nona rodada de 08/10), citadas como "D43 da coordenação" (C21). **D46, a que muda o site:** o G5 sai no mesmo dia do G4, durante o teste. Com o APK 2.0.0 instalado, o dono preenche os "Dados dos termos" e roda `npm run legal:publicar -- politica 1.0` antes de liberar o app aos alunos. A justificativa com anexo sobe no G4, **sem trava** no site. Isso substitui o "depois da 2.0.0" da D40 da coordenação e fecha a pergunta P1 do handoff 008. **Aceite da versão nova, conferido no código, sem PR:** o guarda (6.0) chama `documentos_legais_pendentes` em toda página logada; a função devolve todo documento vigente sem aceite da pessoa, então a Política nova manda o aluno para `/termos`, que mostra só ela. O teste de unidade "manda para os termos quando há documento pendente" cobre o caso. A conferência no ar, depois do `legal:publicar`, fica com o dono (6.10). **D42 revista:** o jeito velho de anexar (`proof_*` legado gravado direto pelo aluno e `sign-upload {classId}`) é desligado na 2.0.0, sem os 90 dias. Conferido na `fase-6`: o anexo da justificativa só vai por `POST /v1/justifications/sign-upload { justificationId }` e `anexar_a_justificativa`, e os únicos `proof_*` gravados pela web são os do comprovante de pagamento (`payments`), que a D42 não toca. **Web da `main`:** a partir do `db-push-prod` e até a `fase-6` entrar, ela não anexa justificativa. Na prática, nada muda, porque ela nunca anexou: grava só o texto, pelo `upsert` antigo, que continua passando. *Só como informação:* **D43** (no teste da D39, o dono, os professores e os admins recebem a 2.0.0 juntos; só os alunos esperam), **D44** (os três casos do professor no APK antigo ficam como estão), **D45** (push de versão nova, do app), **D47** (o Expo 57 entra no APK candidato) e **D48** (o servidor liga `MIGRATIONS_DO_G4_EM_PRODUCAO`; até o `db-push-prod`, o `justifications/view-url` responde 502, e a web não chama nenhum `view-url`). Nenhum teste rodou: a mudança é só de documentação, e a rodada não permite E2E. |
