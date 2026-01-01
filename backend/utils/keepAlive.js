// Cron job para manter a app acordada no Render (evita sleep após 15min de inatividade)
// Adicione ao server.js ou rode como script separado

const https = require('https');

const RENDER_URL = process.env.RENDER_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://controlefinanceiro-backend.onrender.com';
const KEEP_ALIVE_INTERVAL = 12 * 60 * 1000; // 12 minutos (Render dorme após 15min sem requisições)

function keepAlive() {
  https.get(`${RENDER_URL}/api`, (res) => {
    console.log(`[Keep-alive] Status: ${res.statusCode} at ${new Date().toISOString()}`);
  }).on('error', (err) => {
    console.error(`[Keep-alive] Erro: ${err.message}`);
  });
}

// Inicia keep-alive se estiver em produção no Render
if (process.env.NODE_ENV === 'production' && process.env.RENDER === 'true') {
  console.log('[Keep-alive] Iniciado - executará a cada 12 minutos');
  setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
  keepAlive(); // primeira execução imediata
}

module.exports = { keepAlive };
