# PLANO DE EXECUÇÃO — D20-erros

| Campo | Valor |
|---|---|
| **Tarefa** | D20 e C16 de `handoffs/COORDENACAO.md` (02/10, segunda rodada), passo (3) do pedido de 05/10 |
| **Origem** | Contrato v5 (lido na `origin/main` do `snake-thai`, `6bff7d2`) e `src/utils/errors.ts` do app |
| **Tipo** | Bug (regra de erros) |
| **Modo de execução** | 🔁 Loop (sem confirmação; o PR vai para a `fase-6`, que não publica — D15) |
| **Data** | 2026-10-05 |
| **Branch** | `fix/d20-erros-do-banco`, a partir da `fase-6` (`f262a4a`) |

---

## 1. Enunciado Canônico

- **Problema:** a D20 pede que todo erro identificado tenha mensagem própria e que só o não
  identificado caia na genérica. A web só reconhece o `23514`: as frases do contrato v5 com `22023`,
  `P0002` e `42501` ("Escolha o tipo da troca.", "Troca não encontrada.", "Escolha esta semana ou a
  próxima.") viram "Verifique a conexão", e qualquer falha não identificada também, o que manda o
  aluno conferir uma internet que está funcionando.
- **Resultado esperado:** com a frase do banco, a tela mostra a frase; com um SQLSTATE conhecido sem
  frase (o erro nativo do Postgres), a mensagem própria daquele código; com falha de rede, a frase de
  conexão; com o resto, a genérica "Não foi possível <ação>. Tente de novo em instantes."
- **Como validar:** testes de unidade em `test/erros.test.ts` com as frases do contrato, os erros
  nativos de cada código, a rede (objeto do supabase-js e `TypeError`) e o não identificado; lint,
  typecheck e a suíte inteira no pre-commit; check da Vercel verde no PR.

## 2. Escopo

**Vou fazer:**
- `lib/erros.ts`: uma função só, `mensagemDaFalha(falha, acao)`, no lugar de `fraseDaRecusa`,
  `mensagemDoAviso` e `mensagemDaJustificativa`.
- Trocar as chamadas: aviso (`hooks/useAcoesDaAula.ts`), justificativa e troca
  (`components/FormularioDeMotivo.tsx`, `components/FolhaDeTroca.tsx`), desistência
  (`components/ConfirmarDesistencia.tsx`), meta (`components/FolhaDaMeta.tsx` e o abrir da meta em
  `app/inicio/page.tsx`), aceite dos termos (`app/termos/page.tsx`) e primeiro acesso
  (`app/primeiro-acesso/page.tsx`, mantendo a senha igual).
- `test/erros.test.ts` reescrito para a regra nova.
- Registro no `ROADMAP-web.md`.

**NÃO vou fazer (escopo negativo)** [#8]:
- A tabela de códigos do servidor (§ 13 da v6): a v6 ainda não está na `main` do app; entra quando
  estiver (C16).
- As telas de carregamento ("Não foi possível carregar" em `/aulas`, `/inicio`, `/frequencia`,
  `/justificativas`, `/pedidos`, `/termos`, `/aulas/semana` e o contato): são leitura, com bloco de
  tela próprio, e a D20 vale "no código que cada chat tocar", sem auditoria geral. Ficam anotadas.
- O login e o comprovante: já separam rede de credencial e cada falha do envio tem mensagem própria.
- Copiar frases do contrato para o código de produção: elas vêm do banco; só os testes as usam.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | A `message` só é frase do banco quando o código é `23514`, `22023`, `P0002` ou `42501` **e** a primeira letra é maiúscula | O guia de estilo do Postgres escreve as mensagens nativas em minúscula ("permission denied for table…", "new row violates row-level security policy…"); as frases do contrato começam em maiúscula. Assim a RLS não vaza inglês técnico para a tela [#93] | Trocar a regra numa função |
| P2 | Mensagens próprias dos SQLSTATEs sem frase: `42501` "Você não tem permissão para esta ação." (a mesma do app), `23514`, `22023`, `P0002` e `23505` com frases curtas que dizem o que fazer; `23505` com CPF diz "Este CPF já está cadastrado em outra conta.", como o app | Identificado tem mensagem própria (D20); seguir o app evita duas frases para o mesmo erro [#6] | Trocar o texto numa constante |
| P3 | A frase de conexão fica só para a rede (o objeto do supabase-js com "Failed to fetch", o `TypeError` do `fetch`, o `AuthRetryableFetchError`); o resto não identificado diz "Tente de novo em instantes." | Mandar conferir a conexão quando a rede está boa é a "mentira cômoda" que o `lib/comprovante.ts` já evita | Juntar as duas frases de novo |
| P4 | Sem a `design-de-interface-projeto` e sem mockup | Muda só o texto dentro dos `role="alert"` que já existem | Acionar a skill se o dono quiser outra apresentação |

## 4. Decisão Visual

- **Tem superfície visual?** Sim, o texto dos alertas de erro.
- **Precisa de mockup?** Não: ajuste pontual dentro do padrão que já existe.
- **`design-de-interface-projeto` acionada?** Não (P4).

## 5. Passos

| # | Arquivo | O que muda | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/erros.ts` | `mensagemDaFalha(falha, acao)`: validação local → frase do banco → SQLSTATE conhecido → rede → genérica | [#2][#3][#6][#9][#93] | Testes do passo 2 |
| 2 | `test/erros.test.ts` | Um teste por caminho, com o nome dizendo a condição e o resultado | [#41][#46] | `npm test` |
| 3 | Chamadas (8 arquivos) | Cada `catch` passa a falha e a ação | [#6] | Typecheck e lint no pre-commit |
| 4 | `ROADMAP-web.md` | Entrada no Registro | [#96] | Leitura |

## 6. Riscos e Rollback

- **Risco:** um erro nativo que comece em maiúscula aparecer na tela. Só os quatro códigos passam
  pelo filtro, e o Postgres não escreve assim; o pior caso é uma frase técnica num alerta, sem PII
  (a RLS não devolve dado de linha).
- **Rollback:** reverter o merge na `fase-6`; nada é publicado antes do G4.

## 7. Definição de Pronto

- [ ] Testes novos verdes e a suíte inteira verde no pre-commit.
- [ ] Lint e typecheck verdes.
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado (D15).
- [ ] Registro no `ROADMAP-web.md`.
