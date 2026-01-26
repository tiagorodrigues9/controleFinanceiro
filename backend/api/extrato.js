const { connectDB } = require('./lib/mongodb');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const auth = require('../middleware/auth');

// Handler principal para Vercel
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
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');
  
  // Configurar timeout para evitar problemas no Vercel
  req.setTimeout(14000); // 14 segundos
  
  // Handle OPTIONS requests (preflight) - responder imediatamente SEM autenticação
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Aplicar middleware de autenticação apenas para outros métodos
  auth(req, res, async () => {
    try {
      console.log('=== EXTRATO HANDLER INICIADO ===');
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

      // ROTA DE ESTORNAR - Prioridade alta
      if ((req.method === 'PUT' || req.method === 'POST') && cleanPath.includes('/estornar')) {
        // Extrair ID do extrato da URL para estornar
        const extratoId = cleanPath.replace('/extrato/', '').replace('/estornar', '');
        console.log('=== ESTORNO DEBUG ===');
        console.log('Estornando extrato:', extratoId);
        console.log('req.user._id:', req.user._id);
        console.log('mongoose.connection.readyState:', mongoose.connection.readyState);

        // Validar se o ID é um ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(extratoId)) {
          return res.status(400).json({ message: 'ID de lançamento inválido' });
        }

        // Verificar conexão com MongoDB e tentar reconectar se necessário
        if (mongoose.connection.readyState !== 1) {
          console.error('MongoDB não está conectado, tentando reconectar...');
          
          // Tentar reconectar
          try {
            await mongoose.connection.asPromise();
            console.log('MongoDB reconectado com sucesso');
          } catch (reconnectError) {
            console.error('Falha ao reconectar ao MongoDB:', reconnectError);
            return res.status(503).json({ 
              message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.' 
            });
          }
        }

        // Tentar a operação com retry
        let extrato;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            extrato = await Extrato.findOne({
              _id: extratoId,
              usuario: req.user._id
            });
            break; // Sucesso, sair do loop
          } catch (dbError) {
            retryCount++;
            console.log(`Tentativa ${retryCount}/${maxRetries} falhou:`, dbError.message);
            
            if (retryCount >= maxRetries) {
              throw dbError;
            }
            
            // Esperar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        console.log('Extrato encontrado:', extrato);

        if (!extrato) {
          return res.status(404).json({ message: 'Lançamento não encontrado' });
        }

        if (extrato.estornado) {
          return res.status(400).json({ message: 'Lançamento já foi estornado' });
        }

        // Tentar salvar com retry também
        retryCount = 0;
        while (retryCount < maxRetries) {
          try {
            extrato.estornado = true;
            await extrato.save();
            break; // Sucesso, sair do loop
          } catch (saveError) {
            retryCount++;
            console.log(`Tentativa de salvar ${retryCount}/${maxRetries} falhou:`, saveError.message);
            
            if (retryCount >= maxRetries) {
              throw saveError;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        // Se for uma saída, criar uma entrada correspondente
        if (extrato.tipo === 'Saída') {
          retryCount = 0;
          while (retryCount < maxRetries) {
            try {
              await Extrato.create({
                usuario: req.user._id,
                contaBancaria: extrato.contaBancaria,
                cartao: extrato.cartao,
                tipo: 'Entrada',
                valor: extrato.valor,
                data: new Date(),
                motivo: `Estorno: ${extrato.motivo}`,
                referencia: {
                  tipo: 'Estorno',
                  id: extrato._id
                },
                estornado: false
              });
              break; // Sucesso, sair do loop
            } catch (createError) {
              retryCount++;
              console.log(`Tentativa de criar entrada ${retryCount}/${maxRetries} falhou:`, createError.message);
              
              if (retryCount >= maxRetries) {
                throw createError;
              }
              
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }

        console.log('Extrato estornado com sucesso');
        return res.json({ message: 'Lançamento estornado com sucesso' });
      }
      
      // ROTA SALDO INICIAL
      if (cleanPath === '/extrato/saldo-inicial' && req.method === 'POST') {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { contaBancaria, valor, data } = body;

        // Verificar se conta bancária existe e está ativa
        const conta = await ContaBancaria.findOne({ _id: contaBancaria, usuario: req.user._id, ativo: { $ne: false } });
        if (!conta) return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });

        // Verificar se já existe saldo inicial
        const saldoInicialExistente = await Extrato.findOne({
          contaBancaria,
          tipo: 'Saldo Inicial',
          usuario: req.user._id,
          estornado: false
        });

        if (saldoInicialExistente) {
          return res.status(400).json({ message: 'Saldo inicial já foi lançado para esta conta' });
        }

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
      
      // ROTA GET EXTRATO
      if (cleanPath === '/extrato' && req.method === 'GET') {
        console.log('=== EXTRATO DEBUG ===');
        console.log('req.user._id:', req.user._id);
        
        // Extrair query params
        const queryString = url.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        
        const contaBancaria = params.get('contaBancaria');
        const tipoDespesa = params.get('tipoDespesa');
        const cartao = params.get('cartao');
        const dataInicio = params.get('dataInicio');
        const dataFim = params.get('dataFim');
        
        const query = { usuario: req.user._id, estornado: false };

        if (contaBancaria) {
          query.contaBancaria = contaBancaria;
        }

        if (cartao) {
          query.cartao = cartao;
        }

        if (dataInicio && dataFim) {
          // Criar datas em UTC para evitar problemas de timezone
          const [inicioYear, inicioMonth, inicioDay] = dataInicio.split('-').map(Number);
          const [fimYear, fimMonth, fimDay] = dataFim.split('-').map(Number);

          query.data = {
            $gte: new Date(Date.UTC(inicioYear, inicioMonth - 1, inicioDay, 0, 0, 0)),
            $lte: new Date(Date.UTC(fimYear, fimMonth - 1, fimDay, 23, 59, 59))
          };
        }

        console.log('Query para extratos:', query);

        let extratos = await Extrato.find(query)
          .populate('contaBancaria')
          .populate('cartao')
          .populate({ path: 'referencia.id', model: 'Gasto' })
          .sort({ data: -1 });

        // Filtrar extratos onde o populate da conta bancária retornou null (conta não existe)
        extratos = extratos.filter(extrato => {
          // Se tem contaBancaria no filtro mas o populate retornou null, remover
          if (query.contaBancaria && !extrato.contaBancaria) {
            return false;
          }
          return true;
        });

        console.log('Extratos encontrados:', extratos.length);

        // Se filtro por tipo de despesa, filtrar gastos
        if (tipoDespesa) {
          extratos = extratos.filter(extrato => {
            if (extrato.referencia?.tipo === 'Gasto' && extrato.referencia?.id) {
              const gasto = extrato.referencia.id;
              return gasto.tipoDespesa?.grupo?.toString() === tipoDespesa;
            }
            return false;
          });
        }

        let totalSaldo = 0;
        let totalEntradas = 0;
        let totalSaidas = 0;
        
        if (contaBancaria) {
          const saldoAgg = await Extrato.aggregate([
            { 
              $match: { 
                contaBancaria: new mongoose.Types.ObjectId(contaBancaria), 
                usuario: new mongoose.Types.ObjectId(req.user._id), 
                estornado: false 
              } 
            },
            { 
              $group: { 
                _id: null, 
                total: { 
                  $sum: { 
                    $cond: { 
                      if: { $in: ['$tipo', ['Entrada','Saldo Inicial']] }, 
                      then: '$valor', 
                      else: { $multiply: ['$valor', -1] } 
                    } 
                  } 
                } 
              } 
            }
          ]);
          totalSaldo = saldoAgg[0]?.total || 0;
        }

        // Calcular totais do período filtrado
        const matchQuery = { usuario: new mongoose.Types.ObjectId(req.user._id), estornado: false };
        if (contaBancaria) {
          matchQuery.contaBancaria = new mongoose.Types.ObjectId(contaBancaria);
        }
        if (cartao) {
          matchQuery.cartao = new mongoose.Types.ObjectId(cartao);
        }
        if (dataInicio && dataFim) {
          const [inicioYear, inicioMonth, inicioDay] = dataInicio.split('-').map(Number);
          const [fimYear, fimMonth, fimDay] = dataFim.split('-').map(Number);
          matchQuery.data = {
            $gte: new Date(Date.UTC(inicioYear, inicioMonth - 1, inicioDay, 0, 0, 0)),
            $lte: new Date(Date.UTC(fimYear, fimMonth - 1, fimDay, 23, 59, 59))
          };
        }

        console.log('MatchQuery para totais:', matchQuery);

        const totaisAgg = await Extrato.aggregate([
          { $match: matchQuery },
          { 
            $group: { 
              _id: null,
              totalEntradas: { $sum: { $cond: { if: { $in: ['$tipo', ['Entrada','Saldo Inicial']] }, then: '$valor', else: 0 } } },
              totalSaidas: { $sum: { $cond: { if: { $eq: ['$tipo', 'Saída'] }, then: '$valor', else: 0 } } }
            } 
          }
        ]);

        console.log('Resultado do aggregate:', totaisAgg);

        if (totaisAgg.length > 0) {
          totalEntradas = totaisAgg[0].totalEntradas || 0;
          totalSaidas = totaisAgg[0].totalSaidas || 0;
        }

        return res.json({ extratos, totalSaldo, totalEntradas, totalSaidas });
      }
      
      // ROTA POST EXTRATO (lançamento manual)
      if (cleanPath === '/extrato' && req.method === 'POST') {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { contaBancaria, tipo, valor, data, motivo, cartao } = body;

        // Criar data em UTC para evitar problemas de timezone
        const [year, month, day] = data.split('-').map(Number);
        const dataParsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

        // Verificar se conta bancária pertence ao usuário e está ativa
        const conta = await ContaBancaria.findOne({
          _id: contaBancaria,
          usuario: req.user._id,
          ativo: { $ne: false }
        });

        if (!conta) {
          return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });
        }

        const extrato = await Extrato.create({
          contaBancaria,
          cartao: cartao || null,
          tipo,
          valor: parseFloat(valor),
          data: dataParsed,
          motivo,
          referencia: {
            tipo: 'Lancamento',
            id: null
          },
          usuario: req.user._id
        });

        return res.status(201).json(extrato);
      }

      // Se nenhuma rota corresponder, retorna 404
      return res.status(404).json({ 
        message: 'Endpoint não encontrado',
        path: cleanPath
      });
      
    } catch (error) {
      console.error('Erro no handler de extrato:', error);
      
      // Tratamento específico para diferentes tipos de erro
      if (error.name === 'MongooseServerSelectionError' || 
          error.message.includes('Could not connect to any servers')) {
        return res.status(503).json({ 
          message: 'Serviço temporariamente indisponível devido a problemas de conexão. Tente novamente.' 
        });
      }
      
      if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        return res.status(503).json({ message: 'Erro de conexão com banco de dados' });
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Dados inválidos', error: error.message });
      }
      
      return res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
};
