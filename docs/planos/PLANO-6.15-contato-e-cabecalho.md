# PLANO DE EXECUÇÃO — 6.15-contato-e-cabecalho

| Campo | Valor |
|---|---|
| **Tarefa** | Itens 6.15 (contato da academia) e 5.1 (cabeçalho **Início · Aulas · Sair**) do `ROADMAP-web.md` |
| **Origem** | Contrato § 5.4 e § 3 (D52, T44); 5.1 decidido em 24/09 (linha F, "no mesmo layout do rodapé com Falar com a academia") |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.15-contato-e-cabecalho` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** a web não tem navegação entre as telas (só links na inicial) nem o contato da academia, que a
  § 5.4 manda mostrar nos pedidos negados e num "Falar com a academia" das páginas logadas.
- **Resultado esperado:** toda página logada do aluno com o cabeçalho **Início · Aulas · Sair** e o rodapé
  "Dúvidas? **Falar com a academia**" (botões **WhatsApp** / **E-mail**, só os preenchidos, ou "A academia ainda
  não cadastrou um contato. Procure a recepção."). O **bloco de contato** ("Para mais informações, fale com a
  academia:" + os botões) na troca negada (menu, Aulas, Meus pedidos), no "Eu estava na aula" negado e na
  justificativa negada pela **2ª** vez. O contato só por `contato_da_academia()`. Nada disso na tela de login,
  antes do login ou na justificativa negada pela 1ª vez.
- **Como validar:** testes de unidade da leitura e do formato; E2E do cabeçalho, do rodapé, da tela de login e
  do bloco só na 2ª negada.

## 2. Escopo

**Vou fazer:**
- `lib/contato.ts`: RPC, `+55 (DD) NNNNN-NNNN` (ou `NNNN-NNNN`), links `https://wa.me/<n>` e `mailto:`.
- `hooks/useContatoDaAcademia.ts`: uma leitura por página aberta, para o rodapé e os blocos.
- `components/BlocoDeContato.tsx`, `components/MolduraLogada.tsx` (cabeçalho e rodapé).
- `Protegida` põe a moldura na etapa do aluno (`secao` marca **Início** ou **Aulas**); o primeiro acesso e os
  termos ficam sem ela.
- O **Sair** da inicial passa para o cabeçalho; o "← Início" de `/aulas` sai (o cabeçalho tem).

**NÃO vou fazer (escopo negativo)** [#8]:
- Pedido de professor negado: é do app (a web é só do aluno).
- Mudar o contato no banco para o E2E: é configuração da academia inteira (C6).

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | O rodapé abre os botões ao tocar em **Falar com a academia** (e não os mostra sempre) | Como o "Perfil › Falar com a academia" do app: um passo, sem poluir toda página | Mostrar sempre |
| P2 | Seção do cabeçalho: **Início** para inicial, frequência e pagamento; **Aulas** para aulas, menu, justificativas e pedidos | Cada página fica sob a tela de onde se chega a ela | — |
| P3 | Sem contato, ou com a leitura falhando, o bloco dos negados mostra só a frase | § 5.4: "Sem contato cadastrado: o bloco dos pedidos negados mostra só a frase"; a falha não pode esconder a frase | — |
| P4 | WhatsApp abre em outra aba (`target="_blank"`, `rel="noopener noreferrer"`) | Sai do site; o aluno não perde a tela | — |
| P5 | O E2E lê o contato do banco local pela mesma RPC e confere a tela de acordo | O banco local está sem contato hoje; com contato, os testes de unidade cobrem o formato | — |

## 4. Decisão Visual

- **Mockup:** linha F (`webTopo`: "Snake Thai · Início · Aulas · Sair") e o rodapé da prancheta "Web —
  escolher aulas e trocar" ("Dúvidas? Falar com a academia").
- **`design-de-interface-projeto`** (carregada nesta sessão): cabeçalho com a marca e três itens de 44 px; a
  seção atual em `--primary-text` **e** sublinhada (`aria-current="page"`), nunca só a cor; rodapé com o botão
  em `aria-expanded` e o painel ligado por `aria-controls`; bloco de contato com borda e fundo
  `--background`, botões de 44 px em `--primary-text`.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/contato.ts`, `test/contato.test.ts` | Criar |
| `hooks/useContatoDaAcademia.ts` | Criar |
| `components/BlocoDeContato.*`, `components/MolduraLogada.*` | Criar |
| `components/Protegida.tsx` | Moldura na etapa do aluno, `secao` |
| As sete páginas do aluno | `secao`; inicial sem o próprio **Sair**; `/aulas` sem "← Início" |
| `components/AulaComAcoes.tsx`, `app/pedidos`, `app/justificativas` | Blocos de contato |
| `e2e/contato.spec.ts`, `e2e/justificativas.spec.ts` | Criar; bloco só na 2ª negada |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/contato.ts`, hook e testes | Leitura e formato | [#2][#41] | `npm test` |
| 2 | Moldura e `Protegida` | Cabeçalho e rodapé | [#6][#13] | Lint, typecheck |
| 3 | Blocos de contato | Lista fechada da § 5.4 | [#98] | Build |
| 4 | E2E | Cabeçalho, rodapé, login e 2ª negada | [#43] | `npm run e2e` |
| 5 | `ROADMAP-web.md` | 6.15, 5.1 e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** `contato_da_academia` (G3; produção só no G4).
- **LGPD:** o contato é público da academia, não dado pessoal de aluno.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | RPC, formato de 8 e 9 dígitos, links | Sem contato (nulo ou vazio); erro do banco repassado |
| E2E [#43] | Cabeçalho marca a seção e navega; rodapé de acordo com o banco | Login sem contato; 1ª negada sem bloco; 2ª negada com o bloco |

## 9. Riscos e Rollback

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 5
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (40 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
