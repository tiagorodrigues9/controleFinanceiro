const mongoose = require('mongoose');

const notificacaoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo: {
    type: String,
    enum: ['conta_vencida', 'conta_proxima_vencimento', 'limite_cartao', 'outro'],
    required: true
  },
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  mensagem: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: Date,
    default: Date.now
  },
  lida: {
    type: Boolean,
    default: false
  },
  referencia: {
    tipo: { type: String, enum: ['Conta', 'Cartao', 'Gasto'] },
    id: { type: mongoose.Schema.Types.ObjectId }
  }
}, { timestamps: true });

module.exports = mongoose.model('Notificacao', notificacaoSchema);
