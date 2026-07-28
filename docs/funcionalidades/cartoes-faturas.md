# Cartões de Crédito e Faturas

O módulo de Cartões permite a gestão de compras feitas na função crédito e o acompanhamento das faturas mensais.

---

## Gerenciamento de Cartões

Você pode cadastrar múltiplos cartões de crédito. Cada cartão requer as seguintes configurações:

- **Nome** (ex: "Nubank Ultravioleta").
- **Limite de Crédito**.
- **Dia de Fechamento**: O dia em que a fatura fecha (compras a partir dessa data caem na fatura do próximo mês).
- **Dia de Vencimento**: O dia de pagar a fatura.
- **Conta Bancária Padrão** (Opcional): Conta de onde normalmente sai o dinheiro para pagar este cartão.

---

## Funcionamento das Faturas

1. **Lançamento de Despesas**: Ao registrar uma Conta ou Gasto e selecionar como Forma de Pagamento "Cartão de Crédito", o sistema pedirá para você escolher qual cartão usou.
2. **Alocação na Fatura Correta**: Com base na data da compra e no *Dia de Fechamento* do cartão, o sistema decide em qual mês (fatura) a despesa deve entrar.
3. **Compras Parceladas**: Se você registrar uma Conta com 5 parcelas no cartão de crédito, o sistema distribuirá automaticamente 1 parcela em cada uma das 5 próximas faturas daquele cartão.
4. **Fechamento de Fatura**: A fatura agrupa todas as compras daquele período.
5. **Pagamento da Fatura**: Ao pagar a fatura, o sistema gera uma transação de saída (pagamento) no seu Extrato Bancário e marca aquela fatura como "Paga". A partir desse momento, o limite do cartão é restabelecido (aberto) pelo valor pago.

---

## Limite em Tempo Real

O sistema acompanha o limite disponível. Se você tem 5000 de limite e tem compras (entre faturas abertas e futuras parcelas) somando 2000, o sistema indicará seu Limite Disponível como 3000.
