# Snake Thai — web 🐍

Página web para o aluno da academia acompanhar a própria frequência, ver as
aulas e enviar o comprovante de pagamento.

Ela existe porque **não há aplicativo para iPhone**. O aluno de iPhone é
cadastrado normalmente — o professor faz a chamada dele e a mensalidade conta no
financeiro —, e é por aqui que ele acompanha tudo.

## O que dá para fazer

- Entrar com a mesma conta do aplicativo
- Primeiro acesso: trocar a senha e confirmar os dados
- Ler e aceitar a Política de Privacidade e os Termos de Uso
- Ver a própria frequência do mês e o histórico
- Ver as próximas aulas, avisar falta e enviar justificativa
- Ver as mensalidades e enviar o comprovante de pagamento

**Só alunos entram aqui.** Professores e administradores são barrados na
entrada: a chamada, a aprovação de comprovantes e a gestão da academia vivem no
aplicativo Android.

## Como funciona

```
navegador ──► Supabase (dados, protegidos por RLS)
          └─► snake-server (assina o envio do comprovante para a Cloudinary)
```

O navegador conversa direto com o banco, com as **mesmas regras de acesso** do
aplicativo: o que o aluno não vê no celular, também não vê aqui. Só o que exige
segredo passa pelo backend próprio.

## Rodando localmente

O banco **não sobe aqui**: é o mesmo Supabase local do aplicativo Android em
desenvolvimento. Dois bancos diferentes contando a mesma turma seria pior que
nenhum.

**1. Suba o banco**, no repositório `snake-thai`:

```bash
scripts\db-dev start
```

**2. Configure o ambiente**, aqui:

```bash
cp .env.example .env.local
```

Preencha `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a chave anônima do banco local —
ela aparece em `scripts\db-dev env`, no repositório `snake-thai`.

**3. Suba a página:**

```bash
docker compose up
```

Pronto: <http://localhost:3001>.

Sem Docker, `npm install && npm run dev -- --port 3001` faz o mesmo.

## Contribuindo

**Todo push na `main` publica na Vercel.** Por isso o trabalho entra por branch e
*pull request*: a Vercel gera uma URL de pré-visualização para cada PR, e dá para
conferir no celular antes de chegar à produção.

O `npm install` liga dois ganchos do Git (Husky):

- **antes do commit**, `npm run lint` e `npm run typecheck`;
- **na mensagem**, o padrão Conventional Commits (`feat: …`, `fix: …`, `docs: …`).

Os dois comandos também rodam à mão.

## Variáveis de ambiente

| Variável | O que é |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Endereço do banco. Local: `http://localhost:55321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima. É pública por natureza — quem protege os dados é a RLS |
| `NEXT_PUBLIC_API_URL` | Backend próprio. Local: `http://localhost:3000`; produção: a URL da Render |

Nenhum segredo entra neste repositório, que é público. Em produção, as
variáveis vivem no painel da Vercel.

## Publicação

A **Vercel** faz o build e serve a página, apontando para o banco real e para o
`snake-server` na Render. O `Dockerfile` daqui é só para o ambiente local.

Configuração: a Vercel reconhece o Next.js sozinha — não mude comando de build,
diretório de saída nem root directory. As três variáveis da tabela acima entram
em *Settings → Environment Variables*, com os valores de **produção**.

**Domínio em produção:** <https://snake-web-eight.vercel.app>

### O CORS do backend precisa conhecer este domínio

O `snake-server` nasce fechado para navegador: com a lista de origens vazia, ele
recusa qualquer página. O aplicativo nunca esbarrou nisso porque app nativo não
manda cabeçalho `Origin` — a web é o primeiro cliente de navegador do backend.

Na Render, em `ALLOWED_ORIGIN`:

```
ALLOWED_ORIGIN=https://snake-web-eight.vercel.app
```

**Sem barra no final.** O cabeçalho `Origin` do navegador é sempre esquema, host
e porta, sem caminho, e a comparação no servidor é exata. Com a barra, entrar e
ver os dados continua funcionando — eles vêm direto do Supabase — e **só o envio
do comprovante falha**, que é a única parte que passa pelo backend. O erro
aparece no console do navegador e não diz que o motivo é uma barra.

## Repositórios irmãos

| Repositório | Papel |
| --- | --- |
| `snake-thai` | Aplicativo Android e **o esquema do banco** (migrations) |
| `snake-server` | Backend próprio: assinatura de envio e visualização do comprovante |
