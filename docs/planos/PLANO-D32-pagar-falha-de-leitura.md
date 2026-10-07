# PLANO DE EXECUÇÃO — D32-pagar-falha-de-leitura

| Campo | Valor |
|---|---|
| **Tarefa** | D32 de `handoffs/COORDENACAO.md` (07/10, quarta rodada) |
| **Origem** | Pergunta do handoff 005: `/pagar/[id]` ignora o `error` da leitura |
| **Tipo** | Correção (regra de erros, D20/D28) |
| **Modo de execução** | 🔁 Loop (sem confirmação; o PR vai para a `fase-6`, que não publica — D15) |
| **Data** | 2026-10-07 |
| **Branch** | `fix/d32-pagar-falha-de-leitura`, a partir da `origin/fase-6` (`4025965`, depois da D28) |

---

## 1. Enunciado Canônico

- **Problema:** a página de pagar lê a mensalidade e a chave PIX e ignora o `error` das duas.
  Com a internet caída, o aluno vê "Mensalidade não encontrada"; com a leitura da chave
  recusada, vê "A academia ainda não cadastrou a chave PIX" e vai à recepção à toa.
- **Resultado esperado:** falha em qualquer das duas leituras leva à tela "Não foi possível
  carregar", com o motivo de `motivoDaFalhaDeLeitura` (frase do banco; "Verifique sua internet e
  tente de novo." só na rede; "Tente de novo em instantes." no resto) e o botão "Tentar de novo".
  "Mensalidade não encontrada" fica só para o banco que responde sem a mensalidade.
- **Como validar:** testes de unidade de `buscarMensalidadeParaPagar` em `test/pagamento.test.ts`
  (dados lidos, em análise, não encontrada, chave ausente ou em branco, rede na mensalidade, recusa
  na chave); lint, typecheck e a suíte inteira no pre-commit; check da Vercel verde no PR.

## 2. Escopo

**Vou fazer:**
- `lib/pagamento.ts`: `buscarMensalidadeParaPagar(cliente, id)`, as duas leituras com o erro
  propagado, no formato do `lib/menu.ts` (cliente por parâmetro, para o teste).
- `app/pagar/[id]/page.tsx`: estado `erro`, a leitura num `carregar` que o botão repete.
- `test/pagamento.test.ts` e o `ROADMAP-web.md` (Registro e "Decisões em aberto").

**NÃO vou fazer (escopo negativo)** [#8]:
- O envio do comprovante: já passa pela D20/C16 (`ErroDeEnvio`).
- O layout das outras telas da página e o CSS.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | A tela de erro é a da D28, sem o link "Voltar" | Decisão da `design-de-interface-projeto`: o menu da moldura leva ao início, e nenhuma tela de erro de leitura tem dois botões [#7] | Acrescentar o link |
| P2 | A falha na leitura da chave PIX também vai para a tela de erro | "A academia ainda não cadastrou" numa falha é mentira [#98] | Mostrar a página sem a chave, com um aviso |
| P3 | Sem CSS novo | O estado "enviado" da página já usa `.texto` dentro de `.aviso` [#6] | Regra `.aviso .texto` como na `/aulas` |

## 4. Decisão Visual

- **Tem superfície visual?** Sim, um estado de erro novo na página.
- **Precisa de mockup?** Não: é o padrão da D28, já em sete telas.
- **`design-de-interface-projeto` acionada?** Sim; devolveu P1, P2 e P3.

## 5. Passos

| # | Arquivo | O que muda | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/pagamento.ts` | A leitura com o erro propagado | [#6][#9][#93] | Testes do passo 3 |
| 2 | `app/pagar/[id]/page.tsx` | Estado `erro` e o `carregar` | [#93][#98] | Typecheck e leitura |
| 3 | `test/pagamento.test.ts` | Um teste por caminho, nome com condição e resultado | [#41][#46] | `npm test` |
| 4 | `ROADMAP-web.md` | Registro e "Decisões em aberto" | [#96] | Leitura |

## 6. Riscos e Rollback

- **Risco:** a frase nativa do banco vazar. Não vaza: `motivoDaFalhaDeLeitura` só repete a frase dos
  códigos da D20; o resto cai na genérica. Nenhum dado pessoal entra na tela nem na URL.
- **Rollback:** reverter o merge na `fase-6`; nada é publicado antes do G4.
