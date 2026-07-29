const mongoose = require('mongoose');

const formaPagamentoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ativo: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índice composto para performance e unicidade por usuário
formaPagamentoSchema.index(
  { usuario: 1, nome: 1 },
  { unique: true, collation: { locale: 'pt', strength: 2 } }
);

module.exports = mongoose.model('FormaPagamento', formaPagamentoSchema);