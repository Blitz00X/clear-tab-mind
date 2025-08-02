const fs = require('fs');
const path = require('path');

// Create a simple canvas-based icon generator
const { createCanvas, loadImage } = require('canvas');

async function generateIcons() {
  const sizes = [16, 32, 48, 128];
  
  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Create a simple icon design
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    // Background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Rounded corners
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    // Icon elements
    ctx.fillStyle = 'white';
    const padding = size * 0.2;
    const lineHeight = size * 0.08;
    const lineSpacing = size * 0.15;
    
    // Draw lines representing tabs
    for (let i = 0; i < 3; i++) {
      const y = padding + i * lineSpacing;
      ctx.fillRect(padding, y, size - padding * 2, lineHeight);
    }
    
    // Draw dots
    ctx.fillStyle = '#764ba2';
    const dotSize = size * 0.1;
    ctx.beginPath();
    ctx.arc(size - padding - dotSize, padding + lineSpacing, dotSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size - padding - dotSize, padding + lineSpacing * 2, dotSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Save the PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, 'icons', `icon${size}.png`), buffer);
    console.log(`Generated icon${size}.png`);
  }
}

// If canvas is not available, create simple placeholder files
if (typeof require !== 'undefined' && require.cache[require.resolve('canvas')]) {
  generateIcons().catch(console.error);
} else {
  console.log('Canvas not available, creating placeholder icons...');
  
  // Create simple placeholder PNG files
  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    // Create a minimal PNG file (1x1 pixel, transparent)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x1F, 0x15, 0xC4, 0x89, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
      0xE2, 0x21, 0xBC, 0x33, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    fs.writeFileSync(path.join(__dirname, 'icons', `icon${size}.png`), pngData);
    console.log(`Created placeholder icon${size}.png`);
  }
} 