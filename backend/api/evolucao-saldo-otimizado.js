const mongoose = require('mongoose');
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');

// Função OTIMIZADA para evolução do saldo usando aggregate
const getEvolucaoSaldoOtimizado = async (usuarioId, mesAtual, anoAtual) => {
  try {
    console.log('🔍 Calculando evolução do saldo (VERSÃO OTIMIZADA)...');
    
    // Gerar range de meses (últimos 6 meses)
    const monthsRange = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
      const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
      monthsRange.push(refEnd);
    }
    
    console.log(`📊 Analisando ${monthsRange.length} períodos`);
    
    // Buscar contas bancárias do usuário
    const contasBancarias = await ContaBancaria.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    if (contasBancarias.length === 0) {
      console.log('📭 Nenhuma conta bancária encontrada');
      return [];
    }
    
    // Para cada conta, usar aggregate para melhor performance
    const evolucaoSaldo = await Promise.all(
      contasBancarias.map(async (conta) => {
        // Usar aggregate para calcular saldos acumulados de forma mais eficiente
        const saldosPorPeriodo = await Promise.all(
          monthsRange.map(async (monthEnd) => {
            const resultado = await Extrato.aggregate([
              {
                $match: {
                  contaBancaria: conta._id,
                  usuario: new mongoose.Types.ObjectId(usuarioId),
                  estornado: false,
                  data: { $lte: monthEnd }
                }
              },
              {
                $group: {
                  _id: null,
                  totalEntradas: {
                    $sum: {
                      $cond: [
                        { $in: ['$tipo', ['Entrada', 'Saldo Inicial']] },
                        '$valor',
                        0
                      ]
                    }
                  },
                  totalSaidas: {
                    $sum: {
                      $cond: [
                        { $eq: ['$tipo', 'Saída'] },
                        '$valor',
                        0
                      ]
                    }
                  },
                  quantidade: { $sum: 1 }
                }
              }
            ]);
            
            const saldo = resultado.length > 0 
              ? resultado[0].totalEntradas - resultado[0].totalSaidas
              : 0;
            
            const quantidade = resultado.length > 0 ? resultado[0].quantidade : 0;
            
            return { 
              data: monthEnd, 
              saldo: parseFloat(saldo.toFixed(2)),
              quantidadeTransacoes: quantidade
            };
          })
        );

        return { 
          conta: conta.nome,
          banco: conta.banco,
          contaId: conta._id,
          saldos: saldosPorPeriodo
        };
      })
    );
    
    console.log('✅ Evolução do saldo calculada com sucesso (OTIMIZADO)');
    return evolucaoSaldo;
    
  } catch (error) {
    console.error('❌ Erro ao calcular evolução do saldo (OTIMIZADO):', error);
    return [];
  }
};

// Função simplificada para teste
const getEvolucaoSaldoSimplificado = async (usuarioId, mesAtual, anoAtual) => {
  try {
    console.log('🔍 Calculando evolução do saldo (VERSÃO SIMPLIFICADA)...');
    
    // Buscar contas bancárias do usuário
    const contasBancarias = await ContaBancaria.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    if (contasBancarias.length === 0) {
      return [];
    }
    
    // Gerar dados mock para teste (sem consultar extratos)
    const evolucaoSaldo = contasBancarias.map((conta, index) => {
      const saldos = [];
      let saldoAtual = 1000 + (index * 500); // Saldo inicial diferente por conta
      
      // Gerar 6 meses de dados mock
      for (let i = 5; i >= 0; i--) {
        const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
        const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
        
        // Simular variação de saldo
        const variacao = (Math.random() - 0.5) * 500; // Variação entre -250 e +250
        saldoAtual += variacao;
        
        saldos.push({
          data: refEnd,
          saldo: parseFloat(saldoAtual.toFixed(2)),
          quantidadeTransacoes: Math.floor(Math.random() * 20) + 5
        });
      }
      
      return { 
        conta: conta.nome,
        banco: conta.banco,
        contaId: conta._id,
        saldos 
      };
    });
    
    console.log('✅ Evolução do saldo calculada (SIMPLIFICADO)');
    return evolucaoSaldo;
    
  } catch (error) {
    console.error('❌ Erro ao calcular evolução do saldo (SIMPLIFICADO):', error);
    return [];
  }
};

module.exports = {
  getEvolucaoSaldoOtimizado,
  getEvolucaoSaldoSimplificado
};
