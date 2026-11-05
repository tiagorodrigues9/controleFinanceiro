# Dashboard

O Dashboard é a sua central de informações. Ele consolida os dados de todos os módulos (Contas, Gastos, Cartões, Extrato, Orçamentos) para dar um overview da sua situação financeira.

---

## Tempo Real (Realtime)

Graças ao uso de **WebSockets (Socket.io)**, o Dashboard é atualizado em tempo real. Se você ou outra pessoa com acesso à mesma conta registrar um gasto pelo celular, o gráfico no computador aberto no Dashboard será atualizado instantaneamente, sem precisar recarregar a página.

---

## Componentes do Dashboard

### 1. Resumo de Saldos
Exibe cartões com o resumo do saldo atual (baseado nas suas contas bancárias), receitas previstas para o mês, despesas previstas e o balanço do mês.

### 2. Gráfico de Receitas x Despesas
Um gráfico de barras ou linhas mostrando a comparação entre o que entrou e o que saiu ao longo dos meses do ano.

### 3. Distribuição de Gastos
Gráfico de pizza mostrando em quais Grupos (categorias) o seu dinheiro foi gasto no mês corrente. Útil para identificar os vilões do orçamento (ex: 40% em Alimentação, 20% em Transporte).

### 4. Próximos Vencimentos
Uma lista rápida mostrando as contas a pagar que vencem nos próximos dias.

### 5. Faturas de Cartão
Resumo rápido de quanto está a sua próxima fatura de cada cartão de crédito cadastrado.
