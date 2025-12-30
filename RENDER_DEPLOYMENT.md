# Render Deployment Guide

## 1. Preparação

### Criar repositório no GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/controle-financeiro.git
git push -u origin main
```

### Variáveis de Ambiente necessárias

Copie o arquivo `.env.example` para `.env` e preencha:

```bash
NODE_ENV=production
PORT=5000
MONGO_USER=seu_usuario_mongo
MONGO_PASS=sua_senha_mongo
MONGO_HOST=seu_cluster.mongodb.net
MONGO_DB=controle-financeiro
JWT_SECRET=gere-com-openssl-rand-hex-32
REACT_APP_API_URL=https://seu-app.onrender.com/api
RENDER=true
```

**Gerar JWT_SECRET seguro:**
```bash
# macOS/Linux
openssl rand -hex 32

# Windows (PowerShell)
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## 2. MongoDB Atlas Setup

1. Crie conta em [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster (free tier M0)
3. Crie um usuário (Database Access → Add New User)
4. Configure IP Whitelist (Network Access → Allow Access from Anywhere para desenvolvimento)
5. Copie a connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/controle-financeiro?retryWrites=true&w=majority
   ```

## 3. Deploy no Render

### Opção A: Docker (Recomendado)
1. Acesse https://render.com
2. Clique em "New +" → "Web Service"
3. Selecione seu repositório GitHub
4. Configure:
   - **Name**: controle-financeiro
   - **Runtime**: Docker
   - **Region**: Virginia (US East)
   - **Plan**: Free (opcionalmente upgrade)
5. Clique em "Advanced" e adicione variáveis de ambiente:
   - NODE_ENV: production
   - PORT: 5000
   - MONGO_USER: seu_usuario
   - MONGO_PASS: sua_senha
   - MONGO_HOST: cluster.mongodb.net
   - MONGO_DB: controle-financeiro
   - JWT_SECRET: <gere conforme acima>
   - REACT_APP_API_URL: https://controle-financeiro.onrender.com/api
   - RENDER: true

6. Clique em "Create Web Service"

### Opção B: Node.js Native
1. Clique em "New +" → "Web Service"
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: controle-financeiro
   - **Runtime**: Node
   - **Build Command**: `npm install` (cuidado com workspaces)
   - **Start Command**: `cd backend && npm start`
4. Adicione variáveis de ambiente (igual acima)
5. Crie

## 4. Pós-Deploy

### Verificar saúde da aplicação
- Acesse https://seu-app.onrender.com
- Verifique logs em Render Dashboard → Logs

### Troubleshooting

**App não inicia:**
- Verifique variáveis de ambiente (typos comuns: `MONGO_HOST` vs `MONGO_HOSTNAME`)
- Verifique IP Whitelist no MongoDB Atlas (127.0.0.1 não funciona em produção)
- Verifique BUILD_CMD e START_CMD no Render

**Conexão MongoDB recusada:**
- Confirme credenciais do MongoDB no .env
- Verifique se IP do Render está na Whitelist (Network Access → 0.0.0.0/0 para teste)

**App entra em sleep:**
- O Render coloca apps inativos em sleep após 15 minutos
- Solução: O sistema já inclui `keep-alive.js` que faz ping a cada 12 minutos
- Verifique se `RENDER=true` está configurado

## 5. Atualizar Deploy

Após fazer changes no código:
```bash
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

Render fará deploy automático quando detectar novo push em `main`.

## 6. Monitoramento

### Logs em tempo real
```bash
# Se tiver CLI do Render instalado
render log --service-id=seu_service_id

# Ou no Dashboard: Logs tab
```

### Performance
- Monitorar uso de memória (Free tier: 512MB)
- Se necessário, upgrade para plano pago
- Considerar add-on de database (PostgreSQL/MongoDB)

## 7. Backup de Dados

Recomendações:
- MongoDB Atlas: configure backup automático
- Exporte dados periodicamente:
  ```bash
  mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/controle-financeiro"
  ```

---

**Suporte:**
- Render Docs: https://render.com/docs
- MongoDB Docs: https://docs.mongodb.com
