const { connectDB } = require('./lib/mongodb');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Models
const Grupo = require('../models/Grupo');
const Conta = require('../models/Conta');
const Fornecedor = require('../models/Fornecedor');
const Gasto = require('../models/Gasto');
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');
const FormaPagamento = require('../models/FormaPagamento');
const Cartao = require('../models/Cartao');
const Notificacao = require('../models/Notificacao');
const EmailLog = require('../models/EmailLog');

// Handler genérico para rotas CRUD
module.exports = async (req, res) => {
  // Configurar headers CORS primeiro, antes de qualquer coisa
  res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  // Configurar timeout para evitar problemas no Vercel
  req.setTimeout(8000); // 8 segundos
  
  // Handle OPTIONS requests (preflight) - responder imediatamente SEM autenticação
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Aplicar middleware de autenticação apenas para outros métodos
  auth(req, res, async () => {
    try {
      // Parse do body manualmente
      let body = {};
      if (req.method === 'POST' || req.method === 'PUT') {
        if (req.headers['content-type']?.includes('application/json')) {
          try {
            const rawBody = await new Promise((resolve, reject) => {
              let data = '';
              req.on('data', chunk => data += chunk);
              req.on('end', () => resolve(data));
              req.on('error', reject);
            });
            body = JSON.parse(rawBody);
          } catch (parseError) {
            console.log('Erro ao parsear body:', parseError);
          }
        }
      }
      
      // Conectar ao MongoDB
      await connectDB();
      
      // Extrair path da URL
      const url = req.url || '';
      const path = url.split('?')[0]; // Remover query params
      
      // Roteamento baseado no path (removendo prefixo /api)
      const cleanPath = path.replace('/api', '');
      
      console.log('=== DEBUG CRUD ===');
      console.log('req.method:', req.method);
      console.log('req.url:', url);
      console.log('cleanPath:', cleanPath);
      console.log('req.user:', req.user);
      console.log('req.user._id:', req.user?._id);
      console.log('cleanPath:', cleanPath);
      console.log('body:', body);
      console.log('req.user._id:', req.user._id);
      
      // Verificar primeiro rota específica de subgrupos
      if (req.method === 'POST' && cleanPath.match(/\/grupos\/[^\/]+\/subgrupos$/)) {
        const grupoId = cleanPath.match(/\/grupos\/([^\/]+)\/subgrupos$/)[1];
        console.log('Adicionando subgrupo ao grupo:', grupoId);
        
        const grupo = await Grupo.findOne({
          _id: grupoId,
          usuario: req.user._id
        });
        
        if (!grupo) {
          return res.status(404).json({ message: 'Grupo não encontrado' });
        }
        
        grupo.subgrupos.push({ nome: body.nome });
        await grupo.save();
        
        return res.json(grupo);
      }
      
      // Excluir subgrupo específico
      if (req.method === 'DELETE' && cleanPath.match(/\/grupos\/[^\/]+\/subgrupos\/[^\/]+$/)) {
        const match = cleanPath.match(/\/grupos\/([^\/]+)\/subgrupos\/([^\/]+)$/);
        const grupoId = match[1];
        const subgrupoId = match[2];
        console.log('Excluindo subgrupo:', subgrupoId, 'do grupo:', grupoId);
        
        const grupo = await Grupo.findOne({
          _id: grupoId,
          usuario: req.user._id
        });
        
        if (!grupo) {
          return res.status(404).json({ message: 'Grupo não encontrado' });
        }
        
        const subgrupo = grupo.subgrupos.id(subgrupoId);
        if (!subgrupo) {
          return res.status(404).json({ message: 'Subgrupo não encontrado' });
        }
        
        // Remover subgrupo usando pull
        grupo.subgrupos.pull({ _id: subgrupoId });
        await grupo.save();
        
        return res.json({ message: 'Subgrupo excluído com sucesso' });
      }
      
      if (cleanPath === '/grupos' || cleanPath.includes('grupos')) {
        if (req.method === 'GET') {
          console.log('Buscando grupos do usuário...');
          const grupos = await Grupo.find({ usuario: req.user._id }).sort({ createdAt: 1 }); // Ordenar por data de criação (mais antigo primeiro)
          console.log('Grupos encontrados:', grupos.length);
          return res.json(grupos);
        }
        
        if (req.method === 'POST') {
          console.log('Criando grupo:', body);
          const grupo = await Grupo.create({ ...body, usuario: req.user._id });
          return res.status(201).json(grupo);
        }
        
        if (req.method === 'DELETE') {
          // Extrair ID do grupo da URL
          const grupoId = cleanPath.replace('/grupos/', '');
          console.log('Excluindo grupo:', grupoId);
          
          const grupo = await Grupo.findOne({
            _id: grupoId,
            usuario: req.user._id
          });
          
          if (!grupo) {
            return res.status(404).json({ message: 'Grupo não encontrado' });
          }
          
          await grupo.deleteOne();
          
          return res.json({ message: 'Grupo excluído com sucesso' });
        }
      }
      
      if (cleanPath === '/contas-bancarias' || cleanPath.includes('contas-bancarias')) {
        if (req.method === 'GET') {
          console.log('Buscando contas bancárias do usuário...');
          
          // por padrão retorna apenas contas ativas; para listar todas use ?all=true
          const filter = { usuario: req.user._id };
          const url = req.url || '';
          const queryString = url.split('?')[1] || '';
          const params = new URLSearchParams(queryString);
          
          if (params.get('all') !== 'true') {
            filter.ativo = { $ne: false };
          }

          const contasBancarias = await ContaBancaria.find(filter).sort({ nome: 1 });

          // Calcular saldo para cada conta
          const contasComSaldo = await Promise.all(
            contasBancarias.map(async (conta) => {
              const extratos = await Extrato.find({
                contaBancaria: conta._id,
                usuario: req.user._id,
                estornado: false
              });

              const saldo = extratos.reduce((acc, extrato) => {
                if (extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial') {
                  return acc + extrato.valor;
                } else {
                  return acc - extrato.valor;
                }
              }, 0);

              console.log(`Conta ${conta.nome}: ${extratos.length} lançamentos, saldo: R$ ${saldo}`);

              return {
                ...conta.toObject(),
                saldo
              };
            })
          );

          console.log('Contas bancárias encontradas:', contasComSaldo.length);
          console.log('Contas com saldos calculados:', contasComSaldo.map(c => ({ nome: c.nome, saldo: c.saldo })));
          return res.json(contasComSaldo);
        }
        
        if (req.method === 'POST') {
          const contaBancaria = await ContaBancaria.create({ ...body, usuario: req.user._id });
          return res.status(201).json(contaBancaria);
        }
        
        if (req.method === 'DELETE') {
          // Extrair ID da conta bancária da URL
          const contaId = cleanPath.replace('/contas-bancarias/', '');
          console.log('Excluindo conta bancária:', contaId);
          
          const conta = await ContaBancaria.findOne({
            _id: contaId,
            usuario: req.user._id
          });
          
          if (!conta) {
            return res.status(404).json({ message: 'Conta bancária não encontrada' });
          }
          
          await conta.deleteOne();
          
          return res.json({ message: 'Conta bancária excluída com sucesso' });
        }
      }
      
      if (cleanPath === '/contas' || cleanPath.includes('contas')) {
        console.log('=== DEBUG CONTAS ===');
        console.log('cleanPath:', cleanPath);
        console.log('req.method:', req.method);
        
        if (req.method === 'GET') {
          console.log('Buscando contas do usuário...');
          
          // Extrair query params
          const url = req.url || '';
          const queryString = url.split('?')[1] || '';
          const params = new URLSearchParams(queryString);
          
          const mes = params.get('mes');
          const ano = params.get('ano');
          const ativo = params.get('ativo');
          const status = params.get('status');
          const dataInicio = params.get('dataInicio');
          const dataFim = params.get('dataFim');
          
          console.log('Parâmetros recebidos:', { mes, ano, ativo, status, dataInicio, dataFim });
          
          // Construir query base
          let query = { usuario: req.user._id, valor: { $ne: null } };
          
          // filtro por mês/ano (dataVencimento)
          if (mes && ano) {
            const startDate = new Date(ano, mes - 1, 1);
            const endDate = new Date(ano, mes, 0, 23, 59, 59);
            query.dataVencimento = { $gte: startDate, $lte: endDate };
            console.log('Filtro dataVencimento:', startDate, 'até', endDate);
          }
          
          // filtro por data range
          if (dataInicio && dataFim) {
            query.dataVencimento = { 
              $gte: new Date(dataInicio), 
              $lte: new Date(dataFim) 
            };
          }
          
          // filtro por ativo
          if (ativo && ativo !== 'todas') {
            query.ativo = ativo === 'ativas';
          }
          
          // filtro por status
          if (status && status !== 'todos') {
            if (status === 'pendentes') {
              query.status = { $in: ['Pendente', 'Vencida'] };
            } else if (status === 'vencidas') {
              query.status = 'Vencida';
            } else {
              query.status = status.charAt(0).toUpperCase() + status.slice(1);
            }
          }
          
          console.log('Query final:', query);
          
          try {
            // Otimizado: usar lean() para performance e limit para evitar timeout
            const contas = await Conta.find(query)
              .populate('fornecedor', 'nome')
              .sort({ dataVencimento: 1 })
              .limit(100) // Limitar para evitar timeout
              .lean(); // Mais rápido
            
            console.log('Contas encontradas:', contas.length);
            console.log('Primeiras contas:', contas.slice(0, 3));
            return res.json(contas);
          } catch (error) {
            console.error('Erro ao buscar contas:', error);
            console.error('Stack:', error.stack);
            return res.status(500).json({ 
              message: 'Erro ao buscar contas', 
              error: error.message,
              query: query
            });
          }
        }
        
        if (req.method === 'POST') {
          console.log('=== DEBUG POST CONTAS ===');
          console.log('body recebido:', body);
          console.log('campos obrigatórios:', {
            nome: body.nome,
            valor: body.valor,
            dataVencimento: body.dataVencimento,
            fornecedor: body.fornecedor
          });
          
          // Validação básica
          if (!body.nome || !body.valor || !body.dataVencimento || !body.fornecedor) {
            console.log('❌ Campos obrigatórios faltando');
            return res.status(400).json({ 
              message: 'Campos obrigatórios faltando',
              required: ['nome', 'valor', 'dataVencimento', 'fornecedor'],
              received: body
            });
          }
          
          const conta = await Conta.create({ ...body, usuario: req.user._id });
          console.log('✅ Conta criada com sucesso:', conta);
          return res.status(201).json(conta);
        }
        
        if (req.method === 'DELETE') {
          // Extrair ID da URL: /contas/6973793cb6a834c848d8976c
          const pathParts = cleanPath.split('/');
          const contaId = pathParts[pathParts.length - 1];
          
          console.log('Tentando excluir conta:', contaId);
          
          // Validar se é um ObjectId válido
          if (!mongoose.Types.ObjectId.isValid(contaId)) {
            return res.status(400).json({ message: 'ID de conta inválido' });
          }
          
          // Buscar e excluir a conta
          const conta = await Conta.findOneAndDelete({
            _id: contaId,
            usuario: req.user._id
          });
          
          if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada' });
          }
          
          console.log('Conta excluída com sucesso:', conta.nome);
          return res.json({ message: 'Conta excluída com sucesso', conta });
        }
      }
      
      if (cleanPath === '/fornecedores') {
        if (req.method === 'GET') {
          console.log('Buscando fornecedores do usuário...');
          const fornecedores = await Fornecedor.find({ usuario: req.user._id })
            .sort({ nome: 1 })
            .limit(100)
            .lean();
          return res.json(fornecedores);
        }
        
        if (req.method === 'POST') {
          const fornecedor = await Fornecedor.create({ ...body, usuario: req.user._id });
          return res.status(201).json(fornecedor);
        }
      }
    
    if (cleanPath === '/formas-pagamento' || cleanPath.includes('formas-pagamento')) {
      if (req.method === 'GET') {
        // Garante formas-padrão para o usuário se estiverem ausentes
        const defaultNames = ['Dinheiro', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito'];

        // Busca todas (ativas ou não) para checar o que já existe
        let existing = await FormaPagamento.find({ usuario: req.user._id }).sort({ nome: 1 });

        // Normaliza nomes para comparação sem case
        const existingNames = new Set(existing.map(f => (f.nome || '').toLowerCase().trim()));
        const missing = defaultNames.filter(n => !existingNames.has(n.toLowerCase().trim()));

        if (missing.length > 0) {
          console.log('Criando formas de pagamento padrão:', missing);
          const toCreate = missing.map(n => ({ nome: n, usuario: req.user._id }));
          await FormaPagamento.insertMany(toCreate);
          existing = await FormaPagamento.find({ usuario: req.user._id }).sort({ nome: 1 });
        }

        // Retorna apenas as formas ativas
        const formasPagamento = existing.filter(f => f.ativo !== false);
        return res.json(formasPagamento);
      }
      
      if (req.method === 'POST') {
        const formaPagamento = await FormaPagamento.create({ ...body, usuario: req.user._id });
        return res.status(201).json(formaPagamento);
      }
      
      if (req.method === 'PUT') {
        const formaId = cleanPath.replace('/formas-pagamento/', '');
        console.log('Atualizando forma de pagamento:', formaId);
        
        const forma = await FormaPagamento.findOne({
          _id: formaId,
          usuario: req.user._id
        });
        
        if (!forma) {
          return res.status(404).json({ message: 'Forma de pagamento não encontrada' });
        }
        
        const { nome } = body;
        if (nome) forma.nome = nome;
        
        await forma.save();
        
        return res.json({ message: 'Forma de pagamento atualizada com sucesso', forma });
      }
      
      if (req.method === 'DELETE') {
        const formaId = cleanPath.replace('/formas-pagamento/', '');
        console.log('Removendo forma de pagamento:', formaId);
        
        const forma = await FormaPagamento.findOne({
          _id: formaId,
          usuario: req.user._id
        });
        
        if (!forma) {
          return res.status(404).json({ message: 'Forma de pagamento não encontrada' });
        }
        
        // Soft delete - marca como inativo em vez de remover
        forma.ativo = false;
        await forma.save();
        
        return res.json({ message: 'Forma de pagamento removida com sucesso' });
      }
    }
    
    if (cleanPath === '/cartoes' || cleanPath.includes('cartoes')) {
      if (req.method === 'GET') {
        const cartoes = await Cartao.find({ usuario: req.user._id })
          .sort({ nome: 1 })
          .limit(50)
          .lean();
        return res.json(cartoes);
      }
      
      if (req.method === 'POST') {
        const cartao = await Cartao.create({ ...body, usuario: req.user._id });
        return res.status(201).json(cartao);
      }
      
      if (req.method === 'PUT') {
        console.log('=== DEBUG PUT CARTÕES ===');
        console.log('cleanPath:', cleanPath);
        console.log('includes /inativar:', cleanPath.includes('/inativar'));
        console.log('includes /ativar:', cleanPath.includes('/ativar'));
        
        // Verificar se é rota de inativação
        if (cleanPath.includes('/inativar')) {
          const cartaoId = cleanPath.replace('/cartoes/', '').replace('/inativar', '');
          console.log('Inativando cartão:', cartaoId);
          
          const cartao = await Cartao.findOne({
            _id: cartaoId,
            usuario: req.user._id
          });
          
          if (!cartao) {
            return res.status(404).json({ message: 'Cartão não encontrado' });
          }
          
          cartao.ativo = false;
          await cartao.save();
          
          return res.json({ message: 'Cartão inativado com sucesso', cartao });
        }
        
        // Verificar se é rota de ativação
        if (cleanPath.includes('/ativar')) {
          const cartaoId = cleanPath.replace('/cartoes/', '').replace('/ativar', '');
          console.log('Ativando cartão:', cartaoId);
          
          const cartao = await Cartao.findOne({
            _id: cartaoId,
            usuario: req.user._id
          });
          
          if (!cartao) {
            return res.status(404).json({ message: 'Cartão não encontrado' });
          }
          
          cartao.ativo = true;
          await cartao.save();
          
          return res.json({ message: 'Cartão ativado com sucesso', cartao });
        }
        
        // Atualizar cartão (apenas se não for inativação/ativação)
        if (!cleanPath.includes('/inativar') && !cleanPath.includes('/ativar')) {
          // Atualizar cartão
          const cartaoId = cleanPath.replace('/cartoes/', '');
          console.log('Atualizando cartão:', cartaoId);
          
          const cartao = await Cartao.findOne({
            _id: cartaoId,
            usuario: req.user._id
          });
          
          if (!cartao) {
            return res.status(404).json({ message: 'Cartão não encontrado' });
          }
          
          // Bloquear edição de cartões inativos
          console.log('Status do cartão:', cartao.ativo);
          if (!cartao.ativo) {
            console.log('Bloqueando edição de cartão inativo');
            return res.status(400).json({ 
              message: 'Não é possível editar um cartão inativo. Ative o cartão para fazer alterações.' 
            });
          }
          console.log('Cartão está ativo, permitindo edição');
          
          // Atualizar campos permitidos
          const { nome, tipo, banco, limite, diaFatura, diaFechamento } = body;
          if (nome) cartao.nome = nome;
          if (tipo) cartao.tipo = tipo;
          if (banco) cartao.banco = banco;
          if (limite !== undefined) cartao.limite = limite;
          if (diaFatura !== undefined) cartao.diaFatura = diaFatura;
          if (diaFechamento !== undefined) cartao.diaFechamento = diaFechamento;
          
          await cartao.save();
          
          return res.json({ message: 'Cartão atualizado com sucesso', cartao });
        }
      }
      
      if (req.method === 'DELETE') {
        const cartaoId = cleanPath.replace('/cartoes/', '');
        console.log('Excluindo cartão:', cartaoId);
        
        const cartao = await Cartao.findOne({
          _id: cartaoId,
          usuario: req.user._id
        });
        
        if (!cartao) {
          return res.status(404).json({ message: 'Cartão não encontrado' });
        }
        
        await cartao.deleteOne();
        
        return res.json({ message: 'Cartão excluído com sucesso' });
      }
    }
    
    if (cleanPath === '/contas-bancarias' || cleanPath.includes('contas-bancarias')) {
      if (req.method === 'GET') {
        console.log('Buscando contas bancárias do usuário...');
        const contasBancarias = await ContaBancaria.find({ usuario: req.user._id })
          .sort({ nome: 1 })
          .limit(50)
          .lean();
        return res.json(contasBancarias);
      }
      
      if (req.method === 'POST') {
        const contaBancaria = await ContaBancaria.create({ ...body, usuario: req.user._id });
        return res.status(201).json(contaBancaria);
      }
    }
    
    if (cleanPath === '/gastos' || cleanPath.includes('gastos')) {
      if (req.method === 'GET') {
        const gastos = await Gasto.find({ usuario: req.user._id }).sort({ data: -1 });
        return res.json(gastos);
      }
      
      if (req.method === 'POST') {
        // Tratar campos vazios para evitar erro de ObjectId
        const gastoData = { ...body, usuario: req.user._id };
        
        // Remover campos vazios que devem ser ObjectId
        if (gastoData.cartao === '') delete gastoData.cartao;
        if (gastoData.contaBancaria === '') delete gastoData.contaBancaria;
        if (gastoData.tipoDespesa?.grupo === '') delete gastoData.tipoDespesa.grupo;
        
        const gasto = await Gasto.create(gastoData);
        return res.status(201).json(gasto);
      }
    }
    
    if (cleanPath === '/transferencias' || cleanPath.includes('transferencias')) {
      if (req.method === 'GET') {
        // Buscar transferências (extratos com referência tipo 'Transferencia' e tipo 'Saída')
        const transferenciasSaida = await Extrato.find({
          usuario: req.user._id,
          'referencia.tipo': 'Transferencia',
          tipo: 'Saída'
        })
        .populate('contaBancaria', 'nome banco')
        .sort({ data: -1 })
        .limit(20)
        .skip(0);

        // Para cada transferência de saída, buscar a entrada correspondente
        const transferencias = await Promise.all(
          transferenciasSaida.map(async (saida) => {
            const entrada = await Extrato.findOne({
              usuario: req.user._id,
              'referencia.tipo': 'Transferencia',
              'referencia.id': saida.referencia.id,
              tipo: 'Entrada'
            }).populate('contaBancaria', 'nome banco');

            return {
              ...saida.toObject(),
              contaDestino: entrada?.contaBancaria || null
            };
          })
        );

        return res.json({
          transferencias,
          pagination: {
            page: 1,
            limit: 20,
            total: transferencias.length,
            pages: Math.ceil(transferencias.length / 20)
          }
        });
      }
    }
    
    if (cleanPath === '/notificacoes' || cleanPath.includes('notificacoes')) {
      if (req.method === 'GET') {
        const notificacoes = await Notificacao.find({ usuario: req.user._id }).sort({ data: -1 });
        return res.json(notificacoes);
      }
      
      if (req.method === 'POST') {
        const notificacao = await Notificacao.create({ ...body, usuario: req.user._id });
        return res.status(201).json(notificacao);
      }
    }
    
    if (cleanPath === '/notificacoes/nao-lidas' || cleanPath.includes('notificacoes/nao-lidas')) {
      if (req.method === 'GET') {
        const notificacoesNaoLidas = await Notificacao.find({ usuario: req.user._id, lida: false }).sort({ data: -1 });
        return res.json(notificacoesNaoLidas);
      }
    }
    
    if (cleanPath === '/notificacoes/teste-criacao' || cleanPath.includes('notificacoes/teste-criacao')) {
      if (req.method === 'POST') {
        console.log('=== DEBUG TESTE CRIACAO ===');
        console.log('req.user:', req.user);
        console.log('req.user._id:', req.user._id);
        console.log('body:', body);
        
        // Verificar se usuário está autenticado
        if (!req.user || !req.user._id) {
          console.log('Usuário não autenticado');
          return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        // Criar notificação de teste com campos obrigatórios
        const notificacaoData = {
          titulo: 'Notificação de Teste',
          mensagem: 'Esta é uma notificação de teste do sistema!',
          tipo: 'outro', // Usar valor válido do enum
          usuario: req.user._id, // Usar ID do usuário autenticado
          lida: false,
          data: new Date()
        };
        
        console.log('Dados da notificação:', notificacaoData);
        
        const notificacaoTeste = await Notificacao.create(notificacaoData);
        console.log('Notificação criada com sucesso:', notificacaoTeste);
        
        return res.status(201).json(notificacaoTeste);
      }
    }
    
    if (cleanPath === '/extrato' || cleanPath.includes('extrato')) {
      if (req.method === 'GET') {
        console.log('Buscando extrato do usuário...');
        
        // Extrair path da URL
        const url = req.url || '';
        const queryString = url.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        const cleanPath = url.split('?')[0];
        
        // Debug geral para todas as requisições
        console.log('=== DEBUG GERAL ===');
        console.log('req.method:', req.method);
        console.log('req.url:', req.url);
        console.log('cleanPath:', cleanPath);
        console.log('req.user:', req.user);
        console.log('req.user._id:', req.user?._id);
        
        const contaBancaria = params.get('contaBancaria');
        const tipoDespesa = params.get('tipoDespesa');
        const cartao = params.get('cartao');
        const dataInicio = params.get('dataInicio');
        const dataFim = params.get('dataFim');
        
        console.log('Parâmetros extrato:', { contaBancaria, tipoDespesa, cartao, dataInicio, dataFim });
        
        // Construir query base
        let query = { usuario: req.user._id, estornado: false };
        
        // filtro por conta bancária
        if (contaBancaria) {
          query.contaBancaria = contaBancaria;
        }
        
        // filtro por tipo
        if (tipoDespesa) {
          query.tipo = tipoDespesa;
        }
        
        // filtro por cartão
        if (cartao) {
          query.cartao = cartao;
        }
        
        // filtro por data range
        if (dataInicio && dataFim) {
          query.data = { 
            $gte: new Date(dataInicio), 
            $lte: new Date(dataFim) 
          };
        }
        
        console.log('Query extrato:', query);
        
        const extratos = await Extrato.find(query)
          .populate('contaBancaria', 'nome banco')
          .populate('cartao', 'nome')
          .sort({ data: -1 });
        
        console.log('Extratos encontrados (após filtro estornado: false):', extratos.length);
        console.log('Detalhes dos extratos:', extratos.map(e => ({
          id: e._id,
          tipo: e.tipo,
          valor: e.valor,
          estornado: e.estornado,
          motivo: e.motivo
        })));
        
        // Calcular totais
        let totalSaldo = 0;
        let totalEntradas = 0;
        let totalSaidas = 0;
        
        extratos.forEach(item => {
          console.log(`Processando item: ${item.tipo} - R$ ${item.valor} - estornado: ${item.estornado}`);
          if (item.tipo === 'Entrada' || item.tipo === 'Saldo Inicial') {
            totalEntradas += item.valor || 0;
            totalSaldo += item.valor || 0;
          } else {
            totalSaidas += item.valor || 0;
            totalSaldo -= item.valor || 0;
          }
        });
        
        console.log('Extratos encontrados:', extratos.length);
        console.log('Totais:', { totalSaldo, totalEntradas, totalSaidas });
        
        return res.json({
          extratos,
          totalSaldo,
          totalEntradas,
          totalSaidas
        });
      }
      
      if (req.method === 'POST') {
        // Verificar se é rota de saldo inicial
        if (cleanPath.includes('/saldo-inicial')) {
          console.log('=== DEBUG SALDO INICIAL ===');
          console.log('Criando saldo inicial');
          console.log('body recebido:', body);
          console.log('contaBancaria:', body.contaBancaria);
          console.log('valor:', body.valor);
          console.log('data:', body.data);
          
          const { contaBancaria, valor, data } = body;
          
          // Verificar se conta bancária existe e está ativa
          const conta = await ContaBancaria.findOne({ 
            _id: contaBancaria, 
            usuario: req.user._id, 
            ativo: { $ne: false } 
          });
          
          if (!conta) {
            console.log('❌ Conta bancária não encontrada ou inativa');
            return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });
          }
          
          console.log('✅ Conta bancária encontrada e ativa:', conta);

          // Verificar se já existe saldo inicial
          const saldoInicialExistente = await Extrato.findOne({
            contaBancaria,
            tipo: 'Saldo Inicial',
            usuario: req.user._id,
            estornado: false
          });

          if (saldoInicialExistente) {
            console.log('❌ Saldo inicial já existe para esta conta:', saldoInicialExistente);
            return res.status(400).json({ message: 'Saldo inicial já foi lançado para esta conta' });
          }
          
          console.log('✅ Não existe saldo inicial para esta conta');

          const extrato = await Extrato.create({
            contaBancaria,
            cartao: null, // Saldo inicial não tem cartão
            tipo: 'Saldo Inicial',
            valor: parseFloat(valor),
            data: new Date(data),
            motivo: 'Saldo Inicial',
            referencia: {
              tipo: 'Saldo Inicial',
              id: null
            },
            usuario: req.user._id
          });

          return res.status(201).json(extrato);
        }
        
        // Verificar se é rota de estorno
        if (cleanPath.includes('/estornar')) {
          console.log('Estornando lançamento');
          
          const extratoId = cleanPath.replace('/extrato/', '').replace('/estornar', '');
          
          const extrato = await Extrato.findOne({
            _id: extratoId,
            usuario: req.user._id
          });

          if (!extrato) {
            return res.status(404).json({ message: 'Lançamento não encontrado' });
          }

          if (extrato.estornado) {
            return res.status(400).json({ message: 'Lançamento já foi estornado' });
          }

          extrato.estornado = true;
          await extrato.save();

          return res.json({ message: 'Lançamento estornado com sucesso' });
        }
        
        // POST normal para criar lançamento
        const extrato = await Extrato.create({ ...body, usuario: req.user._id });
        return res.status(201).json(extrato);
      }
    }
    
    // Resposta padrão para endpoints não implementados
    console.log('Endpoint não implementado:', cleanPath);
    res.status(404).json({ 
      message: 'Endpoint não encontrado',
      path: cleanPath,
      method: req.method,
      available_endpoints: ['/grupos', '/contas', '/contas/:id', '/fornecedores', '/formas-pagamento', '/cartoes', '/contas-bancarias', '/gastos', '/transferencias', '/notificacoes', '/notificacoes/nao-lidas', '/notificacoes/teste-criacao', '/extrato']
    });
    
  } catch (error) {
    console.error('Erro no handler genérico:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
  });
};
