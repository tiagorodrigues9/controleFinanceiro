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
    required: true
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
      enum: ['Conta', 'Gasto', 'Lancamento', 'Saldo Inicial']
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

module.exports = mongoose.model('Extrato', extratoSchema);

