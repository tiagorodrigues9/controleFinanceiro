// Script para atualizar versão automaticamente
const fs = require('fs');
const path = require('path');

// Gerar timestamp atual
const now = new Date();
const timestamp = now.toISOString();
const version = `1.0.${Math.floor(Date.now() / 1000)}`;

// Criar objeto de versão
const versionData = {
  version: version,
  buildTime: timestamp,
  description: 'Controle Financeiro - Atualização automática'
};

// Caminho do arquivo version.json
const versionPath = path.join(__dirname, 'version.json');

// Escrever arquivo
fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

console.log(`Versão atualizada: ${version}`);
console.log(`Arquivo criado: ${versionPath}`);
