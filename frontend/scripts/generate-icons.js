#!/usr/bin/env node

/**
 * Script para gerar ícones PWA a partir de uma imagem base
 * Requer: npm install sharp canvas
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_ICON = path.join(__dirname, '../public/icon-base.png'); // Imagem base 512x512
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Criar diretório se não existir
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('🎨 Gerando ícones PWA...');

    for (const size of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
      
      await sharp(INPUT_ICON)
        .resize(size, size, {
          fit: 'cover',
          background: { r: 25, g: 118, b: 210, alpha: 1 } // Cor primária #1976d2
        })
        .png({ quality: 90 })
        .toFile(outputPath);

      console.log(`✅ Gerado: icon-${size}x${size}.png`);
    }

    // Gerar favicon.ico
    await sharp(INPUT_ICON)
      .resize(32, 32)
      .toFile(path.join(__dirname, '../public/favicon.ico'));

    console.log('✅ Gerado: favicon.ico');
    console.log('🎉 Ícones PWA gerados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao gerar ícones:', error);
    console.log('\n💡 Dica: Crie uma imagem base em public/icon-base.png (512x512px)');
    console.log('   Ou use ferramentas online como: https://www.pwabuilder.com/imageGenerator');
  }
}

// Verificar se imagem base existe
if (!fs.existsSync(INPUT_ICON)) {
  console.log('❌ Imagem base não encontrada:', INPUT_ICON);
  console.log('\n📝 Para gerar ícones PWA:');
  console.log('1. Crie uma imagem 512x512px chamada icon-base.png na pasta public/');
  console.log('2. Execute: npm run generate-icons');
  console.log('3. Ou use geradores online como PWA Builder');
  process.exit(1);
}

generateIcons();
