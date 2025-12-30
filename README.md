# Controle Financeiro

Sistema completo de controle financeiro (contas a pagar, gastos, extrato bancário) com autenticação JWT, desenvolvido com React e Node.js.

## 🚀 Deploy no Render

### Pré-requisitos
- Conta no [Render.com](https://render.com)
- MongoDB Atlas (free tier)
- Git e repositório no GitHub

### Variáveis de ambiente no Render

No dashboard do Render, adicione as seguintes variáveis de ambiente:

```
NODE_ENV=production
PORT=5000
MONGO_USER=<seu_usuario_mongo>
MONGO_PASS=<sua_senha_mongo>
MONGO_HOST=<seu_cluster_mongo_atlas>.mongodb.net
MONGO_DB=controle-financeiro
JWT_SECRET=<gere-uma-chave-segura-aqui>
REACT_APP_API_URL=https://seu-app.onrender.com/api
RENDER=true
```

### Deploy automático
1. Conecte seu repositório GitHub no Render
2. Selecione "Docker" como runtime
3. Configure as variáveis de ambiente acima
4. Deploy automático será acionado a cada push em `main`

### Keep-Alive (evita sleep)
O sistema inclui um keep-alive que faz requisições automáticas a cada 12 minutos para manter a app acordada.

## 📦 Desenvolvimento Local

### Com Docker Compose
```bash
docker-compose up -d
```

### Sem Docker
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

## 🎯 Funcionalidades

- ✅ Autenticação JWT
- ✅ Contas a Pagar (filtros, parcelamento, formas de pagamento)
- ✅ Gastos Diários (grupos/subgrupos)
- ✅ Extrato Bancário (com estorno)
- ✅ Formas de Pagamento (dinâmicas, padrão)
- ✅ Fornecedores (inativação)
- ✅ Contas Bancárias (inativação, saldo)
- ✅ Dashboard (métricas)
- ✅ Controle de Grupos/Subgrupos

## 🔒 Segurança

- JWT com expiração
- Validação de inputs
- Autenticação em rotas protegidas
- Transações Mongoose para operações críticas
- Logging estruturado

## 📊 Tecnologias

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- Multer (upload)
- Winston (logging)
- Express-async-errors

### Frontend
- React + TypeScript
- Material-UI (MUI)
- React Router
- Axios
- Date-fns

## 📝 License

MIT

### Contas Bancárias
- Cadastro de contas bancárias
- Cadastro avançado (agência, número da conta)
- Cálculo automático de saldo via extrato

### Extrato Financeiro
- Visualização de todas as movimentações
- Filtros por conta bancária e tipo de despesa
- Lançamentos manuais (entrada/saída)
- Lançamento de saldo inicial
- Estorno de lançamentos

### Dashboard
- Relatórios de contas
- Gráficos comparativos
- Análise de gastos por categoria
- Evolução de saldo

## Instalação

### Pré-requisitos
- Node.js instalado
- MongoDB instalado e rodando (ou URI de conexão)

### Backend

1. Navegue até a pasta backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env` baseado no `.env.example`:
```bash
cp .env.example .env
```

4. Configure as variáveis de ambiente no arquivo `.env`:
```
PORT=5000
MONGODB_URI=sua_uri_mongodb_aqui
JWT_SECRET=seu_jwt_secret_aqui
JWT_EXPIRE=7d
NODE_ENV=development

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_app
EMAIL_FROM=noreply@controlefinanceiro.com
```

5. Inicie o servidor:
```bash
npm run dev
```

### Frontend

1. Navegue até a pasta frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env` na pasta frontend:
```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Inicie o servidor de desenvolvimento:
```bash
npm start
```

## Estrutura do Projeto

```
controleFinanceiro/
├── backend/
│   ├── models/          # Modelos do MongoDB
│   ├── routes/           # Rotas da API
│   ├── middleware/       # Middlewares (auth)
│   ├── uploads/         # Arquivos enviados
│   └── server.js        # Servidor principal
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── context/     # Context API
│   │   ├── hooks/       # Custom hooks
│   │   └── utils/       # Utilitários
│   └── public/          # Arquivos públicos
└── README.md
```

## Segurança

- Autenticação JWT
- Senhas criptografadas com bcrypt
- Middleware de autenticação em todas as rotas protegidas
- Dados isolados por usuário (cada usuário vê apenas seus dados)

## PWA

O sistema está configurado como PWA, permitindo:
- Instalação como app
- Funcionamento offline (com service worker)
- Notificações push (pode ser configurado)

## Observações Importantes

1. **MongoDB**: Você precisará fornecer a URI de conexão do MongoDB após a instalação
2. **Email**: Configure as credenciais de email para a funcionalidade de recuperação de senha
3. **Uploads**: A pasta `backend/uploads` será criada automaticamente para armazenar anexos
4. **Saldo**: O saldo das contas bancárias é calculado automaticamente através do extrato, não é permitido cadastrar saldo manualmente

## Licença

Este projeto é de uso pessoal.

