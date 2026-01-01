const mongoose = require('mongoose');

const cartaoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['Crédito', 'Débito']
  },
  banco: {
    type: String,
    required: true,
    trim: true
  },
  limite: {
    type: Number,
    min: 0
  },
  diaFatura: {
    type: Number,
    min: 1,
    max: 31
  },
  dataVencimento: {
    type: Date,
    required: false
  },
  ativo: {
    type: Boolean,
    default: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

cartaoSchema.index({ usuario: 1, ativo: 1 });
cartaoSchema.index({ usuario: 1, tipo: 1 });

module.exports = mongoose.model('Cartao', cartaoSchema);
