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
  const allowedOrigins = [
    'https://controlefinanceiro-i7s6.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]); // Default para produção
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');
  
  console.log('CORS - Origin:', origin);
  console.log('CORS - Allowed Origins:', allowedOrigins);
  
  // Configurar timeout para evitar problemas no Vercel
  req.setTimeout(10000); // 10 segundos
  
  // Handle OPTIONS requests (preflight) - responder imediatamente SEM autenticação
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Aplicar middleware de autenticação apenas para outros métodos
  auth(req, res, async () => {
    try {
      console.log('=== HANDLER CRUD INICIADO ===');
      console.log('req.method:', req.method);
      console.log('req.url:', req.url);
      
      // Extrair path da URL
      const url = req.url || '';
      const path = url.split('?')[0]; // Remover query params
      const cleanPath = path.replace('/api', '');
      
      console.log('cleanPath:', cleanPath);
      
      // Obter body para métodos POST/PUT
      let body = {};
      if (req.method === 'POST' || req.method === 'PUT') {
        try {
          body = req.body || {};
        } catch (error) {
          console.log('❌ Erro ao fazer parse do body:', error.message);
          body = {};
        }
      }
      
      // Conectar ao MongoDB
      await connectDB();
      
      console.log('req.user._id:', req.user?._id);

      // ROTAS DE NOTIFICAÇÕES - Prioridade alta para evitar timeout
      if (cleanPath === '/notificacoes' || cleanPath.includes('notificacoes')) {
        if (req.method === 'GET') {
          console.log('Buscando notificações do usuário...');
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
          console.log('Buscando notificações não lidas...');
          const notificacoesNaoLidas = await Notificacao.find({ usuario: req.user._id, lida: false }).sort({ data: -1 });
          return res.json(notificacoesNaoLidas);
        }
      }
      
      if (cleanPath === '/notificacoes/teste-criacao' || cleanPath.includes('notificacoes/teste-criacao')) {
        if (req.method === 'POST') {
          console.log('=== DEBUG TESTE CRIACAO v2.0 ===');
          console.log('req.user._id:', req.user._id);
          
          if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
          }
          
          const notificacaoData = {
            titulo: 'Notificação de Teste',
            mensagem: 'Esta é uma notificação de teste do sistema!',
            tipo: 'outro',
            usuario: req.user._id,
            lida: false,
            data: new Date()
          };
          
          console.log('📝 Dados da notificação:', notificacaoData);
          
          try {
            const notificacaoTeste = await Notificacao.create(notificacaoData);
            console.log('✅ Notificação criada com sucesso');
            return res.status(201).json(notificacaoTeste);
          } catch (error) {
            console.log('❌ Erro ao criar notificação:', error.message);
            return res.status(500).json({ 
              message: 'Erro ao criar notificação de teste', 
              error: error.message
            });
          }
        }
      }

      // ROTA DE EXTRATO
      if (cleanPath === '/extrato' || cleanPath.includes('extrato')) {
        if (req.method === 'GET') {
          console.log('Buscando extrato do usuário...');
          
          // Extrair path da URL
          const url = req.url || '';
          const queryString = url.split('?')[1] || '';
          const params = new URLSearchParams(queryString);
          
          const contaBancaria = params.get('contaBancaria');
          const tipoDespesa = params.get('tipoDespesa');
          const cartao = params.get('cartao');
          const dataInicio = params.get('dataInicio');
          const dataFim = params.get('dataFim');
          
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
          
          const extratos = await Extrato.find(query)
            .populate('contaBancaria', 'nome banco')
            .populate('cartao', 'nome')
            .sort({ data: -1 });
          
          // Calcular totais
          let totalSaldo = 0;
          let totalEntradas = 0;
          let totalSaidas = 0;
          
          extratos.forEach(item => {
            if (item.tipo === 'Entrada' || item.tipo === 'Saldo Inicial') {
              totalEntradas += item.valor || 0;
              totalSaldo += item.valor || 0;
            } else {
              totalSaidas += item.valor || 0;
              totalSaldo -= item.valor || 0;
            }
          });
          
          return res.json({
            extratos,
            totalSaldo,
            totalEntradas,
            totalSaidas
          });
        }
      }

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
      
      // Função auxiliar para extrair ID da conta da URL
      const getContaIdFromPath = (cleanPath) => {
        const pathParts = cleanPath.split('/');
        console.log('Path parts:', pathParts);
        // Procurar pelo primeiro ObjectId válido na URL
        for (let i = pathParts.length - 1; i >= 0; i--) {
          console.log(`Verificando pathParts[${i}]:`, pathParts[i], 'É válido?', mongoose.Types.ObjectId.isValid(pathParts[i]));
          if (mongoose.Types.ObjectId.isValid(pathParts[i])) {
            return pathParts[i];
          }
        }
        return null;
      };
      
      if (cleanPath === '/contas' || cleanPath.includes('contas')) {
        console.log('=== DEBUG CONTAS ===');
        console.log('cleanPath:', cleanPath);
        console.log('req.method:', req.method);
        
        // Verificar se é rota de cancelamento de parcelas restantes
        if (cleanPath.includes('/cancel-all-remaining')) {
          if (req.method === 'DELETE') {
            const contaId = getContaIdFromPath(cleanPath);
            console.log('ID extraído para cancel-all-remaining:', contaId);
            
            if (!contaId) {
              return res.status(400).json({ message: 'ID de conta não encontrado na URL' });
            }
            
            const conta = await Conta.findOne({
              _id: contaId,
              usuario: req.user._id,
              parcelaId: { $exists: true }
            });
            
            if (!conta) {
              return res.status(404).json({ message: 'Conta não encontrada ou não pertence a um grupo de parcelas' });
            }
            
            // Cancelar todas as parcelas do mesmo parcelaId
            await Conta.updateMany(
              {
                parcelaId: conta.parcelaId,
                usuario: req.user._id,
                ativo: { $ne: false }
              },
              {
                ativo: false,
                status: 'Cancelada'
              }
            );
            
            return res.json({ message: 'Todas as parcelas foram canceladas com sucesso' });
          }
        }
        
        // Verificar se é rota de exclusão permanente
        if (cleanPath.includes('/permanent')) {
          if (req.method === 'DELETE') {
            console.log('=== DEBUG PERMANENT ===');
            console.log('cleanPath recebido:', cleanPath);
            const contaId = getContaIdFromPath(cleanPath);
            console.log('ID extraído pela função:', contaId);
            
            if (!contaId) {
              return res.status(400).json({ message: 'ID de conta não encontrado na URL' });
            }
            
            console.log('Tentando excluir permanentemente conta:', contaId);
            
            const conta = await Conta.findOne({ 
              _id: contaId, 
              usuario: req.user._id,
              ativo: false // Apenas pode excluir se já estiver inativa
            });
            
            if (!conta) {
              return res.status(404).json({ 
                message: 'Conta não encontrada ou ainda está ativa. Inative a conta primeiro.' 
              });
            }
            
            // Verificar se há parcelas restantes
            if (conta.parcelaId) {
              const remainingInstallments = await Conta.find({
                parcelaId: conta.parcelaId,
                usuario: req.user._id,
                ativo: { $ne: false },
                _id: { $ne: conta._id }
              });
              
              if (remainingInstallments.length > 0) {
                return res.status(400).json({
                  message: `Existem ${remainingInstallments.length} parcela(s) restantes. Cancele todas as parcelas primeiro.`,
                  remainingInstallments: remainingInstallments.length
                });
              }
            }
            
            // Excluir permanentemente
            await Conta.deleteOne({ _id: contaId, usuario: req.user._id });
            
            return res.json({ message: 'Conta excluída permanentemente com sucesso' });
          }
        }
        
        // Verificar se é rota de exclusão hard (inativação)
        if (cleanPath.includes('/hard')) {
          if (req.method === 'DELETE') {
            const contaId = getContaIdFromPath(cleanPath);
            
            if (!contaId) {
              return res.status(400).json({ message: 'ID de conta não encontrado na URL' });
            }
            
            const conta = await Conta.findOne({ _id: contaId, usuario: req.user._id });
            if (!conta) return res.status(404).json({ message: 'Conta não encontrada' });
            
            // Soft inactivate em vez de excluir fisicamente
            conta.ativo = false;
            conta.status = 'Cancelada';
            await conta.save();
            
            return res.json({ message: 'Conta inativada com sucesso' });
          }
        }
        
        // Verificar se é rota de pagamento
        if (cleanPath.includes('/pagar')) {
          if (req.method === 'POST') {
            console.log('=== DEBUG PAGAR CONTA ===');
            console.log('body recebido:', body);
            
            const { formaPagamento, contaBancaria, cartao, juros } = body;
            
            // Validação básica
            if (!formaPagamento || !contaBancaria) {
              console.log('❌ Campos obrigatórios para pagamento faltando');
              return res.status(400).json({ 
                message: 'Forma de pagamento e conta bancária são obrigatórias',
                required: ['formaPagamento', 'contaBancaria'],
                received: body
              });
            }
            
            // Extrair ID da conta da URL
            const contaId = getContaIdFromPath(cleanPath);
            
            if (!contaId) {
              return res.status(400).json({ message: 'ID de conta não encontrado na URL' });
            }
            
            console.log('Tentando pagar conta:', contaId);
            
            // Validar se é um ObjectId válido
            if (!mongoose.Types.ObjectId.isValid(contaId)) {
              return res.status(400).json({ message: 'ID de conta inválido' });
            }
            
            // Buscar a conta
            const conta = await Conta.findOne({
              _id: contaId,
              usuario: req.user._id,
              ativo: { $ne: false }
            }).populate('fornecedor');
            
            if (!conta) {
              return res.status(404).json({ message: 'Conta não encontrada' });
            }
            
            if (conta.status === 'Pago') {
              return res.status(400).json({ message: 'Conta já foi paga' });
            }
            
            if (conta.status === 'Cancelada') {
              return res.status(400).json({ message: 'Conta cancelada não pode ser paga' });
            }
            
            // Verificar se conta bancária informada existe e está ativa
            const contaBancariaObj = await ContaBancaria.findOne({ 
              _id: contaBancaria, 
              usuario: req.user._id, 
              ativo: { $ne: false } 
            });
            if (!contaBancariaObj) {
              return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });
            }
            
            // Se for pagamento com cartão, verificar se o cartão existe
            let cartaoObj = null;
            if (cartao) {
              cartaoObj = await Cartao.findOne({ 
                _id: cartao, 
                usuario: req.user._id, 
                ativo: true 
              });
              if (!cartaoObj) {
                return res.status(400).json({ message: 'Cartão inválido ou inativo' });
              }
            }
            
            // Usar transação para garantir consistência
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
              conta.status = 'Pago';
              conta.dataPagamento = new Date();
              conta.formaPagamento = formaPagamento;
              conta.contaBancaria = contaBancaria;
              conta.cartao = cartaoObj ? cartaoObj._id : null;
              if (juros) {
                conta.jurosPago = parseFloat(juros);
              }
              await conta.save({ session });
              
              // Criar registro no extrato
              const valorPago = conta.valor + (conta.jurosPago || 0);
              await Extrato.create([{
                contaBancaria: contaBancaria,
                cartao: cartaoObj ? cartaoObj._id : null,
                tipo: 'Saída',
                valor: valorPago,
                data: new Date(),
                motivo: `Pagamento: ${conta.nome} - ${conta.fornecedor?.nome || 'Fornecedor não informado'}${juros ? ` (juros: R$ ${juros})` : ''}`,
                referencia: {
                  tipo: 'Conta',
                  id: conta._id
                },
                usuario: req.user._id
              }], { session });
              
              await session.commitTransaction();
              console.log('✅ Conta paga com sucesso:', conta._id);
              res.json(conta);
            } catch (error) {
              await session.abortTransaction();
              throw error;
            } finally {
              await session.endSession();
            }
          }
        }
        
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
          if (!body.nome || !body.fornecedor) {
            console.log('❌ Campos obrigatórios faltando');
            return res.status(400).json({ 
              message: 'Campos obrigatórios faltando',
              required: ['nome', 'fornecedor'],
              received: body
            });
          }
          
          // Para parcelamento manual, verificar se tem parcelas
          if (body.parcelMode === 'manual') {
            if (!body.parcelas || !Array.isArray(body.parcelas) || body.parcelas.length === 0) {
              return res.status(400).json({ 
                message: 'Parcelamento manual requer a lista de parcelas',
                required: ['parcelas'],
                received: body
              });
            }
          } else {
            // Para contas normais, exigir valor e dataVencimento
            if (!body.valor || !body.dataVencimento) {
              console.log('❌ Campos obrigatórios faltando para conta normal');
              return res.status(400).json({ 
                message: 'Campos obrigatórios faltando',
                required: ['nome', 'valor', 'dataVencimento', 'fornecedor'],
                received: body
              });
            }
          }
          
          // Verificar se é parcelamento manual
          if (body.parcelMode === 'manual' && body.parcelas) {
            console.log('🔄 Processando parcelamento manual');
            const parcelasList = Array.isArray(body.parcelas) ? body.parcelas : JSON.parse(body.parcelas);
            const parcelaIdFinal = Date.now().toString();
            
            const contasCriadas = [];
            for (let i = 0; i < parcelasList.length; i++) {
              const parcela = parcelasList[i];
              const [year, month, day] = parcela.data.split('-').map(Number);
              const dataParcela = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
              
              const parcelaData = {
                nome: `${body.nome} - Parcela ${i + 1}`,
                dataVencimento: dataParcela,
                valor: parseFloat(parcela.valor),
                fornecedor: body.fornecedor,
                observacao: body.observacao,
                tipoControle: body.tipoControle,
                usuario: req.user._id,
                status: 'Pendente',
                parcelaAtual: i + 1,
                totalParcelas: parcelasList.length,
                parcelaId: parcelaIdFinal
              };
              
              const newParcela = await Conta.create(parcelaData);
              contasCriadas.push(newParcela);
            }
            
            console.log('✅ Parcelas manuais criadas:', contasCriadas.length);
            return res.status(201).json(contasCriadas);
          }
          
          // Verificar se é parcelamento normal
          if (body.totalParcelas && parseInt(body.totalParcelas) > 1) {
            console.log('🔄 Processando parcelamento normal');
            const totalParcelas = parseInt(body.totalParcelas);
            const parcelas = [];
            const parcelaIdFinal = Date.now().toString();
            let valorParcela;
            
            // Parse da data de vencimento
            let dataVencimentoParsed;
            if (body.dataVencimento) {
              const [year, month, day] = body.dataVencimento.split('-').map(Number);
              // Criar data como meia-noite UTC para evitar problemas de fuso horário
              dataVencimentoParsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
            }
            
            const dataBase = new Date(dataVencimentoParsed);
            
            if (body.parcelMode === 'mesmo_valor') {
              valorParcela = parseFloat(body.valor);
            } else {
              // dividir (default)
              valorParcela = parseFloat(body.valor) / totalParcelas;
            }
            
            for (let i = 1; i <= totalParcelas; i++) {
              // Criar nova data para cada parcela para evitar problemas com setMonth
              const dataOriginal = new Date(dataBase);
              const dataVencimentoParcela = new Date(
                dataOriginal.getFullYear(),
                dataOriginal.getMonth() + (i - 1),
                Math.min(dataOriginal.getDate(), new Date(dataOriginal.getFullYear(), dataOriginal.getMonth() + (i - 1) + 1, 0).getDate()),
                12, 0, 0
              );
              
              const parcela = {
                nome: body.nome,
                dataVencimento: dataVencimentoParcela,
                valor: valorParcela,
                fornecedor: body.fornecedor,
                observacao: body.observacao,
                tipoControle: body.tipoControle,
                usuario: req.user._id,
                status: 'Pendente',
                parcelaAtual: i,
                totalParcelas: totalParcelas,
                parcelaId: parcelaIdFinal
              };
              
              // Adicionar sufixo apenas para parcelas > 1
              if (totalParcelas > 1) {
                parcela.nome = `${body.nome} - Parcela ${i} de ${totalParcelas}`;
              }
              
              parcelas.push(parcela);
            }
            
            const contasCriadas = await Conta.insertMany(parcelas);
            console.log('✅ Contas parceladas criadas:', contasCriadas.length);
            return res.status(201).json(contasCriadas);
          }
          
          // Conta simples (sem parcelamento)
          let dataVencimentoParsed;
          if (body.dataVencimento) {
            const [year, month, day] = body.dataVencimento.split('-').map(Number);
            // Criar data como meia-noite UTC para evitar problemas de fuso horário
            dataVencimentoParsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
          }
          
          const contaData = {
            nome: body.nome,
            dataVencimento: dataVencimentoParsed,
            valor: parseFloat(body.valor),
            fornecedor: body.fornecedor,
            observacao: body.observacao,
            tipoControle: body.tipoControle,
            usuario: req.user._id,
            status: 'Pendente'
          };
          
          const conta = await Conta.create(contaData);
          console.log('✅ Conta criada com sucesso:', conta);
          return res.status(201).json(conta);
        }
        
        if (req.method === 'DELETE') {
          // Verificar se é rota de pagamento primeiro
          if (cleanPath.includes('/pagar')) {
            return res.status(405).json({ message: 'Método não permitido para esta rota' });
          }
          
          // Extrair ID da conta da URL
          const contaId = getContaIdFromPath(cleanPath);
          
          if (!contaId) {
            return res.status(400).json({ message: 'ID de conta não encontrado na URL' });
          }
          
          console.log('Tentando inativar conta:', contaId);
          
          // Validar se é um ObjectId válido
          if (!mongoose.Types.ObjectId.isValid(contaId)) {
            return res.status(400).json({ message: 'ID de conta inválido' });
          }
          
          // Buscar a conta para soft inactivate
          const conta = await Conta.findOne({
            _id: contaId,
            usuario: req.user._id
          });
          
          if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada' });
          }
          
          // Check if there are remaining active installments (apenas para informação)
          let hasRemainingInstallments = false;
          let remainingCount = 0;
          
          console.log('Verificando parcelas restantes para conta:', {
            _id: conta._id,
            parcelaId: conta.parcelaId,
            totalParcelas: conta.totalParcelas,
            parcelaAtual: conta.parcelaAtual
          });
          
          if (conta.parcelaId) {
            const remainingInstallments = await Conta.find({
              parcelaId: conta.parcelaId,
              usuario: req.user._id,
              ativo: { $ne: false },
              _id: { $ne: conta._id } // Excluir a conta atual
            });
            remainingCount = remainingInstallments.length;
            hasRemainingInstallments = remainingCount > 0;
            
            console.log('Parcelas restantes encontradas:', {
              count: remainingCount,
              hasRemaining: hasRemainingInstallments,
              parcelas: remainingInstallments.map(p => ({ _id: p._id, nome: p.nome, ativo: p.ativo }))
            });
          }
          
          // Sempre inativar apenas a conta atual (DELETE padrão)
          // A informação sobre parcelas restantes é apenas para o frontend decidir se quer mostrar opções
          conta.ativo = false;
          conta.status = 'Cancelada';
          await conta.save();
          
          console.log('✅ Conta inativada com sucesso:', conta.nome);
          
          // Retornar informação sobre parcelas restantes para o frontend
          return res.json({ 
            message: 'Conta inativada com sucesso', 
            conta,
            hasRemainingInstallments,
            remainingCount
          });
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
        const gastos = await Gasto.find({ usuario: req.user._id })
          .populate('tipoDespesa.grupo', 'nome')
          .populate('contaBancaria', 'nome banco')
          .populate('cartao', 'nome')
          .sort({ data: -1 });
        return res.json(gastos);
      }
      
      if (req.method === 'POST') {
        console.log('=== DEBUG POST GASTOS ===');
        console.log('req.body original:', JSON.stringify(body, null, 2));
        
        // Tratar campos vazios para evitar erro de ObjectId
        const gastoData = { ...body, usuario: req.user._id };
        
        console.log('✅ Body obtido de req.body:', JSON.stringify(gastoData, null, 2));
        
        // Remover campos vazios que devem ser ObjectId
        if (gastoData.cartao === '') delete gastoData.cartao;
        if (gastoData.contaBancaria === '') delete gastoData.contaBancaria;
        if (gastoData.tipoDespesa?.grupo === '') delete gastoData.tipoDespesa.grupo;
        if (gastoData.tipoDespesa?.subgrupo === '') {
          console.log('🔧 Removendo subgrupo vazio');
          delete gastoData.tipoDespesa.subgrupo;
        }
        
        // Se tipoDespesa ficou vazio após remover campos, remover o objeto inteiro
        if (gastoData.tipoDespesa && Object.keys(gastoData.tipoDespesa).length === 0) {
          console.log('🔧 Removendo tipoDespesa vazio');
          delete gastoData.tipoDespesa;
        }
        
        console.log('Body final:', JSON.stringify(gastoData, null, 2));
        
        // Tratar data para evitar problema de fuso horário
        if (gastoData.data) {
          const [year, month, day] = gastoData.data.split('-').map(Number);
          gastoData.data = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
          console.log('Data tratada:', gastoData.data);
        }
        
        const gasto = await Gasto.create(gastoData);
        return res.status(201).json(gasto);
      }
    }
    
    if (cleanPath === '/transferencias' || cleanPath.includes('transferencias')) {
      if (req.method === 'GET') {
        // Buscar transferências (extratos com referência tipo 'Transferencia' e tipo 'Saída')
        console.log('Buscando transferências para usuário:', req.user._id);
        const transferenciasSaida = await Extrato.find({
          usuario: req.user._id,
          'referencia.tipo': 'Transferencia',
          tipo: 'Saída',
          estornado: { $ne: true } // Não buscar transferências estornadas
        })
        .populate('contaBancaria', 'nome banco')
        .sort({ data: -1 })
        .limit(20)
        .skip(0);

        console.log('Transferências encontradas (saída):', transferenciasSaida.length);
        console.log('Primeira transferência (debug):', transferenciasSaida[0]);

        // Para cada transferência de saída, buscar a entrada correspondente
        const transferencias = await Promise.all(
          transferenciasSaida.map(async (saida) => {
            console.log('Processando saída:', {
              id: saida._id,
              referenciaId: saida.referencia?.id,
              contaBancaria: saida.contaBancaria,
              motivo: saida.motivo
            });
            
            const entrada = await Extrato.findOne({
              usuario: req.user._id,
              'referencia.tipo': 'Transferencia',
              'referencia.id': saida.referencia.id,
              tipo: 'Entrada',
              estornado: { $ne: true } // Não buscar transferências estornadas
            }).populate('contaBancaria', 'nome banco');

            console.log('Entrada correspondente:', entrada ? {
              id: entrada._id,
              contaBancaria: entrada.contaBancaria,
              motivo: entrada.motivo
            } : 'Não encontrada');

            return {
              _id: saida.referencia.id,
              data: saida.data,
              valor: saida.valor,
              motivo: saida.motivo,
              contaBancaria: saida.contaBancaria || { nome: 'Conta não encontrada', banco: 'N/A' },
              contaDestino: entrada ? (entrada.contaBancaria || { nome: 'Conta não encontrada', banco: 'N/A' }) : { nome: 'Conta não encontrada', banco: 'N/A' },
              status: 'Concluída'
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
      
      if (req.method === 'POST') {
        console.log('=== DEBUG POST TRANSFERÊNCIA ===');
        console.log('body recebido:', body);
        
        const { contaOrigem, contaDestino, valor, motivo } = body;
        
        // Validação básica
        if (!contaOrigem || !contaDestino || !valor) {
          return res.status(400).json({ 
            message: 'Conta de origem, conta de destino e valor são obrigatórios',
            required: ['contaOrigem', 'contaDestino', 'valor'],
            received: body
          });
        }
        
        if (contaOrigem === contaDestino) {
          return res.status(400).json({ message: 'Não é possível transferir para a mesma conta' });
        }
        
        const valorFloat = parseFloat(valor);
        if (isNaN(valorFloat) || valorFloat <= 0) {
          return res.status(400).json({ message: 'Valor deve ser maior que zero' });
        }
        
        // Verificar se as contas existem e pertencem ao usuário
        const [origem, destino] = await Promise.all([
          ContaBancaria.findOne({ _id: contaOrigem, usuario: req.user._id, ativo: { $ne: false } }),
          ContaBancaria.findOne({ _id: contaDestino, usuario: req.user._id, ativo: { $ne: false } })
        ]);
        
        if (!origem) {
          return res.status(404).json({ message: 'Conta de origem não encontrada ou inativa' });
        }
        
        if (!destino) {
          return res.status(404).json({ message: 'Conta de destino não encontrada ou inativa' });
        }
        
        // Verificar saldo disponível na conta de origem
        console.log('Verificando saldo da conta de origem:', origem.nome);
        
        const saldoOrigem = await Extrato.aggregate([
          {
            $match: {
              usuario: req.user._id,
              contaBancaria: new mongoose.Types.ObjectId(contaOrigem),
              estornado: { $ne: true }
            }
          },
          {
            $group: {
              _id: '$contaBancaria',
              total: {
                $sum: {
                  $cond: [
                    { $in: ['$tipo', ['Entrada', 'Saldo Inicial']] },
                    '$valor',
                    { $multiply: ['$valor', -1] }
                  ]
                }
              }
            }
          }
        ]);
        
        const saldoDisponivel = saldoOrigem.length > 0 ? saldoOrigem[0].total : 0;
        console.log('Saldo disponível:', saldoDisponivel, 'Valor da transferência:', valorFloat);
        
        if (saldoDisponivel < valorFloat) {
          return res.status(400).json({ 
            message: `Saldo insuficiente na conta ${origem.nome}. Saldo disponível: R$ ${saldoDisponivel.toFixed(2)}, Valor da transferência: R$ ${valorFloat.toFixed(2)}`,
            saldoDisponivel,
            valorTransferencia: valorFloat
          });
        }
        
        // Usar transação para garantir consistência
        const session = await mongoose.startSession();
        session.startTransaction();
        
        // Gerar ID único para a transferência
        const transferenciaId = new mongoose.Types.ObjectId();
        
        try {
          // Criar registro de saída na conta de origem
          await Extrato.create([{
            contaBancaria: contaOrigem,
            tipo: 'Saída',
            valor: valorFloat,
            data: new Date(),
            motivo: motivo || `Transferência para ${destino.nome}`,
            referencia: {
              tipo: 'Transferencia',
              id: transferenciaId
            },
            usuario: req.user._id
          }], { session });
          
          // Criar registro de entrada na conta de destino
          await Extrato.create([{
            contaBancaria: contaDestino,
            tipo: 'Entrada',
            valor: valorFloat,
            data: new Date(),
            motivo: motivo || `Transferência de ${origem.nome}`,
            referencia: {
              tipo: 'Transferencia',
              id: transferenciaId
            },
            usuario: req.user._id
          }], { session });
          
          await session.commitTransaction();
          
          console.log('✅ Transferência realizada com sucesso:', {
            origem: origem.nome,
            destino: destino.nome,
            valor: valorFloat
          });
          
          return res.json({
            message: 'Transferência realizada com sucesso',
            transferencia: {
              origem: {
                id: origem._id,
                nome: origem.nome,
                banco: origem.banco
              },
              destino: {
                id: destino._id,
                nome: destino.nome,
                banco: destino.banco
              },
              valor: valorFloat,
              motivo: motivo || `Transferência de ${origem.nome} para ${destino.nome}`,
              data: new Date()
            }
          });
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          await session.endSession();
        }
      }
      
      if (req.method === 'DELETE') {
        console.log('=== DEBUG DELETE TRANSFERÊNCIA ===');
        console.log('cleanPath:', cleanPath);
        
        // Extrair ID da transferência da URL
        const pathParts = cleanPath.split('/');
        const transferenciaId = pathParts[pathParts.length - 1];
        
        console.log('Tentando excluir transferência:', transferenciaId);
        
        // Validar se é um ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(transferenciaId)) {
          return res.status(400).json({ message: 'ID de transferência inválido' });
        }
        
        // Buscar ambos os registros da transferência (saída e entrada)
        const [saida, entrada] = await Promise.all([
          Extrato.findOne({
            usuario: req.user._id,
            'referencia.tipo': 'Transferencia',
            'referencia.id': transferenciaId,
            tipo: 'Saída'
          }),
          Extrato.findOne({
            usuario: req.user._id,
            'referencia.tipo': 'Transferencia',
            'referencia.id': transferenciaId,
            tipo: 'Entrada'
          })
        ]);
        
        if (!saida) {
          return res.status(404).json({ message: 'Transferência não encontrada' });
        }
        
        // Usar transação para garantir consistência
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
          // Estornar ambos os registros
          if (saida) {
            saida.estornado = true;
            saida.motivo = `${saida.motivo} [ESTORNADO]`;
            await saida.save({ session });
          }
          
          if (entrada) {
            entrada.estornado = true;
            entrada.motivo = `${entrada.motivo} [ESTORNADO]`;
            await entrada.save({ session });
          }
          
          await session.commitTransaction();
          
          console.log('✅ Transferência estornada com sucesso:', transferenciaId);
          return res.json({ message: 'Transferência estornada com sucesso' });
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          await session.endSession();
        }
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
        console.log('=== DEBUG TESTE CRIACAO v2.0 ===');
        console.log('req.user:', req.user);
        console.log('req.user._id:', req.user._id);
        console.log('body:', body);
        
        // Verificar se usuário está autenticado
        if (!req.user || !req.user._id) {
          console.log('❌ Usuário não autenticado');
          return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        console.log('✅ Usuário autenticado:', req.user._id);
        
        // Criar notificação de teste com campos obrigatórios
        const notificacaoData = {
          titulo: 'Notificação de Teste',
          mensagem: 'Esta é uma notificação de teste do sistema!',
          tipo: 'outro', // Usar valor válido do enum
          usuario: req.user._id, // Usar ID do usuário autenticado
          lida: false,
          data: new Date()
        };
        
        console.log('📝 Dados da notificação:', notificacaoData);
        console.log('✅ Todos os campos preenchidos corretamente');
        
        try {
          const notificacaoTeste = await Notificacao.create(notificacaoData);
          console.log('✅ Notificação criada com sucesso:', notificacaoTeste);
          return res.status(201).json(notificacaoTeste);
        } catch (error) {
          console.log('❌ Erro ao criar notificação:', error.message);
          console.log('Detalhes do erro:', error.errors);
          return res.status(500).json({ 
            message: 'Erro ao criar notificação de teste', 
            error: error.message,
            details: error.errors
          });
        }
      }
    }
    
    if (cleanPath === '/notificacoes/subscribe' || cleanPath.includes('notificacoes/subscribe')) {
      if (req.method === 'POST') {
        console.log('=== DEBUG SUBSCRIBE ===');
        console.log('req.user._id:', req.user._id);
        console.log('subscription:', body);
        
        // Verificar se usuário está autenticado
        if (!req.user || !req.user._id) {
          return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        
        // Salvar inscrição do usuário (em um app real, salvaria no banco)
        // Por ora, apenas retornar sucesso
        console.log('✅ Inscrição recebida para usuário:', req.user._id);
        
        return res.json({ 
          message: 'Inscrição realizada com sucesso',
          subscription: body
        });
      }
    }
    
    // Resposta padrão para endpoints não implementados
    console.log('Endpoint não implementado:', cleanPath);
    res.status(404).json({ 
      message: 'Endpoint não encontrado',
      path: cleanPath,
      method: req.method,
      available_endpoints: ['/grupos', '/contas', '/contas/:id', '/fornecedores', '/formas-pagamento', '/cartoes', '/contas-bancarias', '/gastos', '/transferencias', '/notificacoes', '/notificacoes/nao-lidas', '/notificacoes/teste-criacao', '/notificacoes/subscribe', '/extrato']
    });
    
  } catch (error) {
    console.error('Erro no handler genérico:', error);
    console.error('Stack trace:', error.stack);
    console.error('cleanPath:', cleanPath);
    console.error('method:', req.method);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message,
      path: cleanPath,
      method: req.method
    });
  }
  });
};
