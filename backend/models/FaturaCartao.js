const mongoose = require('mongoose');

const faturaCartaoSchema = new mongoose.Schema({
  cartao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cartao',
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mesReferencia: {
    type: String,
    required: true,
    // Formato: "YYYY-MM" (ex: "2024-04")
  },
  dataVencimento: {
    type: Date,
    required: true
  },
  dataFechamento: {
    type: Date,
    required: true
  },
  valorTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  valorPago: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['Aberta', 'Fechada', 'Paga'],
    default: 'Aberta'
  },
  despesas: [{
    conta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conta'
    },
    valor: {
      type: Number,
      required: true,
      min: 0
    },
    data: {
      type: Date,
      required: true
    },
    descricao: {
      type: String,
      required: true
    }
  }],
  dataPagamento: {
    type: Date
  },
  contaBancariaPagamento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContaBancaria'
  }
}, {
  timestamps: true
});

// Índices para melhor performance
faturaCartaoSchema.index({ cartao: 1, mesReferencia: 1 }, { unique: true });
faturaCartaoSchema.index({ usuario: 1, mesReferencia: 1 });
faturaCartaoSchema.index({ status: 1 });
faturaCartaoSchema.index({ dataVencimento: 1 });

// Método para adicionar despesa à fatura
faturaCartaoSchema.methods.adicionarDespesa = function(contaId, valor, data, descricao) {
  this.despesas.push({
    conta: contaId,
    valor: valor,
    data: data,
    descricao: descricao
  });
  this.valorTotal += valor;
  return this.save();
};

// Método para fechar fatura
faturaCartaoSchema.methods.fecharFatura = function() {
  this.status = 'Fechada';
  // Calcular data de vencimento (próximo mês)
  const proximoMes = new Date(this.dataVencimento);
  proximoMes.setMonth(proximoMes.getMonth() + 1);
  this.dataVencimento = proximoMes;
  return this.save();
};

// Método para pagar fatura
faturaCartaoSchema.methods.pagarFatura = function(contaBancariaId) {
  this.status = 'Paga';
  this.dataPagamento = new Date();
  this.contaBancariaPagamento = contaBancariaId;
  this.valorPago = this.valorTotal;
  return this.save();
};

module.exports = mongoose.model('FaturaCartao', faturaCartaoSchema);
