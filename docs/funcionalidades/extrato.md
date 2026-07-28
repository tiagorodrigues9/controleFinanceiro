# Extrato Bancário

O módulo de Extrato oferece uma visão consolidada de todas as movimentações financeiras das suas contas bancárias.

---

## O que aparece no Extrato?

O extrato não é composto por registros manuais diretos, mas sim pela agregação automática de:

- **Contas Pagas** associadas àquela conta bancária (Saídas).
- **Contas Recebidas** (Entradas).
- **Gastos Diários** vinculados à conta bancária (Saídas).
- **Transferências** realizadas de/para a conta bancária (Entradas/Saídas).
- Pagamento de **Faturas de Cartão** (Saídas).

Dessa forma, o extrato reflete a realidade das transações da sua conta bancária física.

---

## Funcionalidades

- **Múltiplas Contas Bancárias**: Você pode gerenciar várias contas (ex: Nubank, Itaú, Caixa) e ver o extrato individual de cada uma.
- **Filtro Mensal**: O extrato é visualizado mensalmente, mostrando entradas, saídas e o saldo final do período.
- **Saldo Atual**: O sistema calcula o saldo total com base no balanço inicial da conta mais/menos todas as transações efetivadas até a data atual.

---

## Estorno Inteligente

Se um gasto, conta ou pagamento de fatura foi lançado errado e já está constando no extrato, você pode realizar a ação de **Estorno**.

O processo de estorno é inteligente:
1. Localiza a transação original (o pagamento da conta, ou o lançamento do gasto).
2. Se for uma Conta, ela volta para o status "Pendente" com o saldo em aberto novamente.
3. Se for pagamento de Fatura, a fatura volta para "Aberta" e as transações voltam à fatura original.
4. O saldo da conta bancária é recalculado imediatamente.
