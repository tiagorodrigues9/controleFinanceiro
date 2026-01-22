const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

// Teste da implementação inline de subgrupos
const testSubgruposInline = async () => {
  try {
    console.log('🔍 Iniciando teste inline de subgrupos...');
    
    // Conectar ao MongoDB
    const mongoUser = process.env.MONGO_USER || '';
    const mongoPass = process.env.MONGO_PASS || '';
    const mongoDb = process.env.MONGO_DB || 'controle-financeiro';
    const mongoHost = process.env.MONGO_HOST || '';

    let mongoUri;
    if (mongoUser && mongoPass && mongoHost) {
      const cleanHost = mongoHost.startsWith('@') ? mongoHost.substring(1) : mongoHost;
      mongoUri = `mongodb+srv://${mongoUser}:${encodeURIComponent(mongoPass)}@${cleanHost}/${mongoDb}?retryWrites=true&w=majority`;
    } else {
      mongoUri = `mongodb://localhost:27017/${mongoDb}`;
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri);
    }
    
    console.log('✅ Conectado ao MongoDB');
    
    // Dados de teste
    const usuarioId = '6956f5edca85096ad6c7d995';
    const mesAtual = 1;
    const anoAtual = 2026;
    
    const startDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01T12:00:00.000Z`);
    const endDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-31T12:00:00.000Z`);
    
    console.log('📅 Período:', startDate.toISOString(), 'a', endDate.toISOString());
    
    // IMPLEMENTAÇÃO INLINE - Copiada do dashboard.js
    console.log('\n🔍 Testando implementação inline de subgrupos...');
    
    let relatorioTiposDespesa = [];
    
    try {
      // 1. Buscar grupos do usuário
      const grupos = await Grupo.find({ 
        usuario: new mongoose.Types.ObjectId(usuarioId) 
      });
      
      if (grupos.length === 0) {
        console.log('📭 Nenhum grupo encontrado');
        return;
      }
      
      console.log(`📋 Encontrados ${grupos.length} grupos, processando com subgrupos...`);
      
      // Calcular total geral para percentuais
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
      
      // Processar cada grupo individualmente
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
            },
            {
              $limit: 20
            }
          ]);
          
          console.log(`  ✅ Gastos encontrados: ${gastosGrupo.length}`);
          
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
            valor: parseFloat(item.valor.toFixed(2)),
            quantidade: item.quantidade || 1,
            percentualSubgrupo: totalGrupo > 0 ? parseFloat(((item.valor / totalGrupo) * 100).toFixed(2)) : 0
          }));
          
          // Adicionar resultado
          resultados.push({
            grupoId: grupo._id,
            grupoNome: grupo.nome,
            totalGrupo: parseFloat(totalGrupo.toFixed(2)),
            quantidade: gastosGrupo.reduce((acc, item) => acc + (item.quantidade || 1), 0),
            percentualGrupo: totalGeral > 0 ? parseFloat(((totalGrupo / totalGeral) * 100).toFixed(2)) : 0,
            subgrupos: subgrupos
          });
          
          console.log(`  ✅ Grupo ${grupo.nome} processado com ${subgrupos.length} subgrupos`);
          
        } catch (erroGrupo) {
          console.error(`  ❌ Erro no grupo ${grupo.nome}:`, erroGrupo.message);
          continue;
        }
      }
      
      // Ordenar por total (maior para menor)
      relatorioTiposDespesa = resultados.sort((a, b) => b.totalGrupo - a.totalGrupo);
      console.log(`✅ Subgrupos processados: ${relatorioTiposDespesa.length} grupos com dados`);
      
    } catch (erroSubgrupos) {
      console.error('❌ Erro ao processar subgrupos:', erroSubgrupos.message);
    }
    
    // Exibir resultado
    console.log('\n📊 Resultado final:');
    console.log(JSON.stringify(relatorioTiposDespesa, null, 2));
    
    // Validação
    console.log('\n✅ Validação:');
    if (relatorioTiposDespesa.length > 0) {
      const primeiro = relatorioTiposDespesa[0];
      console.log(`✅ Total de grupos: ${relatorioTiposDespesa.length}`);
      console.log(`✅ Primeiro grupo: ${primeiro.grupoNome}`);
      console.log(`✅ Total do primeiro grupo: R$${primeiro.totalGrupo}`);
      console.log(`✅ Subgrupos do primeiro grupo: ${primeiro.subgrupos.length}`);
      
      if (primeiro.subgrupos.length > 0) {
        console.log(`✅ Primeiro subgrupo: ${primeiro.subgrupos[0].subgrupoNome}`);
        console.log(`✅ Valor do primeiro subgrupo: R$${primeiro.subgrupos[0].valor}`);
        console.log(`✅ Percentual do primeiro subgrupo: ${primeiro.subgrupos[0].percentualSubgrupo}%`);
      }
    } else {
      console.log('⚠️  Nenhum resultado obtido');
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    console.log('\n🎉 Teste inline de subgrupos concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste inline:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testSubgruposInline();
