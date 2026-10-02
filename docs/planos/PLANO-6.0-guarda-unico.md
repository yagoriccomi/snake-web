# PLANO DE EXECUÇÃO — 6.0-guarda-unico

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.0 do `ROADMAP-web.md` |
| **Origem** | Descrição livre (roadmap) |
| **Tipo** | Bug / Melhoria |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-09-25 |
| **Branch** | `feat/guarda-unico` (sobre `test/validacao`) |

---

## 1. Enunciado Canônico

- **Problema:** só a inicial confere papel, primeiro acesso e termos pendentes. `/aulas` e
  `/pagar/[id]` só conferem a sessão; `/termos` não confere papel nem primeiro acesso. Um
  professor, alguém com a senha da academia ainda valendo ou alguém sem aceite chega a essas
  telas pelo endereço.
- **Resultado esperado:** um guarda só, na mesma ordem em todas as páginas logadas: sessão →
  papel `user` → primeiro acesso → termos pendentes. As telas novas da Fase 6 nascem com ele.
- **Como validar:** testes de unidade de cada desvio; no banco local, `/aulas` com aluno de
  primeiro acesso vai para `/primeiro-acesso`.

## 2. Escopo

**Vou fazer:**
- `lib/guarda.ts`: `verificarAcesso(cliente, etapa)`, puro, com o cliente injetado [#20][#21].
- `components/Protegida.tsx`: roda o guarda uma vez, redireciona, mostra carregando, "só para
  alunos" e erro, e só monta a página liberada.
- As cinco páginas logadas passam a usar o guarda. Cada uma confere **até a etapa anterior à
  dela**: `/primeiro-acesso` confere sessão e papel; `/termos` também o primeiro acesso; as
  demais, tudo.

**NÃO vou fazer (escopo negativo)** [#8]:
- Cabeçalho Início · Aulas · Sair (5.1): vem com as telas da Fase 6.
- Middleware do Next no servidor: a sessão vive no navegador (CLAUDE.md § 2); a segurança é a
  RLS, e o guarda é a porta de entrada da experiência.
- Trocar os `window.location.href` que não são do guarda.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Sem texto novo | As telas de aviso reaproveitam as da inicial ("Esta página é só para alunos", "Não foi possível carregar") | — |
| P2 | Sem mockup | Nenhuma tela nova: o aviso de "só para alunos" e o de erro já existem na inicial e passam a valer nas outras páginas [Regra 4: ajuste dentro de padrão existente] | Chamar a `design-de-interface-projeto` |
| P3 | Erro ao ler o perfil ou os documentos = tela de erro, nunca liberar | Liberar sem saber se há aceite pendente furaria o consentimento [#93] | — |

## 4. Decisão Visual

- **Tem superfície visual?** Sim, mas só com o que já existe (P2). **Mockup:** não.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/guarda.ts`, `test/guarda.test.ts` | criar |
| `components/Protegida.tsx`, `components/Protegida.module.css` | criar, com os estilos de aviso da inicial |
| `app/inicio/page.tsx` | o guarda sai da página |
| `app/aulas/page.tsx`, `app/pagar/[id]/page.tsx` | ganham o guarda completo |
| `app/termos/page.tsx`, `app/primeiro-acesso/page.tsx` | ganham o guarda até a etapa anterior |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/guarda.ts` + teste | Decide o destino de cada situação | [#2][#41] | `npm test` |
| 2 | `components/Protegida.*` | Aplica o destino e mostra os avisos | [#6] | typecheck |
| 3 | páginas | Usam o guarda; a lógica repetida sai | [#6][#12] | lint, build, banco local |

## 7. Impacto em Dados e Contratos

- Nenhum. Lê `profiles` (`name`, `role`, `is_first_login`) e `documentos_legais_pendentes`, como
  a inicial já fazia.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade | cada etapa × cada situação | sem sessão; perfil com erro; professor; primeiro acesso; termo pendente; erro nos documentos |
| Manual | Chrome headless no banco local | aluno de primeiro acesso abrindo `/aulas` |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Laço de redirecionamento | Baixa | página não abre | cada página confere só até a etapa anterior à dela |

**Rollback** [#84]: reverter os commits.

## 10. Definição de Pronto

- [x] Passos 1–3
- [x] typecheck, lint (0 erros; avisos de 16 para 8), 50 testes e build
- [x] Conferido no navegador contra o banco local (9 cenários)
- [x] Roadmap marcado e Registro anotado
