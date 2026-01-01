const mongoose = require('mongoose');

// Schema para salvar e-mails quando SMTP falha
const EmailLogSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true
  },
  text: String,
  from: String,
  status: {
    type: String,
    enum: ['sent', 'failed', 'simulated'],
    default: 'simulated'
  },
  provider: {
    type: String,
    default: 'Fallback'
  },
  messageId: String,
  error: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para consulta rápida
EmailLogSchema.index({ to: 1, createdAt: -1 });
EmailLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', EmailLogSchema);
