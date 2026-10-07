# PLANO DE EXECUÇÃO — C5-frase-do-banco

| Campo | Valor |
|---|---|
| **Tarefa** | Regra C5 de `handoffs/COORDENACAO.md` (29/09, reforçada em 01/10) |
| **Origem** | Contrato § 15 (lido na `origin/main` do `snake-thai`, v4) e Registro do app de 29/09 (4.4a) |
| **Tipo** | Bug |
| **Modo de execução** | 🔁 Loop (sem confirmação; o merge publica e espera o dono) |
| **Data** | 2026-10-02 |
| **Branch** | `fix/frase-do-banco`, a partir da `main` (sem esperar a pilha #5–#8) |

---

## 1. Enunciado Canônico

- **Problema:** a § 15 do contrato diz que, a partir da 2.0.0, o upsert direto de `declared_status` e o de
  justificativa recebem `23514` com uma frase para o aluno. A web atual joga essa frase fora: o
  **Vou / Não vou** sempre mostra "Não foi possível avisar. Verifique a conexão e tente de novo.", e a
  justificativa mostra "Não foi possível enviar." (o `error` do supabase-js chega como objeto simples,
  não como `Error`).
- **Resultado esperado:** com o código `23514`, a tela mostra a `message` do banco, no aviso e na
  justificativa. Nos outros erros, a frase de conexão continua.
- **Como validar:** testes de unidade com as frases da § 15 ("Você trocou esta aula por outra." e
  "Esta aula foi trocada. Se faltar à aula nova, justifique a aula nova.") e com os caminhos de falha
  (rede, outro código, `23514` sem frase).

## 2. Escopo

**Vou fazer:**
- `lib/erros.ts`: função pura que decide a frase do aviso e a da justificativa a partir do erro, e a classe
  `ErroDeValidacao`, que `justificarFalta` passa a lançar (sem importar o cliente do Supabase, para o
  teste rodar sem as variáveis de ambiente).
- `app/aulas/page.tsx`: os dois `catch` passam a usar essa função.
- `test/erros.test.ts`: caminho de falha com as frases da § 15.

**NÃO vou fazer (escopo negativo)** [#8]:
- Filtrar as aulas pela turma, trocar o upsert por `declarar_aula` ou mudar rótulos: é a Fase 6 (6.1,
  6.2, 6.9), que só publica depois do G4. Aqui não entra remendo (regra 2 da Fase 6).
- Escrever as frases na web: elas vêm do banco. Nenhuma frase do contrato é copiada para o código de
  produção; só os testes as usam.
- Tratar outros códigos (`42501`, `P0002`): ficam na frase de conexão, como pede a C5.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | A frase de conexão da justificativa passa a ser "Não foi possível enviar. Verifique a conexão e tente de novo.", no mesmo molde da do aviso | A C5 diz "nos outros erros, a frase de conexão continua"; a justificativa só tinha "Não foi possível enviar.", sem dizer o que fazer, e o `CLAUDE.md` pede que o erro diga o que fazer [#93] | Trocar uma constante |
| P2 | Os erros de validação de `justificarFalta` ("Escreva o motivo da falta.", limite de 255) continuam aparecendo com o próprio texto, agora como `ErroDeValidacao`; qualquer outro `Error` (um `TypeError` do navegador) cai na frase de conexão | Já são frases para o aluno; hoje o botão e o `maxLength` quase nunca deixam chegar lá | Nenhum impacto: o caminho continua igual |
| P3 | Só `code === '23514'` com `message` não vazia conta como recusa com frase | É o que a § 15 e as migrations do app usam (`raise exception '…' using errcode = '23514'`); sem frase, não há o que mostrar | Ampliar a lista de códigos numa constante |
| P4 | Sem a `design-de-interface-projeto` e sem mockup | Nenhum elemento, token ou estado novo: muda só o texto dentro do parágrafo `role="alert"` que já existe, e o texto vem do banco | Acionar a skill se o dono quiser outra apresentação |

## 4. Decisão Visual

- **Tem superfície visual?** Sim, o texto do alerta de erro em `/aulas`.
- **Precisa de mockup?** Não — **porquê:** ajuste pontual dentro do padrão que já existe (o mesmo
  `<p role="alert">`), sem layout novo.
- **`design-de-interface-projeto` acionada?** Não (P4).
- **Referência visual existente:** o alerta de erro atual de `/aulas`.

## 5. Terreno (o que já existe)

| Arquivo | Papel hoje | O que muda |
|---|---|---|
| `app/aulas/page.tsx` | Próximas aulas, Vou / Não vou e justificativa | Os dois `catch` usam a função nova |
| `lib/dados.ts` | `avisarPresenca` e `justificarFalta` relançam o `error` do supabase-js | `justificarFalta` lança `ErroDeValidacao` na validação local |
| `lib/erros.ts` | — | Criar |
| `test/erros.test.ts` | — | Criar |

**Reaproveitamento** [#6]: o `error` que `lib/dados.ts` já relança; a mesma decisão serve às duas
ações, então mora num lugar só.
**Convenções locais a seguir** [#5][#13]: identificadores em português como no resto da web, regra pura
em `lib/` testada com Vitest em `test/`, comentário só do porquê.

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `test/erros.test.ts` | Testes primeiro, com as frases da § 15 e os caminhos de falha | [#44][#46] | `npm test` falha (módulo ausente) |
| 2 | `lib/erros.ts` e `lib/dados.ts` | `ErroDeValidacao`, `fraseDaRecusa` (frase só com `23514`), `mensagemDoAviso` e `mensagemDaJustificativa`; `justificarFalta` lança `ErroDeValidacao` | [#2][#3][#9] | `npm test` verde |
| 3 | `app/aulas/page.tsx` | Os `catch` do aviso e da justificativa usam as funções | [#6][#93] | `npm run lint`, `npm run typecheck`, `npm run build` |
| 4 | `ROADMAP-web.md` da `fase-6` | Registro de 02/10 (fica fora deste PR: o Registro em dia está na linha da `feat/a11y`, e uma entrada aqui abriria mais um conflito no fim do arquivo) | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco de dados:** nenhum.
- **Contrato de API:** nenhum; a web passa a usar o que a § 15 já promete.
- **Configuração:** nenhuma.
- **Dados pessoais (LGPD):** nenhum. A frase do banco não traz dado pessoal; nada vai para log.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | `mensagemDoAviso` e `mensagemDaJustificativa` | `23514` com as duas frases da § 15; erro de rede (`FetchError`, `code` vazio); `42501`; `23514` sem frase; erro desconhecido (`null`, texto solto); validação local da justificativa |
| Integração [#42] | — | O banco local tem a trava (4.4a). Fica para o E2E do 4.3, que monta a troca aprovada com dados sintéticos |
| E2E [#43] | 4.3 (próximo item) | — |

**Comando para rodar:** `npm test`

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Uma recusa `23514` sem frase para o aluno aparecer crua | Baixa | Texto técnico na tela | As frases `23514` do app são todas para o aluno (conferido nas migrations); sem frase, cai na de conexão |
| Conflito com a #8 (`feat/a11y`), que mexe em `app/aulas/page.tsx` | Certa | Resolver no merge | Mudança pequena e isolada nos `catch`; resolve quando a pilha chegar (C5) |

**Rollback** [#84]: reverter o merge commit na `main`; a Vercel publica a versão anterior.

## 10. Definição de Pronto

- [ ] Passos 1 a 4 executados
- [ ] `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` verdes
- [ ] PR aberto a partir da `main`, com o check da Vercel verde
- [ ] **Merge só com a confirmação do dono** (publica em produção)
