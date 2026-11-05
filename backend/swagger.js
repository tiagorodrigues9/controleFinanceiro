const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Controle Financeiro API',
      version: '1.0.0',
      description: 'Documentação completa da API do sistema de Controle Financeiro Pessoal.',
      contact: {
        name: 'Tiago Rodrigues'
      }
    },
    servers: [
      { url: 'https://controle-financeiro-backend1.vercel.app', description: 'Produção (Vercel)' },
      { url: 'http://localhost:5000', description: 'Desenvolvimento Local' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT obtido no login'
        }
      },
      schemas: {
        // ===================== User =====================
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665a1b2c3d4e5f6789012345' },
            nome: { type: 'string', example: 'João Silva' },
            email: { type: 'string', format: 'email', example: 'joao@email.com' },
            endereco: { type: 'string' },
            bairro: { type: 'string' },
            cidade: { type: 'string' },
            telefone: { type: 'string' },
            fotoPerfil: { type: 'string', nullable: true },
            configuracoes: {
              type: 'object',
              properties: {
                notificacoes: {
                  type: 'object',
                  properties: {
                    ativo: { type: 'boolean', default: true },
                    contasVencidas: { type: 'boolean', default: true },
                    contasProximas: { type: 'boolean', default: true },
                    limiteCartao: { type: 'boolean', default: true },
                    diasAntecedencia: { type: 'integer', default: 7 }
                  }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Conta =====================
        Conta: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            descricao: { type: 'string', example: 'Aluguel' },
            valor: { type: 'number', example: 1500.00 },
            dataVencimento: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['Pendente', 'Pago', 'Vencida'] },
            formaPagamento: { type: 'string', example: 'Boleto' },
            fornecedor: { type: 'string', description: 'ObjectId do fornecedor' },
            contaBancaria: { type: 'string', description: 'ObjectId da conta bancária' },
            cartao: { type: 'string', description: 'ObjectId do cartão' },
            observacao: { type: 'string' },
            recorrente: { type: 'boolean', default: false },
            parcelas: { type: 'integer', default: 1 },
            parcelaAtual: { type: 'integer', default: 1 },
            grupoParcelamento: { type: 'string' },
            dataPagamento: { type: 'string', format: 'date', nullable: true },
            jurosPago: { type: 'number', default: 0 },
            ativo: { type: 'boolean', default: true },
            anexo: { type: 'string', nullable: true },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== ContaBancaria =====================
        ContaBancaria: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            nome: { type: 'string', example: 'Conta Corrente Nubank' },
            banco: { type: 'string', example: 'Nubank' },
            agencia: { type: 'string' },
            numeroConta: { type: 'string' },
            saldo: { type: 'number', example: 5000.00 },
            ativo: { type: 'boolean', default: true },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Cartao =====================
        Cartao: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            nome: { type: 'string', example: 'Nubank Platinum' },
            tipo: { type: 'string', enum: ['Crédito', 'Débito'] },
            bandeira: { type: 'string', example: 'Mastercard' },
            banco: { type: 'string', example: 'Nubank' },
            limite: { type: 'number', example: 10000.00 },
            diaFechamento: { type: 'integer', example: 15 },
            diaVencimento: { type: 'integer', example: 22 },
            contaBancaria: { type: 'string', description: 'ObjectId da conta bancária vinculada' },
            ativo: { type: 'boolean', default: true },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Extrato =====================
        Extrato: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            tipo: { type: 'string', enum: ['Entrada', 'Saída', 'Saldo Inicial'] },
            valor: { type: 'number', example: 250.00 },
            data: { type: 'string', format: 'date-time' },
            motivo: { type: 'string' },
            contaBancaria: { type: 'string', description: 'ObjectId da conta bancária' },
            cartao: { type: 'string', description: 'ObjectId do cartão' },
            referencia: {
              type: 'object',
              properties: {
                tipo: { type: 'string', enum: ['Conta', 'Gasto', 'FaturaCartao', 'Transferencia', 'Manual'] },
                id: { type: 'string' }
              }
            },
            estornado: { type: 'boolean', default: false },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Gasto =====================
        Gasto: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            tipoDespesa: {
              type: 'object',
              properties: {
                grupo: { type: 'string', description: 'ObjectId do grupo' },
                subgrupo: { type: 'string' }
              }
            },
            valor: { type: 'number', example: 45.90 },
            data: { type: 'string', format: 'date' },
            local: { type: 'string' },
            observacao: { type: 'string' },
            formaPagamento: { type: 'string', example: 'Cartão de Crédito' },
            cartao: { type: 'string' },
            contaBancaria: { type: 'string' },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Grupo =====================
        Grupo: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            nome: { type: 'string', example: 'Alimentação' },
            cor: { type: 'string', example: '#6366f1' },
            icone: { type: 'string', example: 'Restaurant' },
            subgrupos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  nome: { type: 'string' },
                  cor: { type: 'string' },
                  icone: { type: 'string' }
                }
              }
            },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Fornecedor =====================
        Fornecedor: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            nome: { type: 'string', example: 'Imobiliária XYZ' },
            tipo: { type: 'string', example: 'Geral' },
            documento: { type: 'string' },
            telefone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            endereco: { type: 'string' },
            observacoes: { type: 'string' },
            ativo: { type: 'boolean', default: true },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== FormaPagamento =====================
        FormaPagamento: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            nome: { type: 'string', example: 'Pix' },
            ativo: { type: 'boolean', default: true },
            isSystem: { type: 'boolean', default: false },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== FaturaCartao =====================
        FaturaCartao: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            cartao: { type: 'string', description: 'ObjectId do cartão' },
            mesReferencia: { type: 'string', example: '07/2026' },
            dataFechamento: { type: 'string', format: 'date' },
            dataVencimento: { type: 'string', format: 'date' },
            valorTotal: { type: 'number', example: 2350.00 },
            status: { type: 'string', enum: ['Aberta', 'Fechada', 'Paga'] },
            dataPagamento: { type: 'string', format: 'date', nullable: true },
            valorPago: { type: 'number', nullable: true },
            contaBancariaPagamento: { type: 'string', nullable: true },
            despesas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  descricao: { type: 'string' },
                  valor: { type: 'number' },
                  data: { type: 'string', format: 'date' },
                  gastoRef: { type: 'string' },
                  contaRef: { type: 'string' },
                  isGastoDiario: { type: 'boolean' }
                }
              }
            },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Notificacao =====================
        Notificacao: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            tipo: { type: 'string', enum: ['conta_vencida', 'conta_proxima_vencimento', 'limite_cartao', 'outro'] },
            titulo: { type: 'string' },
            mensagem: { type: 'string' },
            data: { type: 'string', format: 'date-time' },
            lida: { type: 'boolean', default: false },
            referencia: {
              type: 'object',
              properties: {
                tipo: { type: 'string', enum: ['Conta', 'Cartao', 'Gasto'] },
                id: { type: 'string' }
              }
            },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Orcamento =====================
        Orcamento: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            mes: { type: 'integer', example: 7 },
            ano: { type: 'integer', example: 2026 },
            valorLimiteGeral: { type: 'number', example: 5000.00 },
            limitesPorGrupo: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  grupo: { type: 'string' },
                  valorLimite: { type: 'number' },
                  subgrupos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        nome: { type: 'string' },
                        valorLimite: { type: 'number' }
                      }
                    }
                  }
                }
              }
            },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Transferencia =====================
        Transferencia: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            contaOrigem: { type: 'string' },
            contaDestino: { type: 'string' },
            valor: { type: 'number', example: 1000.00 },
            data: { type: 'string', format: 'date-time' },
            motivo: { type: 'string' },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== EmailLog =====================
        EmailLog: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            usuario: { type: 'string' },
            tipo: { type: 'string' },
            destinatario: { type: 'string' },
            assunto: { type: 'string' },
            status: { type: 'string', enum: ['enviado', 'falha'] },
            erro: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ===================== Respostas Comuns =====================
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Erro interno do servidor' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' }
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            items: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js']
};

const setupSwagger = (app) => {
  try {
    const swaggerSpec = swaggerJsdoc(options);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Controle Financeiro - API Docs'
    }));
    console.log('Swagger configurado na rota /api-docs');
  } catch (err) {
    console.error('Erro ao carregar Swagger:', err);
  }
};

module.exports = setupSwagger;
