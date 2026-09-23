# ============================================================================
# snake-web — desenvolvimento local em contêiner
#
# O contêiner serve a página. As chamadas ao Supabase e ao snake-server saem do
# NAVEGADOR, não daqui — por isso as URLs são sempre as do ponto de vista de
# quem abre o site (localhost), e não nomes de serviço do Docker.
#
# Produção não usa este arquivo: a Vercel faz o próprio build.
# ============================================================================
FROM node:24-alpine

WORKDIR /app

# As dependências mudam menos que o código: camada separada aproveita o cache.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev", "--", "--port", "3001", "--hostname", "0.0.0.0"]
