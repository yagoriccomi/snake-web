# PLANO DE EXECUÇÃO — 3.1b-senha-igual-nao-conclui

| Campo | Valor |
|---|---|
| **Tarefa** | Correção C1 (`handoffs/COORDENACAO.md`, 28/09) no item 3.1 do `ROADMAP-web.md` |
| **Origem** | Regra entre os chats C1; regra do app: P2 a P4 de `snake-thai/docs/planos/PLANO-2.4-senha-antes-da-flag.md` (PR #45 do app) |
| **Tipo** | Bug |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-09-29 |
| **Branch** | `fix/primeiro-acesso-senha` (PR #4), levada às branches de cima com merge |

---

## 1. Enunciado Canônico

- **Problema:** o 3.1 trata o código `same_password` do Supabase como "senha já trocada" e conclui o
  primeiro acesso. Se o aluno digitar como senha nova a mesma senha que a academia lhe deu, o
  Supabase responde `same_password`, a web conclui e a senha que a academia conhece continua
  valendo.
- **Resultado esperado:** "senha igual" nunca conta como sucesso: o erro sobe, a flag continua
  `true` e a tela diz que a senha nova precisa ser diferente. Se a senha já passou **nesta tela** e
  só a marcação falhou, repetir o envio com a mesma senha não chama `updateUser` de novo.
- **Como validar:** testes de unidade de `concluirPrimeiroAcesso` com os caminhos de falha abaixo.

## 2. Escopo

**Vou fazer:**
- `lib/primeiroAcesso.ts`: sai o desvio do `same_password`; entra a memória da senha já trocada
  nesta tela (um `ref` da página, como o `senhaJaTrocada` do app).
- `app/primeiro-acesso/page.tsx`: guarda a memória num `useRef` e mostra
  "A nova senha precisa ser diferente da anterior." quando o erro for `same_password`.
- Testes do caminho de falha.
- Plano 3.1 e Registro: a regra muda, e sai o pedido para o app copiar a regra da web.

**NÃO vou fazer (escopo negativo)** [#8]:
- Banco ou gatilho em `auth.users` (P1 do app: correção no cliente).
- Mensagem própria para `weak_password` (fora do C1).
- Layout, textos da tela ou fluxo de navegação.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | A memória da senha trocada vive só enquanto a tela está aberta (`useRef`), como no app | É a P2 do app; sobreviver a um recarregamento exigiria guardar a senha, o que não se faz [#63] | — |
| P2 | Com a tela fechada entre a senha e a flag, a pessoa entra com a senha nova, volta a esta tela e escolhe outra (se repetir a atual, vê a mensagem de senha igual) | É a P4 do app; caso raro, e a senha padrão nunca vale | — |
| P3 | Texto do erro igual ao do app (`describeAuthMessage`) | O contrato não define texto; app e web dizem o mesmo | Troca de uma linha |

## 4. Decisão Visual

- **Tem superfície visual?** Só o texto de uma mensagem de erro, no alerta que já existe.
- **Mockup:** não. É ajuste pontual de texto dentro do padrão da tela, com a frase que o app já usa.

## 5. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/primeiroAcesso.ts` | `same_password` deixa de ser sucesso; a senha já trocada nesta tela não é repetida | [#2][#9][#20] | testes |
| 2 | `app/primeiro-acesso/page.tsx` | `useRef` da senha trocada e mensagem de senha igual | [#93] | typecheck, lint |
| 3 | `test/primeiroAcesso.test.ts` | Caminhos de falha: senha igual não conclui; repetição não troca de novo; senha diferente troca | [#41][#46] | `npm test` |
| 4 | `ROADMAP-web.md`, plano 3.1 | Regra corrigida e Registro | [#96] | leitura |

## 6. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | ordem, flag por último, memória da senha | `same_password` ⇒ rejeita e não conclui; flag falha ⇒ 2º envio sem `updateUser`; 2º envio com outra senha ⇒ `updateUser` de novo |

## 7. Riscos e Rollback

| Risco | Mitigação |
|---|---|
| Pessoa presa se a flag falhar e ela recarregar a página | Entra com a senha nova e escolhe outra (P2); a mensagem diz o que fazer |
| Conflito ao levar para as branches de cima (6.0 e 5.2 mexem na página) | Merge sem `--force`; resolver à mão e rodar o gate completo |

**Rollback** [#84]: reverter os commits deste plano.

## 8. Definição de Pronto

- [ ] Passos 1–4
- [ ] `npm test`, `npm run lint` (0 erros), `npm run typecheck` e `next build` no topo da pilha
- [ ] Levado às branches de cima com merge, sem `push --force`
