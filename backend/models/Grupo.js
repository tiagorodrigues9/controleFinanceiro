const mongoose = require('mongoose');

const subgrupoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  }
});

const grupoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
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

