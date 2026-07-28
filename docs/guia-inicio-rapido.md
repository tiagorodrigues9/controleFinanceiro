# Guia de Início Rápido

Siga as instruções abaixo para ter o Controle Financeiro rodando localmente.

---

## Pré-requisitos

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) >= 18.0.0
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) *(para inicialização via container)*
- Uma instância de **MongoDB** local ou remota *(apenas para desenvolvimento manual)*

---

## :whale: Opção 1 — Docker (Recomendado)

O projeto está totalmente "Dockerizado" para facilitar a inicialização com um único comando.

### 1. Clone o repositório

```bash
git clone https://github.com/tiagorodrigues9/controleFinanceiro.git
cd controleFinanceiro
```

### 2. Inicie os containers

```bash
docker-compose up -d --build
```

### 3. Acesse os serviços

| Serviço | URL |
|---|---|
| **Frontend (Web)** | [http://localhost:3000](http://localhost:3000) |
| **Backend (API)** | [http://localhost:5000](http://localhost:5000) |
| **Swagger Docs** | [http://localhost:5000/api-docs](http://localhost:5000/api-docs) |
| **MongoDB** | `localhost:27017` |

!!! tip "Hot Reload"
    Tanto o backend quanto o frontend possuem **hot reload** ativo no Docker. Alterações no código-fonte são refletidas automaticamente.

---

## :computer: Opção 2 — Desenvolvimento Manual

Caso prefira rodar os servidores fora do Docker:

### 1. Backend

```bash
cd backend
npm install
```

Configure as variáveis de ambiente criando um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O backend estará disponível em `http://localhost:5000`.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm start
```

O frontend estará disponível em `http://localhost:3000`.

### 3. Atalho — Ambos simultaneamente

Na raiz do projeto, use o script que roda backend e frontend em paralelo:

```bash
npm run install:all   # Instala dependências de ambos
npm run dev           # Inicia backend e frontend simultaneamente
```

!!! note "Dependência: `concurrently`"
    O script `npm run dev` na raiz utiliza o pacote `concurrently` para executar ambos os servidores ao mesmo tempo.

---

## :test_tube: Verificação

Após iniciar o projeto, verifique se tudo está funcionando:

1. Acesse `http://localhost:3000` — a tela de login deve aparecer.
2. Acesse `http://localhost:5000/health` — deve retornar `{ "message": "OK" }`.
3. Acesse `http://localhost:5000/api-docs` — a documentação Swagger deve carregar.

---

## Estrutura do Projeto

```
controleFinanceiro/
├── backend/               # API Node.js + Express
│   ├── api/               # Entry point para Vercel (serverless)
│   ├── jobs/              # Cron jobs (contas recorrentes)
│   ├── middleware/         # Autenticação, error handler, etc.
│   ├── models/            # Schemas do Mongoose
│   ├── routes/            # Rotas da API REST
│   ├── schedulers/        # Agendador de notificações
│   ├── services/          # Serviços (email, notificações)
│   ├── utils/             # Utilitários (logger, socket, DB)
│   └── server.js          # Ponto de entrada do servidor
├── frontend/              # React + TypeScript
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── context/       # Contextos React (Auth, Theme)
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── types/         # Tipagens TypeScript
│   │   └── utils/         # Utilitários do frontend
│   └── public/            # Assets estáticos
├── docker-compose.yml     # Orquestração Docker
├── docs/                  # Documentação MkDocs
└── mkdocs.yml             # Configuração da documentação
```
