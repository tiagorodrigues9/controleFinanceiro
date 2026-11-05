# Endpoints Principais

Abaixo estão as principais categorias de endpoints disponíveis na API REST. Para a documentação interativa completa (com esquemas de payload), utilize a rota do **Swagger** (`/api-docs`).

---

## Autenticação (`/api/auth`)

| Método | Rota | Descrição | Protegida |
|---|---|---|:---:|
| `POST` | `/login` | Autentica o usuário e retorna os tokens | Não |
| `POST` | `/register` | Registra um novo usuário | Não |
| `POST` | `/refresh-token` | Gera um novo Access Token via Refresh Token | Não |
| `POST` | `/forgot-password` | Envia e-mail com token de recuperação | Não |
| `POST` | `/reset-password/:token`| Redefine a senha | Não |

---

## Contas (`/api/contas`)

| Método | Rota | Descrição | Protegida |
|---|---|---|:---:|
| `POST` | `/` | Cria uma nova conta (pagar/receber) | Sim |
| `GET` | `/` | Lista contas (suporta filtros via query) | Sim |
| `GET` | `/:id` | Retorna detalhes de uma conta | Sim |
| `PUT` | `/:id` | Atualiza uma conta existente | Sim |
| `DELETE`| `/:id` | Remove uma conta | Sim |
| `PATCH` | `/:id/status`| Atualiza o status (Pendente/Pago/Cancelada) | Sim |

---

## Gastos Diários (`/api/gastos`)

| Método | Rota | Descrição | Protegida |
|---|---|---|:---:|
| `POST` | `/` | Registra um novo gasto | Sim |
| `GET` | `/` | Lista gastos diários | Sim |
| `PUT` | `/:id` | Atualiza o gasto e o recategoriza se necessário| Sim |
| `DELETE`| `/:id` | Remove o gasto e recalcula saldos | Sim |

---

## Extrato Bancário (`/api/extrato`)

| Método | Rota | Descrição | Protegida |
|---|---|---|:---:|
| `GET` | `/` | Retorna o extrato consolidado (entradas/saídas)| Sim |
| `POST` | `/estorno` | Solicita o estorno inteligente de uma transação| Sim |

---

## Dashboard (`/api/dashboard`)

| Método | Rota | Descrição | Protegida |
|---|---|---|:---:|
| `GET` | `/resumo` | Retorna KPIs, totais de receitas x despesas | Sim |
| `GET` | `/despesas-categoria` | Dados para o gráfico de pizza (gastos/grupo)| Sim |

---

## Cartões e Faturas (`/api/cartoes` | `/api/fatura-cartao`)

| Método | Rota | Descrição | Protegida |
|---|---|---|:---:|
| `POST` | `/cartoes` | Cadastra novo cartão de crédito | Sim |
| `GET` | `/fatura-cartao/:cartaoId`| Retorna faturas detalhadas do cartão | Sim |
| `POST` | `/fatura-cartao/pagar` | Registra o pagamento de uma fatura | Sim |

*(Existem mais endpoints e recursos como Fornecedores, Grupos, Contas Bancárias e Notificações que estão totalmente documentados no Swagger UI).*
