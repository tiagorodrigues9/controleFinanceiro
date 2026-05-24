# Controle Financeiro

Sistema completo de controle financeiro pessoal e empresarial. Construído com uma arquitetura moderna utilizando React (TypeScript), Node.js, Express, e MongoDB.

## 🚀 Tecnologias

### Backend
- **Node.js + Express** (Servidor HTTP e API RESTful)
- **MongoDB + Mongoose** (Banco de dados NoSQL)
- **JWT (jsonwebtoken)** (Autenticação baseada em tokens com Access & Refresh Tokens)
- **Socket.io** (Notificações em tempo real bidirecionais)
- **node-cron** (Automação e tarefas agendadas - ex: contas recorrentes)
- **PDFKit & ExcelJS** (Geração e exportação de relatórios nativos)
- **Swagger UI** (Documentação interativa da API)
- **Winston** (Logging estruturado)

### Frontend
- **React + TypeScript** (Tipagem forte e componentização)
- **Material-UI (MUI)** (Design System moderno e responsivo)
- **Axios** (Cliente HTTP com interceptores avançados de Refresh Token)
- **React Router** (Navegação SPA)

---

## 🎯 Funcionalidades Principais

- ✅ **Autenticação Segura:** Login/Cadastro com fluxo moderno de Access Token (curta duração) e Refresh Token (longa duração).
- ✅ **Contas a Pagar e Receber:** Filtros avançados, parcelamentos e associação por formas de pagamento e fornecedores.
- ✅ **Contas Recorrentes:** Automação de contas (mensais, anuais, semanais) geradas automaticamente por Cron Job.
- ✅ **Orçamento Mensal:** Definição de limites de gastos mensais globais e categorizados (por grupo).
- ✅ **Gastos Diários:** Registro com upload de anexos e categorização por Grupos/Subgrupos.
- ✅ **Extrato Bancário:** Visão unificada com sistema de estorno inteligente que atualiza o saldo e volta as faturas originais.
- ✅ **Dashboard Realtime:** Gráficos e métricas. WebSockets embutidos atualizam dados imediatamente se houver um novo gasto lançado em outro dispositivo.
- ✅ **Exportação:** Geração de relatórios de Extratos e Contas nos formatos **PDF** e **Excel (.xlsx)**.

---

## 📦 Inicialização Rápida (Docker)

O projeto está totalmente "Dockerizado" para facilitar a inicialização. Requer o [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados.

1. **Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/controleFinanceiro.git
cd controleFinanceiro
```

2. **Inicie os containers:**
```bash
docker-compose up -d --build
```

O ambiente será exposto nas seguintes portas:
- **Frontend (Web):** `http://localhost:80`
- **Backend (API):** `http://localhost:5000`
- **Swagger Docs:** `http://localhost:5000/api-docs`

---

## 🛠 Desenvolvimento Manual

Caso não deseje utilizar o Docker, você pode rodar os servidores separadamente:

### 1. Backend (Terminal 1)
Certifique-se de ter um MongoDB local ou remoto e configure as variáveis de ambiente em um arquivo `.env` (baseie-se no `server.js`).
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend (Terminal 2)
```bash
cd frontend
npm install
npm start
```
Acesse o app via `http://localhost:3000`.

---

## 🚀 CI / CD (GitHub Actions)

Este repositório possui fluxos de **Continuous Integration (CI)**.
Sempre que um push ou PR for feito para a branch `main`, o GitHub Actions irá:
1. Instalar as dependências de backend e frontend.
2. Rodar o Linter do Backend (`npm run lint`).
3. Fazer o Build do Frontend (`npm run build`).
4. Relatar falhas antes de qualquer merge.

---

## 📝 Documentação da API

A documentação interativa da API foi gerada com Swagger.
Quando o backend estiver rodando, acesse:
[http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
