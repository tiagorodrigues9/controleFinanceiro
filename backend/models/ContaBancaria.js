const mongoose = require('mongoose');

const contaBancariaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  banco: {
    type: String,
    required: true,
    trim: true
  },
  numeroConta: {
    type: String,
    trim: true
  },
  agencia: {
    type: String,
    trim: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
 ,
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ContaBancaria', contaBancariaSchema);

