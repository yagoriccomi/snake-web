# PLANO DE EXECUÇÃO — 6.12-aulas-da-semana

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.12 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 12.2 (`menu_de_aulas` e a tabela de ações), § 3, § 9.5; D43, D56, T43 |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.12-aulas-da-semana` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** a web não tem o menu de aulas: o livre não escolhe aulas da semana que vem, e o fixo não vê as
  aulas de outras turmas para marcar **Vou (extra)**.
- **Resultado esperado:** **Escolher aulas** na tela Aulas → **Aulas da semana**, com as abas **Esta semana** /
  **Próxima semana**, um botão por dia de aula (`class_weekdays`), a lista do dia por `menu_de_aulas(p_semana)`
  e as ações só pelas colunas (tabela da § 12.2). Sem vagas nem contagem (T43). Link **Meus pedidos**.
- **Como validar:** testes de unidade do menu e dos dias; E2E do **Vou (extra)** do fixo e da próxima semana.

## 2. Escopo

**Vou fazer:**
- `lib/menu.ts`: `menu_de_aulas`, `class_weekdays` (leitura direta de `academy_settings`, como manda a § 12.2),
  os dias do menu (aula num dia que não está configurado aparece no dia dela) e o dia aberto ao entrar.
- `hooks/useAcoesDaAula.ts` e `components/AulaComAcoes.tsx`: o que estava dentro de `/aulas` (declarar, aviso
  de cota, justificativa e "Eu estava na aula") sai para ser o mesmo nas duas telas [#6].
- Página nova `/aulas/semana`; o cartão "Esta semana" do livre (6.4) também aparece nela.
- **Escolher aulas** em `/aulas`.

**NÃO vou fazer (escopo negativo)** [#8]:
- **Trocar para esta** e a folha **Trocar aula**: 6.13.
- **Desistir da troca** e as trocas em Meus pedidos: 6.14.
- **Bloco de contato** na troca negada e o rodapé **Falar com a academia** da prancheta: 6.15 (com o 5.1).
- O cabeçalho **Início · Aulas · Sair**: 5.1, junto do 6.15.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Os dias aparecem como na prancheta da web (botões com dia da semana, data e "{n} aulas"), e a lista mostra o dia escolhido; o contrato fala em "um bloco por dia" | A prancheta aprovada (linha G) escolhe um dia por vez; no celular, sete blocos seguidos ficariam longos | Trocar para todos os dias em sequência |
| P2 | Ao entrar, abre o dia de hoje (se a semana tem hoje) ou o primeiro dia | É o que o aluno quer ver primeiro | — |
| P3 | `class_weekdays` usa 0 = domingo … 6 = sábado, e sem valor vale seg a sáb | É como o banco lê a coluna em `cota_da_semana` | — |
| P4 | Dia que já passou com borda tracejada, ainda clicável | Mockup ("Os dias com borda tracejada já passaram"); a aula passada serve à reposição (6.13) | — |
| P5 | "Nenhuma aula neste dia." para o dia vazio | Sem texto na § 3 | Trocar o texto |
| P6 | Mockups: a mesma cópia da versão 8 do 6.1 | — | — |

## 4. Decisão Visual

- **Mockup:** "Web — escolher aulas e trocar" (linha G) e "Aluno livre — escolher aulas".
- **`design-de-interface-projeto`** (carregada nesta sessão): abas como controle segmentado com `role="tab"` e
  `aria-selected`, a escolhida em `--primary`; os dias como abas de 64 px de altura com nome acessível
  ("Qua 24, 2 aulas"), tracejado no dia passado e contorno `--primary` no escolhido; a lista usa o mesmo
  cartão e as mesmas ações de `/aulas`; estados de carregando, erro e vazio.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/menu.ts`, `test/menu.test.ts` | Criar |
| `hooks/useAcoesDaAula.ts`, `components/AulaComAcoes.*` | Criar (saem de `app/aulas/page.tsx`) |
| `app/aulas/*` | Usa o hook e o componente; botão **Escolher aulas**; os estilos das ações foram para o componente |
| `app/aulas/semana/*` | Criar |
| `e2e/menu.spec.ts` | Criar |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | Hook e componente | Ações da aula num lugar só | [#6][#13] | E2E de `/aulas` continua verde |
| 2 | `lib/menu.ts` e testes | Menu e dias | [#2][#41] | `npm test` |
| 3 | `/aulas/semana` e **Escolher aulas** | O menu | [#13] | Lint, typecheck |
| 4 | E2E | Extra do fixo; próxima semana | [#43] | `npm run e2e` |
| 5 | `ROADMAP-web.md` | 6.12 e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** `menu_de_aulas` (G3; produção só no G4) e leitura de `academy_settings.class_weekdays`.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | `menu_de_aulas`, `class_weekdays`, dias do menu, dia inicial | Semana fora do menu (recusa do banco); sem configuração; aula fora dos dias configurados; domingo |
| E2E [#43] | **Escolher aulas** → menu; fixo marca **Vou (extra)** em outra turma → **Extra**; próxima semana | A aula da semana que vem não aparece em Esta semana |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| A extração das ações mudar o comportamento de `/aulas` | Baixa | Defeito em tela já pronta | O E2E de `/aulas`, declarar, justificativas e pedidos roda inteiro nesta rodada |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 5
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (33 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
