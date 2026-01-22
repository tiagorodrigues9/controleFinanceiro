const { connectDB } = require('./lib/mongodb');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Models
const Conta = require('../models/Conta');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');

module.exports = async (req, res) => {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Aplicar autenticação
  auth(req, res, async () => {
    try {
      await connectDB();
      
      console.log('=== TESTE API ===');
      console.log('User ID:', req.user._id);
      
      // Testar contas
      const totalContas = await Conta.countDocuments({ usuario: req.user._id });
      console.log('Total contas:', totalContas);
      
      // Testar extrato
      const totalExtrato = await Extrato.countDocuments({ usuario: req.user._id });
      console.log('Total extrato:', totalExtrato);
      
      // Testar contas bancárias
      const totalContasBancarias = await ContaBancaria.countDocuments({ usuario: req.user._id });
      console.log('Total contas bancárias:', totalContasBancarias);
      
      // Buscar algumas contas para verificar
      const contas = await Conta.find({ usuario: req.user._id }).limit(5).lean();
      console.log('Primeiras contas:', contas);
      
      // Buscar alguns extratos
      const extratos = await Extrato.find({ usuario: req.user._id }).limit(5).lean();
      console.log('Primeiros extratos:', extratos);
      
      // Buscar contas bancárias
      const contasBancarias = await ContaBancaria.find({ usuario: req.user._id }).lean();
      console.log('Contas bancárias:', contasBancarias);
      
      res.json({
        message: 'Teste API funcionando',
        user: req.user._id,
        totals: {
          contas: totalContas,
          extrato: totalExtrato,
          contasBancarias: totalContasBancarias
        },
        samples: {
          contas: contas,
          extratos: extratos,
          contasBancarias: contasBancarias
        }
      });
      
    } catch (error) {
      console.error('Erro no teste:', error);
      res.status(500).json({ 
        message: 'Erro no teste',
        error: error.message 
      });
    }
  });
};
