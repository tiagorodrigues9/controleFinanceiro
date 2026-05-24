const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');
const Extrato = require('../models/Extrato');
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Aplica autenticação em todas as rotas
router.use(auth);

// Helper para formatar moeda
const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

// Helper para formatar data
const formatarData = (dataStr) => {
  return new Date(dataStr).toLocaleDateString('pt-BR');
};

// @route   GET /api/exportar/extrato
// @desc    Exportar extrato em PDF ou Excel
// @access  Private
router.get('/extrato', async (req, res) => {
  try {
    const { formato = 'pdf', mes, ano, contaBancaria } = req.query;

    const query = { usuario: req.user._id };

    if (contaBancaria) {
      query.contaBancaria = contaBancaria;
    }

    if (mes && ano) {
      const startDate = new Date(ano, mes - 1, 1);
      const endDate = new Date(ano, mes, 0, 23, 59, 59);
      query.data = { $gte: startDate, $lte: endDate };
    }

    const extratos = await Extrato.find(query).sort({ data: -1 }).populate('contaBancaria', 'nome');

    if (formato === 'pdf') {
      const doc = new PDFDocument({ margin: 30 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=extrato.pdf');

      doc.pipe(res);

      doc.fontSize(20).text('Relatório de Extrato', { align: 'center' });
      doc.moveDown();

      if (extratos.length === 0) {
        doc.fontSize(12).text('Nenhum registro encontrado para o período selecionado.');
      } else {
        extratos.forEach(item => {
          const cor = item.tipo === 'Entrada' ? 'green' : 'red';
          const contaNome = item.contaBancaria ? item.contaBancaria.nome : 'Desconhecida';
          
          doc.fontSize(12).fillColor('black').text(`Data: ${formatarData(item.data)} | Conta: ${contaNome}`);
          doc.fontSize(12).fillColor('black').text(`Motivo: ${item.motivo}`);
          doc.fontSize(14).fillColor(cor).text(`${item.tipo}: ${formatarMoeda(item.valor)}`);
          doc.moveDown();
        });
      }

      doc.end();
    } else if (formato === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Extrato');

      worksheet.columns = [
        { header: 'Data', key: 'data', width: 15 },
        { header: 'Tipo', key: 'tipo', width: 15 },
        { header: 'Motivo', key: 'motivo', width: 40 },
        { header: 'Conta', key: 'conta', width: 25 },
        { header: 'Valor', key: 'valor', width: 15 }
      ];

      extratos.forEach(item => {
        worksheet.addRow({
          data: formatarData(item.data),
          tipo: item.tipo,
          motivo: item.motivo,
          conta: item.contaBancaria ? item.contaBancaria.nome : 'Desconhecida',
          valor: item.valor
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=extrato.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ message: 'Formato inválido. Use "pdf" ou "excel".' });
    }
  } catch (error) {
    logger.error('Erro ao exportar extrato:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório' });
  }
});

// @route   GET /api/exportar/contas
// @desc    Exportar contas a pagar/receber em PDF ou Excel
// @access  Private
router.get('/contas', async (req, res) => {
  try {
    const { formato = 'pdf', status } = req.query;

    const query = { usuario: req.user._id };
    if (status) query.status = status;

    const contas = await Conta.find(query)
      .sort({ dataVencimento: 1 })
      .populate('fornecedor', 'nome');

    if (formato === 'pdf') {
      const doc = new PDFDocument({ margin: 30 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=contas.pdf');

      doc.pipe(res);

      doc.fontSize(20).text('Relatório de Contas', { align: 'center' });
      doc.moveDown();

      if (contas.length === 0) {
        doc.fontSize(12).text('Nenhum registro encontrado.');
      } else {
        contas.forEach(item => {
          const fornecedorNome = item.fornecedor ? item.fornecedor.nome : 'Não informado';
          
          doc.fontSize(12).fillColor('black').text(`Vencimento: ${formatarData(item.dataVencimento)}`);
          doc.fontSize(12).fillColor('black').text(`Nome: ${item.nome} | Fornecedor: ${fornecedorNome}`);
          doc.fontSize(14).fillColor(item.status === 'Pago' ? 'green' : 'red').text(`Status: ${item.status} | Valor: ${formatarMoeda(item.valor)}`);
          doc.moveDown();
        });
      }

      doc.end();
    } else if (formato === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Contas');

      worksheet.columns = [
        { header: 'Vencimento', key: 'vencimento', width: 15 },
        { header: 'Nome', key: 'nome', width: 40 },
        { header: 'Fornecedor', key: 'fornecedor', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Valor', key: 'valor', width: 15 }
      ];

      contas.forEach(item => {
        worksheet.addRow({
          vencimento: formatarData(item.dataVencimento),
          nome: item.nome,
          fornecedor: item.fornecedor ? item.fornecedor.nome : 'Não informado',
          status: item.status,
          valor: item.valor
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=contas.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ message: 'Formato inválido. Use "pdf" ou "excel".' });
    }
  } catch (error) {
    logger.error('Erro ao exportar contas:', error);
    res.status(500).json({ message: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
