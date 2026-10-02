# PLANO DE EXECUÇÃO — 4.3-e2e

| Campo | Valor |
|---|---|
| **Tarefa** | Item 4.3 do `ROADMAP-web.md`, decidido pelo dono em 29/09 (D11) |
| **Origem** | `handoffs/COORDENACAO.md`: D11 e regra C6 (29/09), reforçadas em 01/10 |
| **Tipo** | Task (testes) |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `test/e2e-fase-1` → PR para a `fase-6` (D15) |

---

## 1. Enunciado Canônico

- **Problema:** o roteiro da Fase 1 só existe como lista para o dono clicar. Nenhuma tela é conferida
  sozinha, e uma mudança no banco do app pode quebrar a web sem aviso (7.3).
- **Resultado esperado:** `npm run e2e` repete o roteiro num navegador automático contra o banco local,
  com dados sintéticos próprios, e cresce a cada tela da Fase 6.
- **Como validar:** a rodada passa inteira, e depois dela o banco local não tem nada com a marca do E2E.

## 2. Escopo

**Vou fazer:**
- Playwright (`@playwright/test`, só Chromium), `playwright.config.ts` e `npm run e2e`.
- `e2e/apoio/`: a trava do banco local, a chave de serviço lida na hora, a criação e a limpeza dos dados
  sintéticos, e o `test` com contas que se apagam sozinhas.
- Specs do roteiro: 1.1 (`termos`), 1.2 (`primeiro-acesso`), 1.3 (`pagar`), 1.4 (`aulas`) e 1.5
  (`barreiras`).
- README (comando novo) e Registro.

