const mongoose = require('mongoose');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

// Função segura para obter subgrupos com tratamento de erro robusto
const getSubgruposSeguro = async (usuarioId, startDate, endDate) => {
  try {
    console.log('🔍 Buscando subgrupos de forma segura...');
    
    // 1. Buscar todos os grupos do usuário
    const grupos = await Grupo.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    if (grupos.length === 0) {
      console.log('📭 Nenhum grupo encontrado');
      return [];
    }
    
    console.log(`📋 Encontrados ${grupos.length} grupos`);
    
    // 2. Calcular total geral para percentuais
    const totalGeralResult = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$valor' }
        }
      }
    ]);
    
    const totalGeral = totalGeralResult[0]?.total || 0;
    console.log(`💰 Total geral: R$${totalGeral.toFixed(2)}`);
    
    // 3. Processar cada grupo individualmente com tratamento de erro
    const resultados = [];
    
    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i];
      
      try {
        console.log(`🔍 Processando grupo ${i + 1}/${grupos.length}: ${grupo.nome}`);
        
        // Aggregate para buscar gastos do grupo com subgrupos
        const gastosGrupo = await Gasto.aggregate([
          {
            $match: {
              usuario: new mongoose.Types.ObjectId(usuarioId),
              'tipoDespesa.grupo': grupo._id,
              data: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: '$tipoDespesa.subgrupo',
              valor: { $sum: '$valor' },
              quantidade: { $sum: 1 }
            }
          },
          {
            $sort: { valor: -1 }
          }
        ]);
        
        console.log(`  ✅ Gastos encontrados: ${gastosGrupo.length}`);
        
        // Se não houver gastos para este grupo, pular
        if (gastosGrupo.length === 0) {
          console.log(`  ⏭️ Pulando grupo sem gastos`);
          continue;
        }
        
        // Calcular total do grupo
        const totalGrupo = gastosGrupo.reduce((acc, item) => acc + item.valor, 0);
        console.log(`  💰 Total do grupo: R$${totalGrupo.toFixed(2)}`);
        
        // Processar subgrupos com percentuais
        const subgrupos = gastosGrupo.map(item => ({
          subgrupoNome: item._id || 'Não categorizado',
          valor: item.valor,
          quantidade: item.quantidade,
          percentualSubgrupo: totalGrupo > 0 ? (item.valor / totalGrupo) * 100 : 0
        }));
        
        // Adicionar resultado
        resultados.push({
          grupoId: grupo._id,
          grupoNome: grupo.nome,
          totalGrupo: totalGrupo,
          quantidade: gastosGrupo.reduce((acc, item) => acc + item.quantidade, 0),
          percentualGrupo: totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0,
          subgrupos: subgrupos
        });
        
        console.log(`  ✅ Grupo ${grupo.nome} processado com ${subgrupos.length} subgrupos`);
        
      } catch (erroGrupo) {
        console.error(`  ❌ Erro no grupo ${grupo.nome}:`, erroGrupo.message);
        // Continuar para o próximo grupo
        continue;
      }
    }
    
    // 4. Ordenar por total (maior para menor)
    const resultadoFinal = resultados.sort((a, b) => b.totalGrupo - a.totalGrupo);
    
    console.log(`✅ Subgrupos processados: ${resultadoFinal.length} grupos com dados`);
    
    return resultadoFinal;
    
  } catch (error) {
    console.error('❌ Erro geral ao buscar subgrupos:', error.message);
    
    // Retornar array vazio em caso de erro geral
    return [];
  }
};

module.exports = getSubgruposSeguro;
