<div align="center">
  <h1 align="center">Controle Financeiro</h1>
  <p align="center">
    Sistema completo e moderno para controle financeiro pessoal e empresarial.
  </p>

  <!-- Badges -->
  <p align="center">
    <img src="https://img.shields.io/badge/React-18.x-blue?style=flat-square&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-18.x-green?style=flat-square&logo=nodedotjs" alt="Node.js" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Deploy-Vercel%20%7C%20Render-black?style=flat-square" alt="Deploy" />
  </p>
</div>

---

## 📖 Visão Geral

O **Controle Financeiro** é uma aplicação completa Full Stack desenvolvida para gerenciar finanças com facilidade. Ele permite o acompanhamento de contas a pagar, faturas de cartão de crédito, gastos diários e orçamentos, oferecendo gráficos detalhados em tempo real e exportação de relatórios nativos (PDF/Excel).

## 🔗 Links do Projeto

- **Aplicação Web (Frontend):** [https://controlefinanceiro-i7s6.onrender.com/](https://controlefinanceiro-i7s6.onrender.com/)
- **Documentação do Sistema (MkDocs):** [Acessar GitHub Pages](https://tiagorodrigues9.github.io/controleFinanceiro/)
- **Documentação da API (Swagger):** [https://controle-financeiro-backend1.vercel.app/api-docs](https://controle-financeiro-backend1.vercel.app/api-docs)

---

## 🚀 Tecnologias

O projeto adota uma arquitetura moderna dividida entre Frontend, Backend e Site Estático de Documentação.

### Frontend (Render)
- **React + TypeScript** (Tipagem forte e componentização usando Create React App)
- **Material-UI (MUI)** (Design System moderno e responsivo)
- **Recharts** (Visualização de dados e gráficos)
- **Axios** (Cliente HTTP com interceptores avançados de Refresh Token)
- **Workbox** (Suporte PWA e cache offline)

### Backend (Vercel / Serverless)
- **Node.js + Express** (Servidor HTTP e API RESTful)
- **MongoDB + Mongoose** (Banco de dados NoSQL)
- **JWT** (Autenticação segura via Access Token de curta duração e Refresh Token)
- **Multer** (Upload de anexos com armazenamento local/nuvem)
- **PDFKit & ExcelJS** (Geração e exportação de relatórios)
- **Nodemailer** (Serviço de disparo de e-mails para recuperação de senha)

### Documentação (GitHub Pages)
- **Material for MkDocs** (Gerador de site estático)
- **Markdown** (Para toda a escrita técnica e guias de uso)

---

## 🎯 Funcionalidades Principais

- ✅ **Autenticação Segura:** Login, cadastro e recuperação de senha.
- ✅ **Dashboard Analytics:** Gráficos e métricas interativas com atualização rápida.
- ✅ **Contas e Gastos:** Registro de contas a pagar (recorrentes, parceladas) e gastos diários com categorização.
- ✅ **Gestão de Cartões:** Controle completo de faturas, datas de fechamento e limites.
- ✅ **Extrato Bancário:** Visão unificada com sistema inteligente de saldo e estornos.
- ✅ **Orçamento Mensal:** Definição de limites de gastos mensais globais e por grupo de despesa.
- ✅ **Exportação:** Geração de relatórios nos formatos **PDF** e **Excel (.xlsx)**.

---

## 📦 Como Rodar Localmente

Você pode iniciar o projeto localmente utilizando o Docker ou rodando os servidores manualmente.

### Opção 1: Via Docker (Recomendado)
Requer o [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados.

```bash
# Clone o repositório
git clone https://github.com/tiagorodrigues9/controleFinanceiro.git
cd controleFinanceiro

# Inicie os containers em background
docker-compose up -d --build
```
O ambiente estará disponível em `http://localhost:80` (Frontend) e `http://localhost:5000` (Backend).

### Opção 2: Desenvolvimento Manual

#### 1. Backend
Certifique-se de ter um MongoDB local ou remoto e configure as variáveis de ambiente em um arquivo `backend/.env`.
```bash
cd backend
npm install
npm run dev
```

#### 2. Frontend
Configure as variáveis em `frontend/.env` apontando para o seu backend local.
```bash
cd frontend
npm install
npm start
```
Acesse o app via `http://localhost:3000`.

---

## 📚 Documentação (MkDocs)

O projeto possui uma documentação rica e estruturada para desenvolvedores e usuários.
Para rodar a documentação localmente e visualizar as edições em tempo real:

```bash
# Requer Python instalado
pip install mkdocs-material mkdocs-git-revision-date-localized-plugin

# Inicia o servidor local de documentação
mkdocs serve
```
A documentação ficará acessível em `http://127.0.0.1:8000/`. Todo o deploy da documentação é feito de forma automatizada (CI/CD) para o GitHub Pages através do GitHub Actions.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
