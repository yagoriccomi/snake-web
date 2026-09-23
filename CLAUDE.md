# Regras de Engenharia — snake-web

Página web do Snake Thai. Existe por um motivo concreto: **não há aplicativo para
iPhone**, e esses alunos precisam acompanhar a própria frequência e enviar o
comprovante de pagamento.

## 1. O que este repositório é — e o que não é

* **É** a interface web do aluno. Mesma conta, mesmo banco, mesmas regras de acesso do app.
* **Não é** um segundo produto. Toda regra de negócio vive no banco (`snake-thai/supabase/migrations`)
  ou no backend (`snake-server`). Aqui há tela, e só.
* **Não é** painel de administrador nem de professor. **Só aluno entra aqui** —
  e isso é um bloqueio de verdade, não ausência de tela: quem não tem o papel
  `user` tem a sessão encerrada na entrada, com a explicação de que a gestão
  vive no aplicativo. Deixar um professor entrar num lugar sem as ferramentas
  dele é pior que barrar na porta.

Escopo da primeira versão (decidido com o dono da academia em 2026-09-23):
entrar, primeiro acesso (senha e dados), aceitar os termos, ver a própria
frequência, enviar comprovante, ver as próximas aulas, avisar falta e enviar
justificativa. **Nada além disso sem pedido explícito.**

## 2. Arquitetura

```
navegador ──► Supabase (dados, protegidos por RLS)
          └─► snake-server (só o que exige segredo: assinar o envio do comprovante)
```

* **Client-side.** O navegador fala direto com o Supabase, como o aplicativo faz.
  Sem Server Components buscando dados: um caminho só, um modelo mental só.
* **A RLS é a segurança.** A chave anônima é pública por natureza. O que protege
  o dado é a política no banco — nunca uma checagem nesta interface.
* **Nenhuma regra de negócio aqui.** Frequência, mensalidade e prazo são contas
  do banco. Se você precisou calcular algo nesta camada, provavelmente o cálculo
  está faltando lá.
* **Nenhum segredo.** Só variáveis `NEXT_PUBLIC_`. Chave de serviço, token de
  API e senha não entram neste repositório — ele é **público**.

## 3. Ambiente local

O banco **não sobe aqui**. É o mesmo Supabase local do app Android DEV:

```bash
# no repositório snake-thai
scripts\db-dev start

# aqui
docker compose up
```

A página fica em `http://localhost:3001`; o banco, em `http://localhost:55321`.
Dois bancos diferentes contando a mesma turma seria pior que nenhum.

As chamadas saem do **navegador**, então as URLs são sempre as de quem abre o
site (`localhost`), nunca nomes de serviço do Docker.

## 4. Produção

* **Vercel** serve a página; o build é dela, não do `Dockerfile` (que é só local).
* Aponta para o banco **real** e para o `snake-server` na **Render**.
* As variáveis vivem no painel da Vercel. Nunca em arquivo versionado.

## 5. Convenções

* **TypeScript estrito.** `any` é erro.
* **Código e identificadores em inglês; comentários, documentação e texto de tela
  em português.** Igual ao app.
* **Comentar o porquê, nunca o quê.**
* **Cores por token**, nunca valor fixo na página — e os tokens são os mesmos do
  app (`snake-thai/src/theme/colors.ts`), para o aluno reconhecer o produto.
* **Nada falha em silêncio.** Toda chamada tem estado de carregando, vazio e
  erro, e o erro diz o que fazer. Sem stack trace na tela.
* **Área de toque mínima de 44 px** e rótulo acessível em tudo que é clicável.
* **Commits no padrão Conventional Commits.**

## 6. LGPD

* A pessoa precisa **aceitar a Política e os Termos** aqui também — o aceite é
  por versão e vive no banco, compartilhado com o app.
* Nenhum dado pessoal em log, mensagem de erro ou URL.
* O comprovante vai **direto do navegador para a Cloudinary**, com assinatura
  pedida ao `snake-server`. O arquivo não passa por este servidor.
