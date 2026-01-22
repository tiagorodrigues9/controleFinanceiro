const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');
const Extrato = require('./models/Extrato');
const ContaBancaria = require('./models/ContaBancaria');
const Grupo = require('./models/Grupo');
const User = require('./models/User');
const Fornecedor = require('./models/Fornecedor');

async function createSampleData() {
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
    console.log('✅ Conectado ao MongoDB');

    // Buscar usuário de teste
    const user = await User.findOne({ email: 'test@dashboard.com' });
    if (!user) {
      console.log('❌ Usuário de teste não encontrado');
      return;
    }

    console.log('👤 Usuário encontrado:', user._id);

    // Criar fornecedores
    const fornecedores = [
      { nome: 'Supermercado', usuario: user._id },
      { nome: 'Imobiliária', usuario: user._id },
      { nome: 'Internet Provider', usuario: user._id },
      { nome: 'Mercado Lauro', usuario: user._id }
    ];

    const fornecedoresCriados = [];
    for (const fornecedorData of fornecedores) {
      const fornecedor = await Fornecedor.create(fornecedorData);
      fornecedoresCriados.push(fornecedor);
      console.log('✅ Fornecedor criado:', fornecedor._id);
    }

    // Criar grupo de despesas
    const grupo = await Grupo.create({
      nome: 'Alimentação',
      usuario: user._id,
      ativo: true
    });
    console.log('✅ Grupo criado:', grupo._id);

    // Criar conta bancária
    const contaBancaria = await ContaBancaria.create({
      nome: 'Banco Teste',
      banco: 'Banco do Brasil',
      agencia: '1234',
      conta: '56789',
      saldo: 1000,
      usuario: user._id,
      ativo: true
    });
    console.log('✅ Conta bancária criada:', contaBancaria._id);

    // Criar contas a pagar
    const contas = [
      {
        nome: 'Supermercado',
        valor: 200,
        dataVencimento: new Date('2026-01-15'),
        status: 'Pendente',
        usuario: user._id,
        fornecedor: fornecedoresCriados[0]._id,
        ativo: true
      },
      {
        nome: 'Aluguel',
        valor: 1200,
        dataVencimento: new Date('2026-01-10'),
        status: 'Pago',
        dataPagamento: new Date('2026-01-08'),
        usuario: user._id,
        fornecedor: fornecedoresCriados[1]._id,
        ativo: true
      },
      {
        nome: 'Internet',
        valor: 100,
        dataVencimento: new Date('2026-01-20'),
        status: 'Vencida',
        usuario: user._id,
        fornecedor: fornecedoresCriados[2]._id,
        ativo: true
      },
      {
        nome: 'Mercado Lauro',
        valor: 22,
        dataVencimento: new Date('2026-01-02'),
        status: 'Pago',
        dataPagamento: new Date('2026-01-02'),
        usuario: user._id,
        fornecedor: fornecedoresCriados[3]._id,
        ativo: true
      }
    ];

    for (const contaData of contas) {
      const conta = await Conta.create(contaData);
      console.log('✅ Conta criada:', conta._id);
    }

    // Criar gastos
    const gastos = [
      {
        descricao: 'Restaurante',
        valor: 50,
        data: new Date('2026-01-05'),
        usuario: user._id,
        tipoDespesa: {
          grupo: grupo._id,
          subgrupo: 'Almoço'
        },
        formaPagamento: 'Cartão de Crédito',
        contaBancaria: contaBancaria._id,
        ativo: true
      },
      {
        descricao: 'Cinema',
        valor: 30,
        data: new Date('2026-01-10'),
        usuario: user._id,
        tipoDespesa: {
          grupo: grupo._id,
          subgrupo: 'Lazer'
        },
        formaPagamento: 'Dinheiro',
        contaBancaria: contaBancaria._id,
        ativo: true
      },
      {
        descricao: 'Uber',
        valor: 25,
        data: new Date('2026-01-12'),
        usuario: user._id,
        tipoDespesa: {
          grupo: grupo._id,
          subgrupo: 'Transporte'
        },
        formaPagamento: 'Cartão de Débito',
        contaBancaria: contaBancaria._id,
        ativo: true
      }
    ];

    for (const gastoData of gastos) {
      const gasto = await Gasto.create(gastoData);
      console.log('✅ Gasto criado:', gasto._id);
    }

    // Criar extratos
    const extratos = [
      {
        motivo: 'Salário',
        valor: 3000,
        tipo: 'Entrada',
        data: new Date('2026-01-01'),
        usuario: user._id,
        contaBancaria: contaBancaria._id,
        estornado: false
      },
      {
        motivo: 'Aluguel',
        valor: 1200,
        tipo: 'Saída',
        data: new Date('2026-01-08'),
        usuario: user._id,
        contaBancaria: contaBancaria._id,
        estornado: false
      },
      {
        motivo: 'Supermercado',
        valor: 200,
        tipo: 'Saída',
        data: new Date('2026-01-15'),
        usuario: user._id,
        contaBancaria: contaBancaria._id,
        estornado: false
      }
    ];

    for (const extratoData of extratos) {
      const extrato = await Extrato.create(extratoData);
      console.log('✅ Extrato criado:', extrato._id);
    }

    console.log('\n🎉 Dados de exemplo criados com sucesso!');
    console.log('📊 Resumo:');
    console.log(`- ${contas.length} contas`);
    console.log(`- ${gastos.length} gastos`);
    console.log(`- ${extratos.length} extratos`);
    console.log(`- 1 conta bancária`);
    console.log(`- 1 grupo de despesas`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

createSampleData();
