# Sistema de Controle de Contas a Pagar

Sistema completo de controle financeiro desenvolvido com React e Node.js, utilizando MongoDB como banco de dados e configurado como PWA (Progressive Web App).

## Tecnologias

### Backend
- Node.js
- Express
- MongoDB (Mongoose)
- JWT para autenticação
- Nodemailer para recuperação de senha
- Multer para upload de arquivos

### Frontend
- React
- Material-UI (MUI)
- React Router
- Axios
- Recharts para gráficos
- PWA configurado

## Funcionalidades

### Autenticação
- Login
- Cadastro de usuário com validação de senha forte
- Recuperação de senha por email
- Redefinição de senha

### Contas a Pagar
- Cadastro de contas com anexo
- Parcelamento de contas
- Status automático (Pendente, Pago, Vencida, Cancelada)
- Pagamento de contas com registro no extrato
- Visualização de contas do mês

### Fornecedores
- Cadastro de fornecedores
- Inativação (não exclusão) de fornecedores vinculados a contas

### Controle de Contas
- Cadastro de grupos de despesas
- Cadastro de subgrupos dentro dos grupos

### Gastos Diários
- Cadastro de gastos diários
- Filtros por tipo de despesa e data
- Duplicação de gastos
- Vinculação com grupos/subgrupos

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

