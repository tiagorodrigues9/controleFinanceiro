---
hide:
  - navigation
---

# Controle Financeiro

**Sistema completo de controle financeiro pessoal e empresarial.**

Construído com uma arquitetura moderna utilizando **React (TypeScript)**, **Node.js**, **Express** e **MongoDB**.

---

## :rocket: Visão Geral

O Controle Financeiro é uma aplicação full-stack projetada para oferecer controle total sobre suas finanças. Desde contas a pagar até gastos diários, o sistema fornece uma visão unificada e em tempo real da sua saúde financeira.

<div class="grid cards" markdown>

-   :material-shield-lock:{ .lg .middle } **Autenticação Segura**

    ---

    Login e cadastro com fluxo moderno de Access Token e Refresh Token (JWT).

    [:octicons-arrow-right-24: Saiba mais](funcionalidades/autenticacao.md)

-   :material-file-document-multiple:{ .lg .middle } **Contas a Pagar/Receber**

    ---

    Filtros avançados, parcelamentos e controle por fornecedores e formas de pagamento.

    [:octicons-arrow-right-24: Saiba mais](funcionalidades/contas.md)

-   :material-cash-register:{ .lg .middle } **Gastos Diários**

    ---

    Registro de gastos com upload de anexos e categorização por Grupos e Subgrupos.

    [:octicons-arrow-right-24: Saiba mais](funcionalidades/gastos-diarios.md)

-   :material-bank:{ .lg .middle } **Extrato Bancário**

    ---

    Visão unificada com sistema de estorno inteligente que atualiza saldo e faturas.

    [:octicons-arrow-right-24: Saiba mais](funcionalidades/extrato.md)

-   :material-credit-card:{ .lg .middle } **Cartões e Faturas**

    ---

    Gestão completa de cartões de crédito, faturas mensais e controle de limites.

    [:octicons-arrow-right-24: Saiba mais](funcionalidades/cartoes-faturas.md)

-   :material-chart-line:{ .lg .middle } **Dashboard em Tempo Real**

    ---

    Gráficos e métricas com atualização instantânea via WebSockets.

    [:octicons-arrow-right-24: Saiba mais](funcionalidades/dashboard.md)

</div>

---

## :wrench: Tecnologias

### Backend

| Tecnologia | Função |
|---|---|
| **Node.js + Express** | Servidor HTTP e API RESTful |
| **MongoDB + Mongoose** | Banco de dados NoSQL |
| **JWT** | Autenticação com Access & Refresh Tokens |
| **Socket.io** | Notificações em tempo real |
| **node-cron** | Automação de tarefas agendadas |
| **PDFKit & ExcelJS** | Geração de relatórios |
| **Swagger UI** | Documentação interativa da API |
| **Winston** | Logging estruturado |
| **Helmet** | Headers de segurança HTTP |

### Frontend

| Tecnologia | Função |
|---|---|
| **React + TypeScript** | Interface com tipagem forte |
| **Material-UI (MUI)** | Design System responsivo |
| **Axios** | Cliente HTTP com interceptores de Refresh Token |
| **React Router** | Navegação SPA |
| **Recharts** | Gráficos e visualizações |
| **Workbox** | Suporte a PWA (Progressive Web App) |

---

## :link: Links Rápidos

- [Guia de Início Rápido](guia-inicio-rapido.md) — Suba o projeto em minutos.
- [Arquitetura do Sistema](arquitetura.md) — Entenda como as peças se encaixam.
- [Documentação da API](api/visao-geral.md) — Referência completa dos endpoints.
- [Changelog](changelog.md) — Histórico de mudanças do projeto.
