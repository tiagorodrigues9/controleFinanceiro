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

/**
 * @swagger
 * tags:
 *   name: Exportação
 *   description: Exportação de dados em PDF e Excel
 */
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
/**
 * @swagger
 * /api/exportar/extrato:
 *   get:
 *     summary: Exportar extrato (PDF ou Excel)
 *     tags: [Exportação]
 *     parameters:
 *       - in: query
 *         name: formato
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['pdf', 'excel']
 *       - in: query
 *         name: contaBancaria
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: mes
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: ano
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno
 */
router.get('/extrato', async (req, res) => {
  try {
    const { formato = 'pdf', mes, ano, contaBancaria } = req.query;

    const query = { usuario: req.user._id, estornado: false }; // Fix: Ignorar estornados

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
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=extrato.pdf');

      doc.pipe(res);

      doc.fontSize(22).fillColor('#4f46e5').text('Extrato Financeiro', { align: 'center' });
      doc.moveDown();
      doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(2);

      if (extratos.length === 0) {
        doc.fontSize(12).fillColor('#64748b').text('Nenhum registro encontrado para o período selecionado.', { align: 'center' });
      } else {
        let totalReceitas = 0;
        let totalDespesas = 0;
        
        extratos.forEach(item => {
          if (item.tipo === 'Entrada' || item.tipo === 'Saldo Inicial') totalReceitas += item.valor;
          else totalDespesas += item.valor;
          
          const cor = (item.tipo === 'Entrada' || item.tipo === 'Saldo Inicial') ? '#10b981' : '#ef4444';
          const contaNome = item.contaBancaria ? item.contaBancaria.nome : '-';
          
          doc.fontSize(10).fillColor('#64748b').text(`${formatarData(item.data)} | Conta: ${contaNome} | Tipo: ${item.tipo}`);
          doc.fontSize(12).fillColor('#1e293b').text(`${item.motivo}`);
          doc.fontSize(14).fillColor(cor).text(`${(item.tipo === 'Entrada' || item.tipo === 'Saldo Inicial') ? '+' : '-'} ${formatarMoeda(item.valor)}`, { align: 'right' });
          
          doc.moveDown(0.5);
          doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#f1f5f9').stroke();
          doc.moveDown(0.5);
        });
        
        doc.moveDown(2);
        doc.fontSize(14).fillColor('#10b981').text(`Total de Entradas: ${formatarMoeda(totalReceitas)}`, { align: 'right' });
        doc.fontSize(14).fillColor('#ef4444').text(`Total de Saídas: ${formatarMoeda(totalDespesas)}`, { align: 'right' });
        doc.moveDown(0.5);
        const saldoCor = (totalReceitas - totalDespesas) >= 0 ? '#4f46e5' : '#ef4444';
        doc.fontSize(16).fillColor(saldoCor).text(`Saldo do Período: ${formatarMoeda(totalReceitas - totalDespesas)}`, { align: 'right' });
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
        { header: 'Valor (R$)', key: 'valor', width: 20 }
      ];

      // Header style
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      extratos.forEach((item, index) => {
        const row = worksheet.addRow({
          data: formatarData(item.data),
          tipo: item.tipo,
          motivo: item.motivo,
          conta: item.contaBancaria ? item.contaBancaria.nome : 'N/A',
          valor: item.valor
        });
        
        // Formatar valores numericos
        row.getCell('valor').numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
        
        // Cores de zebra nas linhas
        if (index % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
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
/**
 * @swagger
 * /api/exportar/contas:
 *   get:
 *     summary: Exportar contas a pagar (PDF ou Excel)
 *     tags: [Exportação]
 *     parameters:
 *       - in: query
 *         name: formato
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['pdf', 'excel']
 *       - in: query
 *         name: mes
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: ano
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno
 */
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
