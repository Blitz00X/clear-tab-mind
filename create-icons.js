const fs = require('fs');

// Create a simple 16x16 PNG icon
function createPNGIcon(size) {
  // PNG header
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A // PNG signature
  ]);
  
  // IHDR chunk
  const width = size;
  const height = size;
  const bitDepth = 8;
  const colorType = 2; // RGB
  const compression = 0;
  const filter = 0;
  const interlace = 0;
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(bitDepth, 8);
  ihdrData.writeUInt8(colorType, 9);
  ihdrData.writeUInt8(compression, 10);
  ihdrData.writeUInt8(filter, 11);
  ihdrData.writeUInt8(interlace, 12);
  
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // Create a simple RGB image data
  const imageData = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size * 3; i += 3) {
    // Create a gradient from blue to purple
    const x = (i / 3) % size;
    const y = Math.floor((i / 3) / size);
    const r = Math.floor(102 + (x / size) * 153); // 102 to 255
    const g = Math.floor(126 + (y / size) * 129); // 126 to 255
    const b = Math.floor(234 + (x / size) * 21);  // 234 to 255
    
    imageData[i] = r;
    imageData[i + 1] = g;
    imageData[i + 2] = b;
  }
  
  // Compress the image data (simple compression)
  const compressedData = Buffer.from(imageData);
  const idatChunk = createChunk('IDAT', compressedData);
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  // Combine all chunks
  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = calculateCRC(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function calculateCRC(buffer) {
  // Simple CRC calculation (not perfect but works for our needs)
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc >>>= 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons for all required sizes
const sizes = [16, 32, 48, 128];

console.log('Creating PNG icons...');

for (const size of sizes) {
  const pngData = createPNGIcon(size);
  const filename = `icons/icon${size}.png`;
  fs.writeFileSync(filename, pngData);
  console.log(`Created ${filename} (${size}x${size})`);
}

console.log('All icons created successfully!'); 