**NÃO vou fazer (escopo negativo)** [#8]:
- Rodar o E2E na Vercel ou num CI: D10 (sem CI por ora). Ele roda à mão, contra o banco local.
- O que só o aparelho ou o app DEV conferem: o admin abrindo o comprovante (1.3), o professor vendo o
  aviso e decidindo (1.4) e o leitor de tela (5.2). Ficam no roteiro manual.
- A queda de rede entre o perfil e a senha (1.2): já coberta pelos testes de unidade do 3.1; cortar a rede
  no instante certo pelo navegador seria adivinhar tempo.
- Sessão expirada no meio de um envio (1.5): depende de expirar o token de verdade; fica no manual.
- A frase do banco (C5): o PR #9 sai da `main`. O teste entra quando a `main` vier para a `fase-6`, e o
  6.2 o amplia com `declarar_aula`.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | A chave de serviço sai do `npx --no-install supabase status -o json` rodado na pasta do `snake-thai` (só leitura, não troca de branch nem mexe em arquivo), ou de `E2E_SUPABASE_SERVICE_ROLE_KEY` | C6: só as chaves do banco local; assim ela nunca vai para arquivo [#37][#80] | Passar a variável à mão |
| P2 | Trava dupla: o `.env.local` e o `status` precisam apontar para `localhost`/`127.0.0.1`, na mesma porta | Um `.env.local` trocado para produção faria o E2E criar e apagar contas lá [#55] | O teste para antes de tocar no banco |
| P3 | Tudo o que o E2E cria tem marca própria (`@e2e.invalid`, turma `e2e-…`, plano `E2E …`, documento `e2e-…`), e a limpeza só apaga o que tem a marca, no começo e no fim | C6: criar e apagar os próprios dados; o começo limpa o que uma rodada interrompida deixou | — |
| P4 | Os documentos legais só são criados quando não há nenhum vigente daquele tipo | Documento vigente vale para o banco inteiro; com o seed, o E2E usa os que já existem (a conta nova não aceitou nenhum) | Se outra conta local aceitar o documento sintético no meio da rodada, a limpeza dele falha e avisa |
| P5 | O `audit_log` dos registros sintéticos também é apagado (por `entity_id`) | Sem isso, cada rodada deixaria no banco local o rastro de perfis e faturas inventados | — |
| P6 | Um navegador (Chromium) e um processo, em série | As telas leem o mesmo banco; em paralelo, a falha de uma confundiria a outra [#48] | Ligar mais processos depois, se ficar lento |
| P7 | A página sobe pelo `next dev` na porta 3101 | Não disputa a 3001 do contêiner `snake-web-dev`, e recarrega o código da branch | Trocar a constante |
| P8 | Sem a `design-de-interface-projeto` | Nenhuma tela muda | — |

## 4. Decisão Visual

- **Tem superfície visual?** Não (só testes).
- **Precisa de mockup?** Não.
- **`design-de-interface-projeto` acionada?** Não (P8).

## 5. Terreno (o que já existe)

| Arquivo | Papel hoje | O que muda |
|---|---|---|
| `package.json` | Scripts e dependências | `@playwright/test` e o script `e2e` |
| `.gitignore` | — | Saídas do Playwright |
| `playwright.config.ts` | — | Criar |
| `e2e/apoio/ambiente.ts` | — | Criar: trava e chaves |
| `e2e/apoio/banco.ts` | — | Criar: dados sintéticos e limpeza |
| `e2e/apoio/teste.ts` | — | Criar: `test`, `entrar` e `avisoDaTela` |
| `e2e/global-setup.ts`, `e2e/global-teardown.ts` | — | Criar |
| `e2e/*.spec.ts` | — | Criar: uma spec por tela do roteiro |
| `README.md` | Como rodar | Seção "Testes de ponta a ponta" |

**Reaproveitamento** [#6]: o banco local do `snake-thai` (nenhum banco novo), o `@next/env` que o Next já
traz para ler o `.env.local`, e o supabase-js que a página já usa.
**Convenções locais a seguir** [#5][#13]: textos e nomes em português como no resto da web; os testes
procuram pelo que a pessoa vê (rótulo, papel, texto), não por classe CSS.

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `package.json`, `.gitignore`, `playwright.config.ts` | Playwright instalado e configurado para o banco local | [#43] | `npx playwright --version` |
| 2 | `e2e/apoio/*`, `e2e/global-*.ts` | Trava, chaves, dados sintéticos e limpeza | [#37][#48][#55] | Rodada da `barreiras` e banco limpo depois |
| 3 | `e2e/*.spec.ts` | Roteiro 1.1 a 1.5 | [#43][#46] | `npm run e2e` verde |
| 4 | `README.md` | Comando novo | [#96] | Leitura |
| 5 | `ROADMAP-web.md` | 4.3 marcado e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco de dados:** nenhuma migration. O E2E escreve só no banco local, e só dados com a marca dele.
- **Contrato de API:** nenhum.
- **Configuração:** variáveis opcionais só do E2E (`E2E_SUPABASE_SERVICE_ROLE_KEY`,
  `E2E_SNAKE_THAI_DIR`); nenhuma entra na Vercel.
- **Dados pessoais (LGPD):** nenhum dado real. Nomes, CPFs e senhas são inventados a cada rodada; as
  senhas ficam só na memória do processo.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| E2E [#43] | 1.1: pendente → `/termos`, textos até o fim, aceite gravado (uma linha por documento), não pede de novo; "Sair sem aceitar" | Sair sem aceitar encerra a sessão |
| E2E | 1.2: dados e senha → inicial; senha nova entra, a antiga não; "Não usa o app" já preenchido | CPF inválido, data inválida, senha fraca e senhas diferentes, sem gravar nada |
| E2E | 1.3: PNG e PDF → "Em análise", `pending_approval`, `supabase_storage`, caminho na pasta da pessoa | Acima de 10 MB, tipo não aceito, mensalidade de outra pessoa |
| E2E | 1.4: Vou → `declared_status`, nunca `status`; Não vou → justificativa gravada, "Em análise" | Texto vazio, limite de 255 |
| E2E | 1.5: professor barrado com a explicação; sem sessão → login | — |

**Comando para rodar:** `npm run e2e` (com o banco local no ar).

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| O chat do snake-thai recria o banco no meio da rodada | Média | Falha falsa | C6: rodar de novo, sem mexer no teste; o começo da rodada limpa os restos |
| Com o seed, `/aulas` (que hoje lista as aulas de todas as turmas, defeito do 6.1) empurrar a aula sintética para fora das 10 primeiras | Baixa | Falha falsa | A aula sintética fica a 30 minutos; o 6.1 troca a lista por `aulas_do_aluno` |
| O E2E apontado para a produção | Muito baixa | Perda de dado real | Trava dupla (P2) antes de qualquer escrita |

**Rollback** [#84]: reverter o merge na `fase-6`; nada vai para a produção.

## 10. Definição de Pronto

- [x] Passos 1 a 5 executados
- [x] `npm run e2e`: 13 testes verdes, e o banco local sem nada com a marca do E2E depois
- [x] Lint, typecheck, `npm test` e build verdes
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
