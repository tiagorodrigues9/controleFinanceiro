const mongoose = require('mongoose');

const formaPagamentoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FormaPagamento', formaPagamentoSchema);