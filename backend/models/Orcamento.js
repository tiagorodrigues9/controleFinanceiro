const mongoose = require('mongoose');

const orcamentoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mes: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  ano: {
    type: Number,
    required: true
  },
  valorLimiteGeral: {
    type: Number,
    required: true,
    default: 0
  },
  limitesPorGrupo: [{
    grupo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grupo',
      required: true
    },
    valorLimite: {
      type: Number,
      required: true,
      min: 0
    }
  }]
}, {
  timestamps: true
});

// Índice único para garantir que só exista um orçamento por mês/ano para o usuário
orcamentoSchema.index({ usuario: 1, mes: 1, ano: 1 }, { unique: true });

module.exports = mongoose.model('Orcamento', orcamentoSchema);
