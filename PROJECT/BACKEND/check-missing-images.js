const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');
const models = require('./models');

function nameToKey(name){
  return String(name||'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

const projectDir = 'd:\\Documents\\hotel\\PROJECT\\dbms project';
const imagesDir = path.join(projectDir, 'images');

async function checkImages() {
  try {
    const foods = await models.FoodItem.findAll();
    const missing = [];
    
    for (const food of foods) {
      const key = nameToKey(food.name);
      const targetPath = path.join(imagesDir, `${key}.webp`);
      
      const exists = fs.existsSync(targetPath);
      let size = 0;
      if (exists) {
        size = fs.statSync(targetPath).size;
      }
      
      // If the file doesn't exist OR it's the fallback SVG size (around 311 bytes)
      if (!exists || size < 1000) {
        missing.push(food.name);
      }
    }
    
    console.log('Food items with missing or placeholder images:');
    console.log(missing.join('\n'));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkImages();
