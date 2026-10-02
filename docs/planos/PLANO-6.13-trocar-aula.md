# PLANO DE EXECUÇÃO — 6.13-trocar-aula

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.13 do `ROADMAP-web.md` (Fase 6, D15), **sem os anexos da permanente** |
| **Origem** | Contrato § 9.4, § 12.2 (folha "Trocar aula"), § 8, § 3; D44–D47, P19, T37, T46 |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.13-trocar-aula` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** o aluno fixo não pede troca de aula pela web.
- **Resultado esperado:** no menu (6.12), **Trocar para esta** (com `can_swap_to`) abre a folha **Trocar
  aula**: o tipo (**Só nesta semana**, o padrão; **Permanente** quando a aula escolhida tem
  `can_swap_from_permanent` e a nova tem `is_recurring`), "Qual aula sua você quer trocar por esta?" (as da
  semana com `can_swap_from` ou `can_swap_from_permanent`, com o selo **Reposição** na que já passou) e, na
  permanente, "Por que você precisa mudar de horário?" (obrigatório, até 500), "Este horário termina em
  {dd/mm}." quando o horário tem fim e o aviso da § 3. **Pedir troca**: avulsa →
  `pedir_troca_de_aula(de, para, 'once')`; permanente → `criar_motivo('class_swap_evidence', null, texto)` →
  `pedir_troca_de_aula(de, para, 'permanent', motivoId)`. Recusas com a frase do banco.
- **Como validar:** testes de unidade das opções e das RPCs; E2E da avulsa e da permanente.

## 2. Escopo

**Vou fazer:**
- `lib/trocas.ts`: tipos possíveis, aulas de origem, reposição, fim do horário, textos (os do app) e
  `pedirTroca`.
- `lib/aulas.ts`: `can_swap_from`, `can_swap_from_permanent`, `can_swap_to`, `is_recurring` e
  `schedule_ends_on`.
- `components/FolhaDeTroca.tsx`; **Trocar para esta** em `AulaComAcoes`, ligado só no menu (a folha precisa
  das aulas da semana); o hook ganha `abrirTroca` e `pedirTroca`.
- E2E: os dados sintéticos passam a criar horário da grade (`class_schedules`) para a aula recorrente, e a
  limpeza apaga os horários com a marca.

**NÃO vou fazer (escopo negativo)** [#8]:
- **Anexos da permanente** (até 5; JPG, PNG, WEBP, HEIC ou PDF; 10 MB): esperam o **G2** (`POST
  /v1/motivos/sign-upload {motivoId, anexoId}` → Cloudinary → `anexar_ao_motivo`). Sem Cloudinary, nunca o
  Storage (T25).
- **Desistir da troca** e Meus pedidos com as trocas: 6.14.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Textos do app (`snake-thai/src/utils/trocas.ts` e `TrocarAulaSheet`): "Para: {aula} · {dia dd/mm hh:mm}", "Nenhuma aula sua nesta semana pode ser trocada por esta.", **Voltar** / **Pedir troca** e "Pedido de troca enviado. A aula nova fica como Troca pendente até a decisão." | A § 3 traz os rótulos principais; o resto, o app já escolheu | Ajustar nas duas |
| P2 | Primeiro o tipo, depois a lista das aulas daquele tipo | É como o app faz; a lista muda conforme o tipo | — |
| P3 | **Trocar para esta** só no menu, não em `/aulas` | A folha precisa das aulas da semana (as linhas do menu); `aulas_do_aluno` do fixo não traz as aulas de outras turmas | — |
| P4 | A justificativa vazia da permanente é recusada aqui, com a frase do banco | Evita criar um motivo que o pedido recusaria | — |

## 4. Decisão Visual

- **Mockup:** "Aluno fixo — trocar só nesta semana" e "troca permanente" (linha G).
- **`design-de-interface-projeto`** (carregada nesta sessão): a folha abre dentro do cartão da aula nova; o tipo
  como controle segmentado de `radio` (só quando há os dois); as aulas de origem como `radio` em cartões de
  44 px com contorno `--primary` na escolhida; selo **Reposição** em `--info`; o aviso da permanente com borda
  `--info`; **Pedir troca** desabilitado enquanto falta a justificativa; erro em `role="alert"`.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/trocas.ts`, `test/trocas.test.ts` | Criar |
| `lib/aulas.ts` | Colunas da troca |
| `components/FolhaDeTroca.*` | Criar |
| `components/AulaComAcoes.tsx`, `hooks/useAcoesDaAula.ts` | **Trocar para esta** e o pedido |
| `app/aulas/semana/page.tsx` | Passa as aulas da semana |
| `e2e/trocas.spec.ts`, `e2e/apoio/banco.ts` | Aula recorrente com horário; limpeza dos horários |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/trocas.ts` e testes | Opções e pedido | [#2][#41] | `npm test` |
| 2 | Folha, componente e hook | A folha no menu | [#13][#93] | Lint, typecheck |
| 3 | E2E | Avulsa e permanente | [#43] | `npm run e2e` |
| 4 | `ROADMAP-web.md` | 6.13 (sem anexos) e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** `pedir_troca_de_aula` e `criar_motivo` (G3; produção só no G4).
- **LGPD:** a justificativa da permanente pode ter dado de saúde (§ 8, 180 dias); só vai ao banco.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | Tipos, origens, reposição, fim do horário, pedido avulso e permanente | Permanente sem justificativa não vai ao banco; recusa repassada; nova sem `is_recurring` não oferece permanente |
| E2E [#43] | Avulsa → **Troca pendente** e `class_swaps` `once`; permanente com justificativa → `permanent` com motivo | **Pedir troca** desabilitado sem a justificativa |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| E2E perto da virada de semana (domingo à noite) | Baixa | Falha falsa | As duas aulas ficam a 30 minutos uma da outra |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 4
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (35 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
