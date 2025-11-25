/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Colores del tema EcoEstudiante
const backgroundColor = '#4caf50'; // Verde
const foregroundColor = '#ffffff'; // Blanco

// Tamaños requeridos para PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Crear directorio si no existe
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Función para crear un icono SVG
function createSVG(size) {
  const fontSize = size * 0.4;
  const textY = size * 0.6;
  
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
  <text 
    x="50%" 
    y="${textY}" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}" 
    font-weight="bold" 
    fill="${foregroundColor}" 
    text-anchor="middle" 
    dominant-baseline="middle"
  >EE</text>
</svg>`;
}

// Generar iconos en todos los tamaños
async function generateIcons() {
  console.log('Generando iconos PWA...');
  
  for (const size of sizes) {
    const svg = createSVG(size);
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generado: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Error generando icon-${size}x${size}.png:`, error.message);
    }
  }
  
  console.log('\n¡Iconos PWA generados exitosamente!');
  console.log(`Ubicación: ${iconsDir}`);
}

generateIcons().catch(console.error);


