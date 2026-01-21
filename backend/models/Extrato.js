const mongoose = require('mongoose');

const extratoSchema = new mongoose.Schema({
  contaBancaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContaBancaria',
    required: true
  },
  cartao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cartao'
  },
  tipo: {
    type: String,
    enum: ['Entrada', 'Saída', 'Saldo Inicial'],
    required: true
  },
  valor: {
    type: Number,
    required: true,
    set: v => {
      const parsed = parseFloat(v);
      if (isNaN(parsed)) return 0;
      return parseFloat(parsed.toFixed(2));
    }
  },
  data: {
    type: Date,
    required: true,
    default: Date.now
  },
  motivo: {
    type: String,
    required: true,
    trim: true
  },
  referencia: {
    tipo: {
      type: String,
      enum: ['Conta', 'Gasto', 'Lancamento', 'Saldo Inicial', 'Transferencia']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  estornado: {
    type: Boolean,
    default: false
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices para performance
extratoSchema.index({ usuario: 1, contaBancaria: 1, data: 1 });
extratoSchema.index({ usuario: 1, tipo: 1, data: 1 });
extratoSchema.index({ contaBancaria: 1, estornado: 1, data: 1 });
extratoSchema.index({ 'referencia.tipo': 1, 'referencia.id': 1 });

module.exports = mongoose.model('Extrato', extratoSchema);

