# Contas a Pagar e Receber

O módulo de Contas é o coração do Controle Financeiro, permitindo registrar e gerenciar compromissos financeiros futuros e passados.

---

## Funcionalidades Principais

- **Registro de Contas**: Inclusão de novas contas detalhando nome, valor, data de vencimento, fornecedor e forma de pagamento.
- **Parcelamentos**: O sistema suporta dividir uma conta em múltiplas parcelas. As parcelas subsequentes são geradas automaticamente.
- **Contas Recorrentes**: Contas podem ser configuradas para se repetirem (Semanal, Mensal, Anual). Um processo em segundo plano (Cron Job) verifica diariamente e gera as novas instâncias de contas recorrentes antes do vencimento.
- **Filtros e Buscas**: As listas de contas podem ser filtradas por mês, ano, status, fornecedor, entre outros.
- **Vinculação de Cartão/Conta Bancária**: Se a forma de pagamento for cartão de crédito, a conta pode ser associada a um cartão específico (e consequentemente cair em sua fatura). Se for débito, transferência ou PIX, é possível vincular à conta bancária da qual o dinheiro sairá.

---

## Status das Contas

Uma conta pode assumir os seguintes status:

- **Pendente**: A conta está registrada, mas ainda não foi paga. O vencimento é futuro ou é hoje.
- **Pago**: A conta foi liquidada.
- **Vencida**: A data de vencimento passou e a conta continua não paga. (O sistema atualiza esse status automaticamente).
- **Cancelada**: A conta foi cancelada pelo usuário.

---

## Processo de Pagamento

Ao marcar uma conta como paga, você define:

1. **Data de Pagamento**: O dia em que a conta foi efetivamente paga.
2. **Valor Efetivo**: Quanto foi realmente pago (pode ser diferente do valor original se houver juros, multas ou descontos).

Quando a conta é paga, o sistema verifica a conta bancária ou cartão vinculado e o status geral para assegurar a consistência do extrato e dashboard.
