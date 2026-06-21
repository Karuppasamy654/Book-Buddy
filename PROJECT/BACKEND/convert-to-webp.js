const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = 'd:\\Documents\\hotel\\PROJECT\\dbms project\\images';

async function convert() {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.webp')) {
      const p = path.join(dir, file);
      // We will read the file to a buffer
      const buffer = fs.readFileSync(p);
      // Skip very small files (SVGs that were renamed)
      if (buffer.length < 1000) continue;
      
      try {
        const metadata = await sharp(buffer).metadata();
        // If it's already webp format, skip
        if (metadata.format === 'webp') {
          console.log(`Already webp: ${file}`);
          continue;
        }
        
        console.log(`Converting ${file} from ${metadata.format} to webp...`);
        const webpBuffer = await sharp(buffer).webp().toBuffer();
        fs.writeFileSync(p, webpBuffer);
        console.log(`Successfully converted ${file}`);
      } catch (e) {
        console.error(`Error processing ${file}:`, e.message);
      }
    }
  }
}

convert();
