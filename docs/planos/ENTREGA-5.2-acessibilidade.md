# ENTREGA — 5.2-acessibilidade

| Campo | Valor |
|---|---|
| **Tarefa** | Item 5.2 do `ROADMAP-web.md` |
| **Modo** | 🔁 Loop, com a skill `acessibilidade-projeto` |
| **Data** | 2026-09-25 |
| **Branch** | `feat/a11y` (sobre `feat/guarda-unico`) |
| **Plataforma** | Web (Next.js, HTML semântico + ARIA), temas claro e escuro |

## O que foi auditado

As seis páginas (`/`, `/inicio`, `/aulas`, `/pagar/[id]`, `/primeiro-acesso`, `/termos`) e
`components/Protegida`, nos quatro pontos do roadmap: área de toque, rótulos, foco visível e
contraste nos dois temas.

**Já estava certo** (conferido no código):

- **Área de toque:** todo botão, link e campo usa `min-height: var(--hit)` (44 px). A caixa de
  aceite dos termos tem 22 px, mas fica dentro de um `<label>` de 44 px, e o toque no texto marca.
- **Rótulos:** todo campo tem `<label htmlFor>`; botões e links são elementos nativos com texto;
  `<html lang="pt-BR">`; títulos em ordem (h1 → h2).
- **Foco:** `:focus-visible` global com contorno de 2 px (4,56:1 no claro, 14,3:1 no escuro); nenhum
  `outline: none`; o seletor de arquivo do comprovante é escondido com `opacity`, não
  `display: none`, e o foco aparece no rótulo que faz de botão; o texto dos termos é uma região
  rolável com `tabIndex={0}` e nome.
- **Erros e recados:** `role="alert"` nos erros, `role="status"` no recado de `/aulas`.
- **Cor não é o único sinal:** selos têm texto, e a frequência baixa tem a frase de alerta.

## Achados e correções

| Severidade | Onde | WCAG | Achado | Correção |
|---|---|---|---|---|
| **Sério** | `app/inicio/page.module.css` (selos `overdue`, `pending_approval`, `paid`) e `app/aulas/page.module.css` (selos `pending`, `approved`, `rejected`) | 1.4.3 | No tema claro, o texto de 12 px sobre o fundo tingido ficava em **3,81**, **4,05** e **4,39**:1 | Tinta = `color-mix(cor 80%, --text-primary)`: ≥ **5,15**:1 no claro e ≥ **5,76**:1 no escuro, mantendo a cor do estado |
| **Sério** | `app/page.module.css`, `app/primeiro-acesso/page.module.css` (`.entrada`) e `app/aulas/page.module.css` (`.area`) | 1.4.11 | A borda dos campos (`--border`) ficava em **1,31**:1 (claro) e **1,49**:1 (escuro): o campo some na tela | Token derivado `--input-border` (texto secundário a 70%): **3,44**:1 e **4,22**:1 |
| Menor | `app/primeiro-acesso/page.tsx` (dica da senha) | 4.1.3, 1.3.1 | A dica "Falta: …" mudava a cada tecla, mas não era anunciada nem ligada ao campo | Região `aria-live="polite"` sempre presente, ligada por `aria-describedby` |
| Menor | `components/Protegida.tsx` e as cinco páginas ("Carregando…") | 4.1.3 | O estado de carregamento não era anunciado | `role="status"` |
| Menor | `app/pagar/[id]/page.tsx` e a dica de senha forte | 1.1.1 | O "✓" era lido como "marca de seleção" | `aria-hidden` no símbolo |

Todas as medidas usam a fórmula de luminância da WCAG, calculadas com os tokens de
`app/globals.css`. Os fundos com `color-mix` foram compostos sobre a superfície. [#43]

**Fora do escopo, de propósito:** a borda dos botões secundários (`--border-strong`, 1,78:1). O
texto do botão já o identifica, e a 1.4.11 não pede borda nesse caso. Nenhum texto de tela novo
foi criado: os anúncios reaproveitam os textos que já existiam.

## Como validar

1. **Teclado:** em cada página, `Tab` do começo ao fim. O contorno aparece em todo controle, a
   ordem segue a leitura, e em `/pagar/[id]` o `Enter` no "Escolher arquivo" abre o seletor.
2. **Leitor de tela** (TalkBack no Android, VoiceOver no iPhone ou NVDA no Windows): no primeiro
   acesso, digitar a senha e ouvir "Falta: …" mudar; ao completar, "Senha forte".
3. **Temas:** no celular, alternar entre claro e escuro. Os selos da inicial e de `/aulas` ficam
   legíveis, e a borda dos campos de login e de primeiro acesso aparece nos dois.

Conferido aqui: typecheck, lint (0 erros), 50 testes e build. No Chrome headless, com o tema
emulado, `--input-border` resolve para o texto secundário a 70% nos dois temas.
