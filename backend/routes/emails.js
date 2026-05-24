const express = require('express');
const EmailLog = require('../models/EmailLog');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const { logger } = require('../utils/logger');

const router = express.Router();

// Listar e-mails salvos (só admin)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, to } = req.query;
    
    // Filtro
    const filter = {};
    if (status) filter.status = status;
    if (to) filter.to = new RegExp(to, 'i');
    
    const emails = await EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await EmailLog.countDocuments(filter);
    
    res.json({
      emails,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Erro ao listar e-mails:', error);
    res.status(500).json({ message: 'Erro ao listar e-mails' });
  }
});

// Estatísticas dos e-mails
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await EmailLog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const recent = await EmailLog.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    res.json({
      stats,
      recentCount: recent
    });
  } catch (error) {
    logger.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// Ver detalhes de um e-mail
router.get('/:id', auth, async (req, res) => {
  try {
    const email = await EmailLog.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({ message: 'E-mail não encontrado' });
    }
    
    res.json(email);
  } catch (error) {
    logger.error('Erro ao buscar e-mail:', error);
    res.status(500).json({ message: 'Erro ao buscar e-mail' });
  }
});


module.exports = router;
