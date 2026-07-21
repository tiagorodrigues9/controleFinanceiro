const mongoose = require('mongoose');

const subgrupoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  cor: {
    type: String,
    trim: true,
    default: '#6366f1' // Valor padrão caso não enviado (herdando visual padrão)
  },
  icone: {
    type: String,
    trim: true,
    default: 'Folder'
  }
});

const grupoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  cor: {
    type: String,
    trim: true,
    default: '#6366f1'
  },
  icone: {
    type: String,
    trim: true,
    default: 'Folder'
  },
  subgrupos: [subgrupoSchema],
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Grupo', grupoSchema);

