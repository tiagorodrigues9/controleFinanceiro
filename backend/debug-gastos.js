const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

async function debugGastos() {
  try {
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

    await mongoose.connect(mongoUri);
    console.log('🔗 Conectado ao MongoDB');

    // Verificar gastos no mês atual (janeiro 2026)
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');
    
    console.log('📅 Período:', startDate, 'até', endDate);

    // Buscar todos os gastos no período
    const gastos = await Gasto.find({
      data: { $gte: startDate, $lte: endDate }
    }).populate('tipoDespesa.grupo');

    console.log(`📊 Encontrados ${gastos.length} gastos no período`);
    
    if (gastos.length > 0) {
      console.log('🔍 Amostra de gastos:');
      gastos.slice(0, 5).forEach((gasto, index) => {
        console.log(`${index + 1}. Valor: R$${gasto.valor}, Data: ${gasto.data}, Categoria: ${gasto.tipoDespesa?.grupo?.nome || 'Sem categoria'}`);
      });
    }

    // Verificar grupos disponíveis
    const grupos = await Grupo.find({});
    console.log(`📁 Encontrados ${grupos.length} grupos no total`);
    
    if (grupos.length > 0) {
      console.log('🔍 Grupos disponíveis:');
      grupos.slice(0, 5).forEach((grupo, index) => {
        console.log(`${index + 1}. ${grupo.nome}`);
      });
    }

    // Buscar todos os gastos para ver os usuários
    const todosGastos = await Gasto.find({
      data: { $gte: startDate, $lte: endDate }
    }).select('usuario valor data tipoDespesa.grupo').populate('tipoDespesa.grupo');

    console.log(`📊 Todos os gastos e seus usuários:`);
    const usuariosEncontrados = new Set();
    
    todosGastos.slice(0, 10).forEach((gasto, index) => {
      usuariosEncontrados.add(gasto.usuario.toString());
      console.log(`${index + 1}. Usuário: ${gasto.usuario}, Valor: R$${gasto.valor}, Categoria: ${gasto.tipoDespesa?.grupo?.nome || 'Sem categoria'}`);
    });
    
    console.log(`\n👥 Usuários únicos encontrados: ${Array.from(usuariosEncontrados).join(', ')}`);

    // Buscar gastos por usuário específico (se existir)
    const gastosPorUsuario1 = await Gasto.find({
      usuario: '6956f28a505719b875ad752e' // Primeiro usuário que tem gastos
    }).populate('tipoDespesa.grupo');

    console.log(`👤 Gastos do usuário 6956f28a505719b875ad752e: ${gastosPorUsuario1.length}`);

    if (gastosPorUsuario1.length > 0) {
      console.log('🔍 Gastos por categoria:');
      const gastosPorGrupo = {};
      gastosPorUsuario1.forEach(gasto => {
        const grupoNome = gasto.tipoDespesa?.grupo?.nome || 'Sem grupo';
        gastosPorGrupo[grupoNome] = (gastosPorGrupo[grupoNome] || 0) + gasto.valor;
      });
      
      Object.entries(gastosPorGrupo)
        .sort((a, b) => b[1] - a[1])
        .forEach(([nome, valor], index) => {
          console.log(`${index + 1}. ${nome}: R$${valor.toFixed(2)}`);
        });
    }

    const gastosPorUsuario2 = await Gasto.find({
      usuario: '6956f5edca85096ad6c7d995' // Segundo usuário que aparece nos logs
    }).populate('tipoDespesa.grupo');

    console.log(`👤 Gastos do usuário 6956f5edca85096ad6c7d995: ${gastosPorUsuario2.length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugGastos();
