const mongoose = require('mongoose');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

// Função essencial e segura para subgrupos - MÁXIMA ESTABILIDADE
const getSubgruposEssencial = async (usuarioId, startDate, endDate) => {
  try {
    console.log('🔍 Iniciando busca essencial de subgrupos...');
    
    // VALIDAÇÃO 1: Verificar parâmetros
    if (!usuarioId || !startDate || !endDate) {
      console.log('❌ Parâmetros inválidos');
      return [];
    }
    
    // VALIDAÇÃO 2: Buscar grupos com fallback
    let grupos = [];
    try {
      grupos = await Grupo.find({ 
        usuario: new mongoose.Types.ObjectId(usuarioId) 
      });
      console.log(`📋 Grupos encontrados: ${grupos.length}`);
    } catch (erroGrupos) {
      console.error('❌ Erro ao buscar grupos:', erroGrupos.message);
      return [];
    }
    
    if (grupos.length === 0) {
      console.log('📭 Nenhum grupo encontrado');
      return [];
    }
    
    // VALIDAÇÃO 3: Calcular total geral com fallback
    let totalGeral = 0;
    try {
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
      totalGeral = totalGeralResult[0]?.total || 0;
      console.log(`💰 Total geral: R$${totalGeral.toFixed(2)}`);
    } catch (erroTotal) {
      console.error('❌ Erro ao calcular total geral:', erroTotal.message);
      return [];
    }
    
    // PROCESSAMENTO SEGURO: Um por vez para evitar Promise.all
    const resultados = [];
    
    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i];
      
      try {
        console.log(`🔍 Processando grupo ${i + 1}/${grupos.length}: ${grupo.nome}`);
        
        // VALIDAÇÃO 4: Buscar gastos do grupo com timeout implícito
        let gastosGrupo = [];
        try {
          gastosGrupo = await Gasto.aggregate([
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
            },
            {
              $limit: 20  // Limitar para evitar sobrecarga
            }
          ]);
        } catch (erroGastos) {
          console.error(`  ❌ Erro ao buscar gastos do grupo ${grupo.nome}:`, erroGastos.message);
          continue; // Pular para o próximo grupo
        }
        
        console.log(`  ✅ Gastos encontrados: ${gastosGrupo.length}`);
        
        // VALIDAÇÃO 5: Pular grupos sem gastos
        if (gastosGrupo.length === 0) {
          console.log(`  ⏭️ Pulando grupo sem gastos`);
          continue;
        }
        
        // VALIDAÇÃO 6: Calcular total do grupo com segurança
        let totalGrupo = 0;
        try {
          totalGrupo = gastosGrupo.reduce((acc, item) => {
            if (typeof item.valor === 'number' && !isNaN(item.valor)) {
              return acc + item.valor;
            }
            return acc;
          }, 0);
        } catch (erroCalculo) {
          console.error(`  ❌ Erro ao calcular total do grupo:`, erroCalculo.message);
          continue;
        }
        
        console.log(`  💰 Total do grupo: R$${totalGrupo.toFixed(2)}`);
        
        // VALIDAÇÃO 7: Processar subgrupos com validação
        let subgrupos = [];
        try {
          subgrupos = gastosGrupo.map(item => {
            // VALIDAR cada item antes de processar
            if (!item || typeof item.valor !== 'number' || isNaN(item.valor)) {
              return null;
            }
            
            return {
              subgrupoNome: item._id || 'Não categorizado',
              valor: parseFloat(item.valor.toFixed(2)),
              quantidade: typeof item.quantidade === 'number' ? item.quantidade : 1,
              percentualSubgrupo: totalGrupo > 0 ? parseFloat(((item.valor / totalGrupo) * 100).toFixed(2)) : 0
            };
          }).filter(item => item !== null); // Remover itens nulos
        } catch (erroSubgrupos) {
          console.error(`  ❌ Erro ao processar subgrupos:`, erroSubgrupos.message);
          continue;
        }
        
        // VALIDAÇÃO 8: Montar resultado final
        try {
          const resultadoGrupo = {
            grupoId: grupo._id,
            grupoNome: grupo.nome || 'Sem Nome',
            totalGrupo: parseFloat(totalGrupo.toFixed(2)),
            quantidade: gastosGrupo.reduce((acc, item) => acc + (typeof item.quantidade === 'number' ? item.quantidade : 1), 0),
            percentualGrupo: totalGeral > 0 ? parseFloat(((totalGrupo / totalGeral) * 100).toFixed(2)) : 0,
            subgrupos: subgrupos
          };
          
          // VALIDAÇÃO 9: Validar resultado final
          if (resultadoGrupo.totalGrupo > 0 && resultadoGrupo.subgrupos.length > 0) {
            resultados.push(resultadoGrupo);
            console.log(`  ✅ Grupo ${grupo.nome} adicionado com ${subgrupos.length} subgrupos`);
          } else {
            console.log(`  ⏭️ Pulando grupo inválido`);
          }
        } catch (erroResultado) {
          console.error(`  ❌ Erro ao montar resultado:`, erroResultado.message);
          continue;
        }
        
      } catch (erroGrupo) {
        console.error(`  ❌ Erro geral no grupo ${grupo.nome}:`, erroGrupo.message);
        // Continuar para o próximo grupo
        continue;
      }
    }
    
    // VALIDAÇÃO 10: Ordenar e retornar
    try {
      const resultadoFinal = resultados.sort((a, b) => b.totalGrupo - a.totalGrupo);
      console.log(`✅ Subgrupos essenciais processados: ${resultadoFinal.length} grupos com dados`);
      
      // VALIDAÇÃO FINAL: Estrutura mínima
      if (resultadoFinal.length === 0) {
        console.log('⚠️  Nenhum resultado válido, retornando array vazio');
        return [];
      }
      
      return resultadoFinal;
    } catch (erroOrdenacao) {
      console.error('❌ Erro ao ordenar resultados:', erroOrdenacao.message);
      return resultados; // Retornar sem ordenação
    }
    
  } catch (error) {
    console.error('❌ Erro geral na função essencial de subgrupos:', error.message);
    console.error('Stack:', error.stack);
    
    // FALBACK SEGURO: Retornar array vazio em vez de quebrar
    console.log('🔄 Retornando array vazio como fallback seguro');
    return [];
  }
};

module.exports = getSubgruposEssencial;
