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
      required: false
    }
  },
  valor: {
    type: Number,
    required: true,
    min: 0,
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

// Índices para performance
gastoSchema.index({ usuario: 1, data: 1, 'tipoDespesa.grupo': 1 });
gastoSchema.index({ usuario: 1, contaBancaria: 1, data: 1 });
gastoSchema.index({ usuario: 1, cartao: 1, data: 1 });
gastoSchema.index({ 'tipoDespesa.grupo': 1, data: 1 });

module.exports = mongoose.model('Gasto', gastoSchema);

