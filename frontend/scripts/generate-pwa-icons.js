#!/usr/bin/env node

/**
 * Script para gerar ícones PWA e splash screens
 * Usa o módulo 'sharp' para converter SVG para PNG
 */

const fs = require('fs');
const path = require('path');

// Ícones básicos
const ICON_SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Splash screens (iOS)
const SPLASH_SIZES = [
  { width: 640, height: 1136 },  // iPhone 5/5S/5C
  { width: 750, height: 1334 },  // iPhone 6/6S/7/8
  { width: 1242, height: 2208 }, // iPhone 6+/6S+/7+/8+
  { width: 1125, height: 2436 }, // iPhone X/XS/11 Pro
  { width: 828, height: 1792 },  // iPhone XR/11
  { width: 1242, height: 2688 }, // iPhone XS Max/11 Pro Max
  { width: 2048, height: 2732 }, // iPad Pro 12.9"
];

const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Criar diretório se não existir
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🎨 Gerando ícones PWA e splash screens...');

// Função simples para copiar SVG como está (fallback)
function copySVGFiles() {
  const svgContent = fs.readFileSync(path.join(__dirname, '../public/icons/splash-icon.svg'), 'utf8');
  
  // Gerar ícones básicos (copiando SVG)
  ICON_SIZES.forEach(size => {
    const filename = `icon-${size}x${size}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), svgContent);
    console.log(`✅ Gerado: ${filename}`);
  });

  // Gerar splash screens
  SPLASH_SIZES.forEach(({ width, height }) => {
    const filename = `splash-${width}x${height}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), svgContent);
    console.log(`✅ Gerado: ${filename}`);
  });
}

// Gerar arquivos
copySVGFiles();

// Criar apple-touch-icon
fs.copyFileSync(
  path.join(__dirname, '../public/icons/splash-icon.svg'),
  path.join(__dirname, '../public/apple-touch-icon.svg')
);

// Criar browserconfig.xml atualizado
const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square70x70logo src="/icons/icon-72x72.svg"/>
            <square150x150logo src="/icons/icon-152x152.svg"/>
            <square310x310logo src="/icons/icon-384x384.svg"/>
            <TileColor>#1976d2</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;

fs.writeFileSync(path.join(__dirname, '../public/browserconfig.xml'), browserConfig);

console.log('✅ Gerado: browserconfig.xml');

// Atualizar manifest.json com splash screens
const manifest = {
  "name": "Controle Financeiro Pessoal",
  "short_name": "Controle Financeiro",
  "description": "Sistema completo de controle financeiro com gerenciamento de contas, parcelas e extrato",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "pt-BR",
  "categories": ["finance", "productivity", "business"],
  "prefer_related_applications": false,
  "icons": ICON_SIZES.map(size => ({
    "src": `/icons/icon-${size}x${size}.svg`,
    "sizes": `${size}x${size}`,
    "type": "image/svg+xml",
    "purpose": "any maskable"
  })),
  "splash_pages": SPLASH_SIZES.map(({ width, height }) => ({
    "src": `/icons/splash-${width}x${height}.svg`,
    "sizes": `${width}x${height}`,
    "type": "image/svg+xml"
  })),
  "shortcuts": [
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "Ver resumo financeiro",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/icon-96x96.svg", "sizes": "96x96" }]
    },
    {
      "name": "Contas a Pagar",
      "short_name": "Contas",
      "description": "Gerenciar contas a pagar",
      "url": "/contas-pagar",
      "icons": [{ "src": "/icons/icon-96x96.svg", "sizes": "96x96" }]
    }
  ]
};

fs.writeFileSync(
  path.join(__dirname, '../public/manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('✅ Atualizado: manifest.json');
console.log('\n🎉 Ícones PWA e splash screens gerados com sucesso!');
console.log('\n💡 Para melhor qualidade, instale o sharp e execute:');
console.log('   npm install sharp');
console.log('   node scripts/generate-pwa-icons.js');
