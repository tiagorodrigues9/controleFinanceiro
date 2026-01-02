const mongoose = require('mongoose');

const gastoSchema = new mongoose.Schema({
  tipoDespesa: {
    grupo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grupo',
      required: true
    },
    subgrupo: {
      type: String,
      required: true
    }
  },
  valor: {
    type: Number,
    required: true,
    min: 0
  },
  data: {
    type: Date,
    required: true,
    default: Date.now
  },
  local: {
    type: String,
    trim: true
  },
  observacao: {
    type: String,
    trim: true
  },
  formaPagamento: {
    type: String,
    required: true,
    trim: true
  },
  cartao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cartao',
    required: false
  },
  contaBancaria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContaBancaria',
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Gasto', gastoSchema);

