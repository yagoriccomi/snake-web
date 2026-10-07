# PLANO DE EXECUÇÃO — C16-codigos-do-servidor

| Campo | Valor |
|---|---|
| **Tarefa** | C16 de `handoffs/COORDENACAO.md` (02/10, segunda rodada), passo (2) do pedido de 07/10 |
| **Origem** | Contrato **v6**, § 13.6, lido na `origin/main` do `snake-thai` (`48d8b20`, #88) |
| **Tipo** | Melhoria (regra de erros, D20) |
| **Modo de execução** | 🔁 Loop (sem confirmação; o PR vai para a `fase-6`, que não publica — D15) |
| **Data** | 2026-10-07 |
| **Branch** | `fix/c16-codigos-do-servidor`, a partir da `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** a web só fala com o `snake-server` em `lib/comprovante.ts` (`pedirAssinatura`), e
  separa só "≥ 500" de "o resto". Qualquer 5xx vira "O servidor está acordando", um palpite; e o
  401 da sessão vencida, o 429 do limitador e o 503 do Supabase fora do ar viram "Não foi possível
  preparar o envio", sem dizer o que aconteceu. A v6 deu a cada erro do servidor um `code` e uma
  mensagem (§ 13.6), e o `lib/erros.ts` ainda não conhece nenhum.
- **Resultado esperado:** o `lib/erros.ts` tem a tabela dos códigos da § 13.6 com a frase da web
  para cada um; a web decide pelo `code` e, na falta dele, pelo status, nunca pela mensagem do
  servidor (§ 13.6, regra 1). O erro identificado mostra a sua frase; o não identificado (os dois
  genéricos `bad_request` e `internal_error`, um `code` que a web não conhece, um status sem `code`
  que a tabela não cobre, um corpo que não é JSON) mostra a genérica "Não foi possível <ação>. Tente
  de novo em instantes." O `pedirAssinatura` passa a usar essa função.
- **Como validar:** testes de unidade em `test/erros.test.ts` (cada `code`, o status sem `code`, o
  genérico, o `code` desconhecido e o corpo que não é JSON) e em `test/comprovante.test.ts`
  (`pedirAssinatura` com o `fetch` simulado: sessão ausente, rede, cada categoria de resposta);
  lint, typecheck e a suíte inteira no pre-commit; check da Vercel verde no PR.

## 2. Escopo

**Vou fazer:**
- `lib/erros.ts`: `mensagemDoServidor({ status, code }, acao)`, `codigoDoCorpo(corpo)` e a tabela
  `MENSAGEM_DO_CODIGO_DO_SERVIDOR`, com todos os códigos da § 13.6 (comuns, falha do Supabase e os
  de cada rota, inclusive os de justificativa e motivos, que os anexos do G2 vão usar).
- `lib/comprovante.ts`: `pedirAssinatura` lê o `code` do corpo e chama `mensagemDoServidor`. A
  ação é "preparar o envio".
- Testes nos dois arquivos.
- Registro no `ROADMAP-web.md` e a linha da D20 em "Decisões em aberto".

**NÃO vou fazer (escopo negativo)** [#8]:
- As telas "Não foi possível carregar": são a D28, num PR próprio, depois deste.
- Os anexos do 6.6, 6.7 e 6.13 (`/v1/justifications` e `/v1/motivos`): esperam o G2. A tabela já
  traz os códigos deles para o PR dos anexos só chamar a função.
- O envio à Cloudinary e ao Storage (`enviarComprovante`, `enviarParaStorage`): não é o servidor;
  as mensagens deles já separam 4xx de 5xx e não mudam.
- A `main`: a § 15 diz que a web da `main` não decide pelo status nem pelo `code` do servidor, e
  nada quebra até a 2.0.0.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | A frase vem da web, por `code`, e não do campo `error` do corpo | § 13.6, regra 1: "O cliente decide pelo `code` (…), nunca pela mensagem." A do `bad_input`, por exemplo, cita `paymentId`, que não é texto para o aluno | Ler o `error` para os códigos de rota |
| P2 | Sem `code`, o status decide só onde a § 13.6 tem **um** significado para ele no navegador do aluno: 401 (sessão), 403 (sem acesso), 413 (grande demais) e 429 (muitas tentativas). 404, 409, 502, 503 e 504 sem `code` caem na genérica | Sem `code`, a resposta não veio do handler do servidor (por exemplo, a Render na frente dele), e 404/409/5xx têm mais de um significado | Ampliar a tabela de status |
| P3 | Sai o "O servidor está acordando": vira a genérica, que também diz "Tente de novo em instantes" | Era um palpite para qualquer 5xx (D20: o não identificado vai para a genérica). Os três 5xx do Supabase ganham frase própria | Voltar a frase como a genérica do 5xx |
| P4 | `bad_request` e `internal_error` ficam fora da tabela e caem na genérica da web; um comentário na tabela diz que foi de propósito | São os genéricos de cada categoria (§ 13.6, regra 2); o teste prova que eles não ganham frase | — |
| P5 | O `supabase_error`, que o servidor da `main` ainda manda até o PR das outras rotas (C19), cai na genérica | A v6 o tirou do contrato (§ 13.6, "Para quem implementa"); a `fase-6` só publica no G4, depois desse PR | Acrescentar uma linha |
| P6 | A frase de rede e a da sessão ausente antes do pedido continuam as de hoje | São erros identificados pela própria web, com mensagem própria | — |
| P7 | Sem a `design-de-interface-projeto` e sem mockup | Muda só o texto do alerta que já existe em `/pagar/[id]` | Acionar a skill se o dono quiser outra apresentação |

## 4. Decisão Visual

- **Tem superfície visual?** Sim, o texto do alerta de erro do envio do comprovante.
- **Precisa de mockup?** Não: só a frase muda, dentro do `role="alert"` que já existe.
- **`design-de-interface-projeto` acionada?** Não (P7).

## 5. Passos

| # | Arquivo | O que muda | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/erros.ts` | Tabela por `code`, tabela por status e `mensagemDoServidor` | [#3][#6][#9][#93] | Testes do passo 3 |
| 2 | `lib/comprovante.ts` | `pedirAssinatura` lê o `code` e usa `mensagemDoServidor` | [#6] | Testes do passo 3 |
| 3 | `test/erros.test.ts`, `test/comprovante.test.ts` | Um teste por caminho, nome com condição e resultado | [#41][#46] | `npm test` |
| 4 | `ROADMAP-web.md` | Registro e "Decisões em aberto" | [#96] | Leitura |

## 6. Riscos e Rollback

- **Risco:** o servidor mudar um `code` sem versão nova do contrato. A web cai na genérica, que
  ainda diz o que fazer; nada é liberado nem escondido.
- **Rollback:** reverter o merge na `fase-6`; nada é publicado antes do G4.
