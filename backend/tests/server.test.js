const request = require('supertest');
const mongoose = require('mongoose');

describe('API Sanity Check', () => {
  let app;

  beforeAll(() => {
    // Simular ambiente de teste/serverless para evitar conexões automáticas pesadas
    process.env.NODE_ENV = 'test';
    process.env.VERCEL = '1'; 
    
    // Importa o app após setar as variáveis
    app = require('../server');
  });

  afterAll(async () => {
    // Garantir que conexões pendentes do Mongoose sejam encerradas
    await mongoose.disconnect();
  });

  it('deve retornar status 200 e mensagem de sucesso na rota raiz (/)', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('rodando');
  });

  it('deve ter as rotas base documentadas no retorno da raiz', async () => {
    const response = await request(app).get('/');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.endpoints).toHaveProperty('auth');
  });
});
