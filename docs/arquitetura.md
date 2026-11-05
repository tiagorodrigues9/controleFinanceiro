# Arquitetura do Sistema

O Controle Financeiro segue uma arquitetura **cliente-servidor** com comunicação bidirecional via REST e WebSockets.

---

## Visão Geral

```mermaid
graph TB
    subgraph Cliente
        A[React + TypeScript]
        B[Material-UI]
        C[Axios + Interceptores]
        D[Socket.io Client]
    end

    subgraph Servidor
        E[Express.js]
        F[Middleware Auth JWT]
        G[Routes / Controllers]
        H[Mongoose ODM]
        I[Socket.io Server]
        J[Cron Jobs]
        K[Services]
    end

    subgraph Banco de Dados
        L[(MongoDB)]
    end

    A --> C
    C -- "REST API (HTTP)" --> E
    D -- "WebSocket" --> I
    E --> F
    F --> G
    G --> H
    H --> L
    I --> K
    J --> H
    K --> H
```

---

## Backend

O backend é construído com **Node.js + Express** e segue uma arquitetura em camadas:

### Camadas

| Camada | Diretório | Responsabilidade |
|---|---|---|
| **Rotas** | `routes/` | Definição dos endpoints HTTP e validações |
| **Middleware** | `middleware/` | Autenticação JWT, rate limiting, error handler |
| **Models** | `models/` | Schemas Mongoose (definição do banco de dados) |
| **Services** | `services/` | Lógica de negócio complexa (e-mail, notificações) |
| **Jobs** | `jobs/` | Tarefas agendadas via `node-cron` |
| **Schedulers** | `schedulers/` | Agendador de notificações automáticas |
| **Utils** | `utils/` | Logger (Winston), conexão DB, WebSocket, keep-alive |

### Segurança

- **Helmet** — Headers HTTP de segurança
- **CORS** — Origens permitidas com whitelist configurável
- **Rate Limiting** — Limite global (`1000 req/15min`) e restrito para auth (`100 req/15min`)
- **JWT** — Access Token (curta duração) + Refresh Token (longa duração)
- **bcrypt** — Hash de senhas com salt

### Comunicação em Tempo Real

O servidor utiliza **Socket.io** para comunicação bidirecional:

```mermaid
sequenceDiagram
    participant Client as Frontend
    participant Server as Backend
    participant DB as MongoDB

    Client->>Server: Conectar WebSocket
    Server-->>Client: Conexão estabelecida
    Client->>Server: join_user_room(userId)
    Note right of Server: Usuário entra na sala

    loop Evento de dados
        Server->>DB: Novo gasto registrado
        Server-->>Client: Emitir atualização
        Client->>Client: Atualizar Dashboard
    end
```

---

## Frontend

O frontend é uma **SPA (Single Page Application)** construída com React e TypeScript:

### Estrutura

| Diretório | Função |
|---|---|
| `pages/` | Páginas da aplicação (Login, Dashboard, Contas, etc.) |
| `components/` | Componentes reutilizáveis (Layout, Charts, Error Boundary) |
| `context/` | Contextos React para estado global (Auth, Theme) |
| `hooks/` | Custom hooks para lógica compartilhada |
| `types/` | Definições de tipos TypeScript |
| `utils/` | Utilitários (formatação, API client) |

### Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant User as Usuário
    participant App as React App
    participant API as Backend API

    User->>App: Login (email + senha)
    App->>API: POST /api/auth/login
    API-->>App: Access Token + Refresh Token
    App->>App: Armazena tokens

    Note over App: Requisições autenticadas

    App->>API: GET /api/contas (com Access Token)
    API-->>App: Dados protegidos

    Note over App: Access Token expirou

    App->>API: POST /api/auth/refresh-token
    API-->>App: Novo Access Token
    App->>App: Retenta requisição original
```

---

## Banco de Dados

O MongoDB armazena os dados com os seguintes modelos principais:

```mermaid
erDiagram
    USER ||--o{ CONTA : possui
    USER ||--o{ GASTO : registra
    USER ||--o{ EXTRATO : gera
    USER ||--o{ CARTAO : possui
    USER ||--o{ CONTA_BANCARIA : possui
    USER ||--o{ ORCAMENTO : define
    USER ||--o{ NOTIFICACAO : recebe

    CONTA }o--|| FORNECEDOR : "paga a"
    CONTA }o--o| CARTAO : "vinculada a"
    CONTA }o--o| CONTA_BANCARIA : "debitada de"
    CONTA }o--o| GRUPO : "categorizada por"

    GASTO }o--|| GRUPO : "categorizado por"
    GASTO }o--o| CARTAO : "pago via"
    GASTO }o--o| CONTA_BANCARIA : "debitado de"

    CARTAO ||--o{ FATURA_CARTAO : gera

    EXTRATO }o--|| CONTA_BANCARIA : "pertence a"
```

### Modelos

| Modelo | Coleção | Descrição |
|---|---|---|
| `User` | `users` | Usuários com dados pessoais e configurações |
| `Conta` | `contas` | Contas a pagar/receber com status e parcelamento |
| `Gasto` | `gastos` | Gastos diários com categorização |
| `Extrato` | `extratos` | Movimentações bancárias |
| `Cartao` | `cartaos` | Cartões de crédito |
| `FaturaCartao` | `faturacartaos` | Faturas mensais dos cartões |
| `ContaBancaria` | `contabancarias` | Contas bancárias do usuário |
| `Fornecedor` | `fornecedors` | Fornecedores vinculados às contas |
| `Grupo` | `grupos` | Categorias e subcategorias de despesas |
| `FormaPagamento` | `formapagamentos` | Formas de pagamento disponíveis |
| `Orcamento` | `orcamentos` | Orçamentos mensais por categoria |
| `Notificacao` | `notificacaos` | Notificações do sistema |

---

## Infraestrutura

### Docker Compose

O projeto utiliza Docker Compose com 3 serviços:

| Serviço | Container | Porta | Função |
|---|---|---|---|
| `mongodb` | `cf-mongodb` | 27017 | Banco de dados |
| `backend` | `cf-backend` | 5000 | API REST + WebSocket |
| `frontend` | `cf-frontend` | 3000 | Aplicação React |

### CI/CD (GitHub Actions)

O repositório possui fluxos de integração contínua:

1. **Instala** dependências de backend e frontend
2. **Lint** do backend (`npm run lint`)
3. **Build** do frontend (`npm run build`)
4. Relata falhas antes de qualquer merge na branch `main`

### Deploy

O projeto suporta deploy em:

- **Vercel** — Backend como serverless functions
- **Render** — Backend como serviço long-running
- **Docker** — Deploy containerizado completo
