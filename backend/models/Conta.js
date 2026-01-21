const mongoose = require('mongoose');

const contaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  dataVencimento: {
    type: Date,
    required: true
  },
  valor: {
    type: Number,
    required: true,
    min: 0,
    set: v => {
      const parsed = parseFloat(v);
      if (isNaN(parsed)) return 0;
      return parseFloat(parsed.toFixed(2));
    }
  },
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: true
  },
  observacao: {
    type: String,
    trim: true
  },
  anexo: {
    type: String
  },
  status: {
    type: String,
    enum: ['Pendente', 'Pago', 'Vencida', 'Cancelada'],
    default: 'Pendente'
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parcelaAtual: {
    type: Number
  },
  totalParcelas: {
    type: Number
  },
  parcelaId: {
    type: String 
  },
  dataPagamento: {
    type: Date
  },
  formaPagamento: {
    type: String,
    trim: true
  },
  cartao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cartao',
    required: false
  },
  contaBancaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContaBancaria'
  },
  jurosPago: {
    type: Number,
    default: 0
  },
  tipoControle: {
    type: String,
    trim: true
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para performance
contaSchema.index({ usuario: 1, dataVencimento: 1, status: 1 });
contaSchema.index({ usuario: 1, status: 1, ativo: 1 });
contaSchema.index({ fornecedor: 1, usuario: 1 });
contaSchema.index({ dataVencimento: 1, status: 1 });

contaSchema.pre('save', function(next) {
  if (this.status === 'Pendente' && this.dataVencimento < new Date()) {
    this.status = 'Vencida';
  }
  next();
});

module.exports = mongoose.model('Conta', contaSchema);

