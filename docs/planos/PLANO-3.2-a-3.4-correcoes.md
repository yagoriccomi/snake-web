# PLANO DE EXECUÇÃO — 3.2-a-3.4-correcoes

| Campo | Valor |
|---|---|
| **Tarefa** | Itens 3.2, 3.3 e 3.4 do `ROADMAP-web.md` |
| **Origem** | Descrição livre (roadmap) |
| **Tipo** | Bug / Melhoria |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-09-25 |
| **Branch** | `fix/log-sem-dado-pessoal` (sobre `fix/primeiro-acesso-senha`) |

---

## 1. Enunciado Canônico

- **Problema:** (3.3) o console do navegador recebe o corpo da recusa da Cloudinary e o erro do
  Storage, que podem trazer o id da pessoa; (3.4) o desvio para o Storage depende da palavra
  `PREENCHER` dentro da URL assinada; (3.2) a página não manda nenhum cabeçalho de segurança.
- **Resultado esperado:** só o status vai para o console; o desvio é uma variável explícita; a
  página manda CSP (com `connect-src` fechado e `frame-ancestors 'none'`), `Referrer-Policy` e
  `X-Content-Type-Options`.
- **Como validar:** `grep console.` em `app/` e `lib/`; `curl -I` no build de produção; a página
  hidrata no Chrome sem violação de CSP.

## 2. Escopo

**Vou fazer:** os três itens, um commit cada.

**NÃO vou fazer (escopo negativo)** [#8]:
- CSP com nonce: obrigaria renderizar toda página a cada acesso; `'unsafe-inline'` fica, e o
  ganho real está em `connect-src` e `frame-ancestors`.
- HSTS e `Permissions-Policy`: fora da lista do roadmap (a Vercel já manda HSTS).
- A auditoria completa da `seguranca-projeto`: o roadmap listou os cabeçalhos; o item foi feito
  direto.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | 3.4 entra agora | O roadmap diz "só se houver outro motivo para mexer no arquivo", e o 3.3 mexe [#14] | Reverter um commit |
| P2 | Nome da variável: `NEXT_PUBLIC_PROOF_UPLOAD_TO_STORAGE` | Configuração só da web, fora do contrato; identificador em inglês, como as outras [#1][#80] | Renomear |
| P3 | Ausente = Cloudinary | Produção não precisa configurar nada novo; o desvio só existe onde alguém o ligou [#81] | — |
| P4 | Cloudinary em `connect-src` é `https://api.cloudinary.com` | É a `uploadUrl` que o `snake-server` devolve (`proofs.cloudinary.ts`) | O envio falharia; a pré-visualização do PR mostra antes |

## 4. Decisão Visual

- **Tem superfície visual?** Não.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/comprovante.ts` | console só com status (3.3); desvio pela variável (3.4) |
| `lib/env.ts`, `.env.example`, `README.md` | variável nova, opcional, só local [#96] |
| `next.config.ts` | cabeçalhos (3.2) [#53][#59] |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/comprovante.ts` | Só o status no console | [#63] | `grep console.` |
| 2 | `lib/env.ts`, `lib/comprovante.ts`, docs | Desvio por variável explícita | [#80] | typecheck |
| 3 | `next.config.ts` | CSP, Referrer-Policy e X-Content-Type-Options | [#59] | `curl -I`; Chrome headless |

## 7. Impacto em Dados e Contratos

- **Banco / contrato:** nenhum.
- **Configuração:** `NEXT_PUBLIC_PROOF_UPLOAD_TO_STORAGE=true` **só no `.env.local`**. Sem ela, o
  ambiente local passa a mandar o comprovante para a Cloudinary sem credenciais, e o envio falha.
- **LGPD:** menos dado pessoal no console.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Manual | cabeçalhos no `next start` | — |
| Manual | Chrome headless em `/inicio` sem sessão: o JS roda e volta ao login | script barrado pela CSP |

O envio real do comprovante com CSP fica para o 1.3 (👤) e para a pré-visualização do PR.

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| CSP barrar uma chamada legítima em produção | Baixa | tela sem dados ou envio falhando | a pré-visualização do PR usa as variáveis da Vercel; conferir antes de mesclar |

**Rollback** [#84]: reverter o commit do `next.config.ts`.

## 10. Definição de Pronto

- [x] Passos 1–3
- [x] typecheck, lint (0 erros), testes e build
- [x] Cabeçalhos conferidos; página hidrata sob a CSP
- [x] Roadmap marcado e Registro anotado
- [ ] 👤 Na pré-visualização do PR: entrar e enviar um comprovante
