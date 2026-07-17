const mongoose = require('mongoose');

const fornecedorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    required: false,
    trim: true,
    default: 'Geral'
  },
  documento: {
    type: String,
    trim: true
  },
  telefone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  endereco: {
    type: String,
    trim: true
  },
  observacoes: {
    type: String,
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

module.exports = mongoose.model('Fornecedor', fornecedorSchema);

