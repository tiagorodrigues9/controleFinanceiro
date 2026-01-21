# Deploy do Backend no Vercel

## 📋 Pré-requisitos

1. **Conta no Vercel**: [vercel.com](https://vercel.com)
2. **MongoDB Atlas**: Cluster configurado
3. **Git**: Repositório com o código

## 🚀 Passos para Deploy

### 1. Preparar Repositório

```bash
# Adicionar arquivos criados ao Git
git add backend/api/
git add backend/vercel.json
git add backend/.env.vercel.example
git add backend/package.json
git commit -m "Adaptar backend para Vercel"
git push origin main
```

### 2. Configurar Projeto no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe o repositório Git
4. Configure as variáveis de ambiente:

### 3. Variáveis de Ambiente

No painel do Vercel > Settings > Environment Variables, adicione:

```bash
# Database
MONGO_USER=seu_usuario_mongodb
MONGO_PASS=sua_senha_mongodb  
MONGO_HOST=seu_cluster.mongodb.net
MONGO_DB=controle-financeiro

# JWT
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui
JWT_EXPIRE=7d

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_app_password
EMAIL_FROM=Controle Financeiro <seu_email@gmail.com>

# Security
NODE_ENV=production
FRONTEND_URL=https://seu-frontend.vercel.app
```

### 4. Configurações de Deploy

- **Root Directory**: `backend`
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `.` (padrão)
- **Node.js Version**: `18.x` ou superior

### 5. Deploy Automático

Após configurar, o Vercel fará deploy automático:
- A cada `git push` na branch `main`
- URLs disponíveis em:
  - **Produção**: `https://seu-projeto.vercel.app`
  - **Preview**: `https://seu-branch-abc123.vercel.app`

## 📁 Estrutura Criada

```
backend/
├── api/
│   ├── index.js          # Handler principal
│   ├── auth.js           # Handler de autenticação
│   ├── dashboard.js      # Handler do dashboard
│   ├── crud.js           # Handler genérico CRUD
│   └── lib/
│       ├── mongodb.js    # Conexão com cache
│       └── middleware.js # Middleware otimizado
├── vercel.json          # Configurações do Vercel
├── .env.vercel.example  # Exemplo de variáveis
└── package.json         # Scripts atualizados
```

## 🔧 Funcionalidades

### Serverless Functions
- **Index**: Rota principal e health checks
- **Auth**: Login, registro, recuperação de senha
- **Dashboard**: Métricas e relatórios
- **CRUD**: Operações para todas as entidades

### Performance
- **Cache de conexão MongoDB**
- **Rate limiting otimizado**
- **Memory allocation ajustada**
- **Timeout configurado por função**

### Segurança
- **CORS configurado**
- **Security headers**
- **Rate limiting específico**
- **Variáveis de ambiente seguras**

## 🧪 Testes

### Health Check
```bash
curl https://seu-projeto.vercel.app/health
```

### API Test
```bash
curl https://seu-projeto.vercel.app/api/
```

## 📊 Monitoramento

### Logs Vercel
- Acesse: `vercel.com > seu-projeto > Functions`
- Logs em tempo real
- Métricas de performance

### MongoDB Atlas
- Monitoramento de queries
- Performance insights
- Alertas configuráveis

## 🔄 Atualizações

### Desenvolvimento Local
```bash
cd backend
npm run dev
```

### Deploy de Atualizações
```bash
git add .
git commit -m "Atualização"
git push origin main
# Deploy automático no Vercel
```

## ⚠️ Considerações

1. **Cold Starts**: Primeira requisição pode ser mais lenta
2. **Timeout**: Funções limitadas a 10-15 segundos
3. **Memory**: Limite de 512MB-1GB por função
4. **Conexões**: MongoDB com pool reduzido para serverless

## 🆘 Suporte

- **Documentação Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **MongoDB Atlas**: [docs.mongodb.com/atlas](https://docs.mongodb.com/atlas)
- **Issues**: Abrir issue no repositório
