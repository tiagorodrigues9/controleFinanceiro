const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

const setupSwagger = (app) => {
  try {
    const swaggerFile = path.resolve(__dirname, './swagger_output.json');
    if (fs.existsSync(swaggerFile)) {
      const swaggerData = fs.readFileSync(swaggerFile, 'utf8');
      const swaggerDocument = JSON.parse(swaggerData);
      
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      console.log('Swagger configurado na rota /api-docs');
    } else {
      console.warn('Arquivo swagger_output.json não encontrado. Rode "node swagger-autogen.js".');
    }
  } catch (err) {
    console.error('Erro ao carregar Swagger:', err);
  }
};

module.exports = setupSwagger;
