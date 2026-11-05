const mongoose = require('mongoose');

const notificacaoProgramadaSchema = new mongoose.Schema({
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
  tipoFrequencia: {
    type: String,
    enum: ['diaria', 'dias_semana', 'data_especifica'],
    default: 'diaria',
    required: true
  },
  horario: {
    type: String,
    required: true,
    trim: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/ // Valida formato HH:mm (00:00 a 23:59)
  },
  diasSemana: {
    type: [Number], // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    default: [0, 1, 2, 3, 4, 5, 6]
  },
  dataEspecifica: {
    type: Date
  },
  ativo: {
    type: Boolean,
    default: true
  },
  urlDestino: {
    type: String,
    default: '/gastos-diarios',
    trim: true
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ultimaExecucao: {
    type: Date,
    default: null
  },
  historicoEnvios: [{
    data: {
      type: Date,
      default: Date.now
    },
    totalEnviados: {
      type: Number,
      default: 0
    },
    falhas: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

notificacaoProgramadaSchema.index({ ativo: 1, horario: 1 });

module.exports = mongoose.model('NotificacaoProgramada', notificacaoProgramadaSchema);

