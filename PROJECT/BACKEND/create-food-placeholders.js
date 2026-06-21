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
const defaultFood = path.join(imagesDir, 'default-food.svg');

async function fixMissingFoodImages() {
  try {
    const foods = await models.FoodItem.findAll();
    let count = 0;
    
    for (const food of foods) {
      const key = nameToKey(food.name);
      const targetPath = path.join(imagesDir, `${key}.webp`);
      
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(defaultFood, targetPath);
        console.log(`Created fallback for ${food.name} -> ${key}.webp`);
        count++;
      }
    }
    
    console.log(`Created ${count} fallback images to prevent 404s.`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing missing food images:', error);
    process.exit(1);
  }
}

fixMissingFoodImages();
