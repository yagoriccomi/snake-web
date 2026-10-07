# PLANO DE EXECUÇÃO — D28-telas-de-carregamento

| Campo | Valor |
|---|---|
| **Tarefa** | D28 de `handoffs/COORDENACAO.md` (07/10, segunda rodada), passo (3) do pedido de 07/10 |
| **Origem** | D20 (o erro identificado com mensagem própria, o não identificado na genérica), estendida às telas de leitura |
| **Tipo** | Melhoria (regra de erros, D20) |
| **Modo de execução** | 🔁 Loop (sem confirmação; o PR vai para a `fase-6`, que não publica — D15) |
| **Data** | 2026-10-07 |
| **Branch** | `fix/d28-telas-de-carregamento`, a partir da `fase-6` (`4865eef`, depois da C16) |

---

## 1. Enunciado Canônico

- **Problema:** as telas "Não foi possível carregar" jogam fora a falha e dizem sempre "Verifique
  sua internet e tente de novo." Uma recusa da RLS, um registro que sumiu ou um erro do banco viram
  um palpite de conexão, e o aluno vai conferir o Wi-Fi à toa. O guarda (`lib/guarda.ts`) e o hook
  do contato também descartam a falha antes de ela chegar à tela.
- **Resultado esperado:** toda tela de leitura escolhe a frase pela D20. A falha identificada (frase
  do banco, SQLSTATE conhecido, `ErroDeValidacao`) mostra a sua mensagem; a de rede pede para
  conferir a internet; o resto cai na genérica "Tente de novo em instantes." O título "Não foi
  possível carregar" e o botão "Tentar de novo" continuam como estão.
- **Como validar:** testes de unidade de `motivoDaFalhaDeLeitura` em `test/erros.test.ts` (frase do
  banco, código sem frase, rede, SQLSTATE desconhecido, `Error` comum, `null`) e do guarda em
  `test/guarda.test.ts` (a falha chega à tela); lint, typecheck e a suíte inteira no pre-commit;
  check da Vercel verde no PR.

## 2. Escopo

**Vou fazer:**
- `lib/erros.ts`: `motivoDaFalhaDeLeitura(falha)`, que reaproveita a escolha da `mensagemDaFalha`
  (um helper interno, `mensagemIdentificada`) sem repetir o "Não foi possível".
- `lib/guarda.ts`, `components/Protegida.tsx`: o `Acesso` de erro leva a falha até a tela.
- `hooks/useContatoDaAcademia.ts`, `components/MolduraLogada.tsx`: o mesmo para o contato.
- As telas: `/inicio`, `/frequencia`, `/aulas`, `/aulas/semana`, `/termos`, `/pedidos` e
  `/justificativas`.
- Testes, o Registro no `ROADMAP-web.md` e a linha da D20 em "Decisões em aberto".

**NÃO vou fazer (escopo negativo)** [#8]:
- `/pagar/[id]`: a leitura ignora o `error` do Supabase e mostra "Mensalidade não encontrada"; não é
  uma tela "Não foi possível carregar". Fica relatada ao dono, sem correção por conta própria.
- As mensagens das gravações: já passam pela D20 (`mensagemDaFalha`) desde o PR #27.
- O título, o botão e o layout das telas de erro, salvo o parágrafo novo em `/aulas` (P4).

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Uma função nova, `motivoDaFalhaDeLeitura`, e não a `mensagemDaFalha` com uma ação "carregar" | O título já diz "Não foi possível carregar"; a `mensagemDaFalha` repetiria a frase na mesma tela | Trocar o título pela frase inteira |
| P2 | A frase de rede continua a de hoje, "Verifique sua internet e tente de novo." | É o caso que a tela sempre quis cobrir; o aluno já a conhece | — |
| P3 | A genérica da leitura é "Tente de novo em instantes.", a mesma cauda da genérica das gravações | D20: o não identificado cai na genérica, sem palpite de conexão | Outra redação |
| P4 | `/aulas` ganha um `<p>` com o motivo entre o título e o botão, sem mockup, com `.aviso .texto { margin: 0 }` | Era a única tela de erro sem parágrafo; decisão da `design-de-interface-projeto` | Voltar ao título sozinho |
| P5 | A Protegida e o `/inicio` mantêm o sufixo "Se continuar assim, fale com a academia." | Já estava lá; a falha do guarda costuma ser de conta, que a academia resolve | — |
| P6 | O guarda devolve `falha: null` quando o banco responde sem erro e sem perfil, e a tela mostra a genérica | Não há erro identificado; não é rede | — |

## 4. Decisão Visual

- **Tem superfície visual?** Sim, o texto das telas de erro de leitura.
- **Precisa de mockup?** Não: só a frase muda; o `/aulas` ganha um parágrafo no padrão das outras.
- **`design-de-interface-projeto` acionada?** Sim, pelo parágrafo novo em `/aulas` (P4).

## 5. Passos

| # | Arquivo | O que muda | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/erros.ts` | `mensagemIdentificada` e `motivoDaFalhaDeLeitura` | [#6][#9] | Testes do passo 5 |
| 2 | `lib/guarda.ts`, `components/Protegida.tsx` | A falha no `Acesso` e a frase na tela | [#93] | Testes do passo 5 |
| 3 | `hooks/useContatoDaAcademia.ts`, `components/MolduraLogada.tsx` | A falha no estado do contato | [#93] | Typecheck |
| 4 | As sete telas e `app/aulas/page.module.css` | O motivo no lugar da frase fixa | [#6][#98] | Typecheck e leitura |
| 5 | `test/erros.test.ts`, `test/guarda.test.ts` | Um teste por caminho, nome com condição e resultado | [#41][#46] | `npm test` |
| 6 | `ROADMAP-web.md` | Registro e "Decisões em aberto" | [#96] | Leitura |

## 6. Riscos e Rollback

- **Risco:** uma mensagem nativa do banco vazar para a tela. Não vaza: a frase só aparece quando o
  código é um dos da D20, e a nativa do 42501, por exemplo, vira "Você não tem permissão para esta
  ação."; o resto cai na genérica. Nenhum dado pessoal entra na frase.
- **Rollback:** reverter o merge na `fase-6`; nada é publicado antes do G4.
