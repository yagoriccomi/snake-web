# PLANO DE EXECUÇÃO — 6.2-declarar-aula

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.2 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 9.2, § 9.5, § 3 e a tabela de ações da § 12.2 (`origin/main` do `snake-thai`, v4) |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.2-declarar-aula` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** `/aulas` avisa pelo `upsert` direto em `attendance`, mostra **Vou / Não vou** em toda aula e
  joga fora a frase das recusas do banco. Não conhece **Marcada**, **Desmarcar**, **Vou (extra)** nem o aviso
  de acima da cota.
- **Resultado esperado:** a declaração passa por `declarar_aula(p_class_id, p_vou)`, e os botões saem só das
  colunas de `aulas_do_aluno`, pela tabela de ações da § 12.2. As recusas `23514` aparecem com a frase do
  banco; o aviso de acima da cota não bloqueia e tem **Desfazer**.
- **Como validar:** testes de unidade das ações e do aviso; E2E do livre (marcar, desmarcar, acima da cota,
  mesmo horário), da extra do fixo e da aula que já começou.

## 2. Escopo

**Vou fazer:**
- `lib/aulas.ts`: `acoesDeDeclarar` (tabela da § 12.2), `declararAula` e `avisoDeCota` (texto da § 3).
- `/aulas`: os botões na coluna da direita do cartão, como nas linhas F e G: **Vou** em chip,
  **Desmarcar** em link, **Vou / Não vou** do fixo com o que ele já avisou preenchido (`aria-pressed`).
- O aviso de acima da cota, como na prancheta `AvisoCota`: "Marcada, acima do plano" + o texto da § 3 +
  **Desfazer**.
- `lib/erros.ts` da C5 (PR #9), trazido com o conteúdo idêntico, e `justificarFalta` lançando
  `ErroDeValidacao` como lá: é aqui que a frase do banco passa a aparecer na `fase-6`.
- Sai `avisarPresenca` de `lib/dados.ts` (sem uso) [#12].

**NÃO vou fazer (escopo negativo)** [#8]:
- **Vou (extra)** e **Trocar para esta** no menu: 6.12 e 6.13. Em `/aulas`, o fixo só vê **Vou (extra)** quando
  a RPC mandar `can_mark_extra` numa aula que ela devolve (`aulas_do_aluno` do fixo não traz aula de outra
  turma sem linha dele).
- **Desistir da troca**: 6.14. Na aula com troca saindo dela, nenhum botão de declarar.
- A justificativa pelas RPCs novas: 6.6. O "Não vou" do fixo continua abrindo o formulário de hoje.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Sem botão de declarar depois do início da aula, para todos (a tabela da § 12.2 diz "antes do início" na linha do fixo) | O banco recusa a declaração depois do início (T26); um botão que sempre falha não ajuda | Mostrar o botão e deixar a recusa do banco aparecer |
| P2 | Evento: **Vou** / **Desmarcar** para qualquer aluno, inclusive o fixo | § 9.2: "qualquer aluno ativo declara"; T40: no evento, o fixo marca **Vou** como qualquer aluno | — |
| P3 | Sem plano (`schedule_mode` nulo) conta como fixo | T5 | — |
| P4 | "Marcação desfeita." depois de **Desmarcar** e de **Desfazer** | Sem um recado, a mudança não é anunciada ao leitor de tela; a § 3 não tem texto para isso | Trocar a constante |
| P5 | O aviso de acima da cota ocupa o lugar do recado e fica até a próxima ação | Um aviso de cada vez na região `role="status"` | — |
| P6 | Depois de cada declaração, a lista é lida de novo | Os rótulos vêm só das colunas; quem diz o novo estado é o banco | — |
| P7 | No E2E, o aluno sintético nasce com o plano e a turma começando 30 dias atrás | Descoberto na primeira rodada: a cota é proporcional aos dias da semana em que o plano vale (`cota_da_semana`; um plano 1x que começa na sexta vale 0x), e as aulas da turma anteriores à entrada não são do aluno (D58). Sem isso, o teste dependeria do dia da semana | — |
| P8 | Depois de **Desmarcar** a extra, a aula continua na lista, de novo com **Vou (extra)** | `aulas_do_aluno` traz "as aulas em que já tem linha" (§ 12), e a linha de `attendance` continua, só sem a declaração | — |

## 4. Decisão Visual

- **Tem superfície visual?** Sim.
- **Precisa de mockup?** Não novo: linhas F (`WebAulas`) e G (`EscolherAulasFixo`), e `AvisoCota` da linha B.
- **`design-de-interface-projeto`:** segue o que ela definiu no 6.1 (cartão, selos, tokens). Neste item:
  chip de 44 px com borda `--border-strong`; o escolhido preenchido com `--primary` (o mesmo `.chip.on` dos
  mockups); link com `--primary-text`; o aviso com borda `--info` e fundo `--surface-elevated`, `sticky`
  no pé da lista; botões desabilitados durante o envio; recusa no `role="alert"` que já existe.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/aulas.ts`, `test/aulas.test.ts` | Ações, `declararAula`, `avisoDeCota` e os testes |
| `lib/erros.ts`, `test/erros.test.ts` | Idênticos aos do PR #9 (C5) |
| `lib/dados.ts` | `ErroDeValidacao` como na C5; sai `avisarPresenca` |
| `app/aulas/page.tsx` e `.module.css` | Ações na coluna da direita, o aviso de cota e os estilos |
| `e2e/declarar.spec.ts`, `e2e/aulas.spec.ts`, `e2e/apoio/banco.ts` | Plano livre sintético, aula no mesmo minuto, extra marcada |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/erros.ts`, `lib/dados.ts` | A frase do banco, como na C5 | [#6][#93] | `npm test` |
| 2 | `lib/aulas.ts`, `test/aulas.test.ts` | Ações pelas colunas, `declarar_aula` e o aviso | [#2][#41] | `npm test` |
| 3 | `app/aulas/*` | Botões, aviso de cota e recusas na tela | [#9][#93] | Lint, typecheck, build |
| 4 | `e2e/*` | Fluxos do livre, extra do fixo e aula começada | [#43] | `npm run e2e` |
| 5 | `ROADMAP-web.md` | 6.2 marcado e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** nenhum; usa `declarar_aula` (G3), que não existe em produção antes do G4.
- **Contrato, configuração, LGPD:** nada novo.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | `acoesDeDeclarar` em cada linha da tabela; `declararAula`; `avisoDeCota` | Livre em aula só de fixos; aula cancelada, começada ou com troca saindo; recusa do banco repassada; à vontade sem aviso |
| E2E [#43] | Livre marca e desmarca; acima da cota com **Desfazer**; extra do fixo desmarcada; Vou do fixo preenchido | Duas aulas no mesmo horário: a frase do banco na tela; aula começada sem botão |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Conflito com a `main` em `app/aulas/page.tsx` e `lib/dados.ts` quando a pilha e o #9 chegarem | Certa | Resolver no merge | `lib/erros.ts` idêntico; na tela, fica a versão da `fase-6` |
| Teste da cota perto da virada de semana (domingo 23h) | Baixa | Falha falsa | As duas aulas ficam a 10 minutos uma da outra |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 5
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (20 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
