# PLANO DE EXECUÇÃO — 6.1-aulas-do-aluno

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.1 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 12 (`aulas_do_aluno`) e § 3 (rótulos), na `origin/main` do `snake-thai` (v4); G3 aberto em 29/09 (#75 do app) |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.1-aulas-do-aluno` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** `/aulas` e o bloco "Próximas aulas" da inicial leem `classes` sem filtro e mostram as
  aulas de **todas as turmas** (`buscarProximasAulas`). Não há selo de público, de cancelada nem de troca.
- **Resultado esperado:** as duas telas leem `aulas_do_aluno` e mostram só as aulas do aluno, agrupadas
  por dia, com os rótulos da § 3 escolhidos **só pelas colunas** da RPC.
- **Como validar:** testes de unidade dos rótulos e das datas; E2E: a aula de outra turma não aparece, a
  da turma tem o selo **Sua aula**, a cancelada aparece riscada, com **Cancelada** e sem botões.

## 2. Escopo

**Vou fazer:**
- `lib/aulas.ts`: leitura de `aulas_do_aluno` (cliente injetado), datas no fuso da academia e os rótulos.
- `components/CartaoDeAula.tsx`: o cartão da linha F, usado nas duas telas.
- `/aulas`: hoje e os seis dias seguintes, por dia ("Hoje · qua 23/09", "Qui 24/09").
- `/inicio`: as três próximas aulas dos próximos sete dias, com o mesmo cartão e o rótulo do dia.
- Token `--info` (selos **Livres** e **Troca**) nos dois temas.
- Sai o código sem uso: `buscarProximasAulas`, `formatarDataHora`, `buscarMinhasJustificativas` e os tipos
  `Aula` e `Justificativa` de `lib/dados.ts` [#12].

**NÃO vou fazer (escopo negativo)** [#8]:
- Trocar o aviso por `declarar_aula`, **Vou (extra)**, **Desmarcar** e o aviso de cota: 6.2. Até lá, os
  botões **Vou / Não vou** e a justificativa ficam como estão, só somem na aula cancelada.
- **Desistir da troca** (6.14), **bloco de contato** na troca negada (6.15), botão **Escolher aulas**
  (6.12) e o cabeçalho **Início · Aulas · Sair** (5.1, junto do rodapé do 6.15).
- Rótulos novos da justificativa ("Justificativa em análise", "aprovada por {nome}"): 6.6 e 6.9. O selo da
  justificativa continua com o rótulo de hoje, agora pela coluna `justification_status`.
- Frequência e barra da semana: 6.3 e 6.4.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Mockups: a cópia da versão 8 gerada em 25/09 (12:54) pela sessão que os publicou (pranchetas `WebAulas` e `WebInicio`, linha F). O link do artifact no roadmap do app não abre nesta conta | É a mesma geração aprovada no G0 (25/09); o roadmap do app aponta a versão 8 de 25/09 | Ajustar o cartão quando o dono abrir o artifact |
| P2 | `/aulas` mostra de 00:00 de hoje (São Paulo) até 7 dias depois | A prancheta mostra "Hoje" com a aula cancelada da manhã, que já passou; uma semana é o que o aluno decide | Trocar `DIAS_NA_TELA` |
| P3 | A inicial mostra as 3 próximas, de agora a 7 dias | A prancheta mostra duas e "Ver todas as aulas"; o título da seção é "Próximas aulas" | Trocar `AULAS_NA_INICIAL` |
| P4 | Selos do que a aula é (Cancelada, Sua aula, Troca permanente, Troca, Livres, Fixos) ao lado do título; o que o aluno fez (Marcada, Extra, Troca pendente, a justificativa) à direita | É como as pranchetas da linha F e G separam; à direita entram os botões do 6.2 | — |
| P5 | Na troca: "no lugar de {dia dd/mm hh:mm}" na aula nova aprovada; "Trocou para…" e "Troca pendente para…" na aula de origem; "Troca negada", "Troca expirada · vale a aula original", "Você desistiu da troca" e "Troca cancelada" pela troca mais recente, como no menu (6.12) | Rótulos da § 3, escolhidos por `swap_status`, `swap_role`, `swap_kind` e `swap_decided_via` | — |
| P6 | `--info` no escuro é `#93c5fd` (o dos mockups), não o `#1e3a8a` do app | Sobre `#0d0d0d`, o do app fica perto de 2:1, ilegível como texto de selo | Avisar o app, que tem o mesmo valor no tema escuro |
| P7 | A cor do professor vem do banco e só entra no estilo se for um hex `#RRGGBB` | Dado de fora não vira CSS sem conferir [#51][#53] | — |
| P8 | Os títulos da tela passam aos da prancheta aprovada: **Aulas** e "Marcar é intenção: a presença vale pela chamada do professor."; o link da inicial vira **Ver todas as aulas** | Textos da linha F, aprovada | Voltar ao texto anterior |

## 4. Decisão Visual

- **Tem superfície visual?** Sim.
- **Precisa de mockup?** Não novo: a linha F aprovada (P1) é o mockup.
- **`design-de-interface-projeto` acionada?** Sim. **O que ela definiu:** o cartão da linha F (hora em
  números tabulares, trilho com a cor de cada professor, título, linha de selos e professores, estado à
  direita); selos de contorno, em maiúsculas, com a cor por token (`--error`, `--info`, `--warning`,
  `--primary-text`, `--text-primary`, `--text-secondary`), todos acima de 4,5:1 nos dois temas; a aula
  cancelada riscada **e** com o selo escrito (o risco nunca é o único sinal); trilho e pontos de cor
  escondidos do leitor de tela, porque o nome do professor está escrito ao lado; um `<section>` com
  título por dia; `<time dateTime>` na hora. Estados: "Carregando…" (`role="status"`), erro com "Tentar
  de novo" e o vazio com o texto que já existia.

## 5. Terreno (o que já existe)

| Arquivo | Papel hoje | O que muda |
|---|---|---|
| `lib/aulas.ts` | — | Criar |
| `components/CartaoDeAula.tsx` e `.module.css` | — | Criar |
| `app/aulas/page.tsx` e `.module.css` | Lista de `classes` sem filtro | `aulas_do_aluno`, por dia, com o cartão |
| `app/inicio/page.tsx` e `.module.css` | Próximas aulas de `classes` | `aulas_do_aluno`, com o cartão |
| `lib/dados.ts` | `buscarProximasAulas`, `buscarMinhasJustificativas`, `formatarDataHora` | Sai o que ficou sem uso |
| `app/globals.css` | Tokens | `--info` |
| `test/aulas.test.ts`, `e2e/aulas.spec.ts`, `e2e/apoio/banco.ts` | — / roteiro 1.4 | Testes do 6.1; segunda turma e aula cancelada no E2E |

**Reaproveitamento** [#6]: o guarda do 6.0 (`Protegida`), o fluxo de aviso e de justificativa de hoje, e o
padrão de cliente injetado de `lib/primeiroAcesso.ts`.
**Convenções locais a seguir** [#5][#13]: CSS Modules só com tokens, identificadores em português,
comentário só do porquê.

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/aulas.ts`, `test/aulas.test.ts` | Leitura da RPC, datas em São Paulo e rótulos da § 3 | [#2][#11][#41] | `npm test` |
| 2 | `components/CartaoDeAula.*`, `app/globals.css` | Cartão da linha F e o token `--info` | [#3][#13] | Build e E2E |
| 3 | `app/aulas/*`, `app/inicio/*`, `lib/dados.ts` | As duas telas no cartão e na RPC; sai o código sem uso | [#6][#12] | Lint, typecheck, build |
| 4 | `e2e/*` | Outra turma não aparece; cancelada riscada e sem botões | [#43] | `npm run e2e` |
| 5 | `ROADMAP-web.md` | 6.1 marcado e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco de dados:** nenhum. Só leitura de `aulas_do_aluno`, que existe no banco local (G3) e **não existe
  em produção até o G4**: por isso a `fase-6` não vai para a `main` antes do G4.
- **Contrato de API:** nenhum.
- **Configuração:** nenhuma.
- **Dados pessoais (LGPD):** a RPC devolve o primeiro nome e a cor dos professores, como no app; nada vai
  para log.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | `lerAulaDoAluno`, `buscarAulasDoAluno`, `selosDaAula`, `estadoDaAula`, `notaDaTroca`, `formatarDiaEHora`, `inicioDoDia`, `agruparPorDia` | Cor do professor que não é hex; erro do banco repassado; aula cancelada sem estado; troca sem data; início do dia depois das 21:00 |
| E2E [#43] | Aula da turma com **Sua aula**; aula cancelada riscada e com o selo | Aula de outra turma nunca aparece; cancelada sem botões |

**Comando para rodar:** `npm test` e `npm run e2e`.

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Publicar antes do G4 quebraria as duas telas em produção (a RPC não existe lá) | Baixa | Alto | A `fase-6` só vai para a `main` no G4 e com a confirmação do dono (D15) |
| Os rótulos das trocas só são vistos de verdade quando houver troca no banco local | Média | Rótulo errado | Testes de unidade com cada combinação; o E2E de troca entra com o 6.13 e o 6.14 |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 5
- [x] `npm test`, lint, typecheck e build
- [x] `npm run e2e` verde (15 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
