#!/usr/bin/env node

/**
 * Script simples para criar ícones PWA básicos
 * Cria ícones de diferentes tamanhos usando Canvas API
 */

const fs = require('fs');
const path = require('path');

// Criar ícones básicos usando data URI
const createBasicIcon = (size) => {
  // Ícone simples: círculo azul com "R$"
  const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blueGradient${size}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1976d2;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1565c0;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background circle -->
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - size/20}" fill="url(#blueGradient${size})" stroke="#ffffff" stroke-width="${size/50}"/>
      
      <!-- Money symbol -->
      <text x="${size/2}" y="${size/2 + size/5}" font-family="Arial, sans-serif" font-size="${size/2}" font-weight="bold" text-anchor="middle" fill="white">R$</text>
    </svg>
  `;
  
  return canvas;
};

const SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Criar diretório se não existir
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('🎨 Gerando ícones PWA básicos...');

    for (const size of SIZES) {
      const svgContent = createBasicIcon(size);
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.svg`);
      
      fs.writeFileSync(outputPath, svgContent);
      console.log(`✅ Gerado: icon-${size}x${size}.svg`);
    }

    // Criar favicon.ico básico
    const faviconSvg = createBasicIcon(32);
    fs.writeFileSync(path.join(OUTPUT_DIR, '../favicon.ico'), faviconSvg);
    console.log('✅ Gerado: favicon.ico');

    // Criar browserconfig.xml
    const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square70x70logo src="/icons/icon-72x72.png"/>
            <square150x150logo src="/icons/icon-150x150.png"/>
            <square310x310logo src="/icons/icon-310x310.png"/>
            <TileColor>#1976d2</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, '../browserconfig.xml'), browserConfig);
    console.log('✅ Gerado: browserconfig.xml');

    console.log('🎉 Ícones PWA básicos gerados com sucesso!');
    console.log('\n💡 Para melhor qualidade, use ferramentas online como:');
    console.log('   - https://www.pwabuilder.com/imageGenerator');
    console.log('   - https://realfavicongenerator.net/');

  } catch (error) {
    console.error('❌ Erro ao gerar ícones:', error);
  }
}

generateIcons();
