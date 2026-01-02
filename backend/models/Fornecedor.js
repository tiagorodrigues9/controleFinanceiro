const mongoose = require('mongoose');

const fornecedorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    required: false, // Tipo não é mais obrigatório
    trim: true,
    default: 'Geral' // Valor padrão
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

module.exports = mongoose.model('Fornecedor', fornecedorSchema);

