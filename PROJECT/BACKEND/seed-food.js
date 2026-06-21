const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');
const models = require('./models');

async function seedFood() {
  try {
    const dataPath = path.join(__dirname, '..', 'dbms project', 'database', 'food_db.json');
    const dbData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Get the first hotel's foodMenu
    const hotel1 = dbData.hotels["1"] || Object.values(dbData.hotels)[0];
    const foodMenu = hotel1.foodMenu;

    for (const [categoryKey, items] of Object.entries(foodMenu)) {
      let catEnum = 'General';
      if (categoryKey === 'breakfast') catEnum = 'Breakfast';
      if (categoryKey === 'lunch') catEnum = 'Lunch';
      if (categoryKey === 'dinner') catEnum = 'Dinner';
      if (categoryKey === 'beverages') catEnum = 'Beverages';

      for (const item of items) {
        let typeEnum = 'Veg';
        if (item.name.toLowerCase().includes('chicken') || item.name.toLowerCase().includes('mutton') || item.name.toLowerCase().includes('egg') || item.name.toLowerCase().includes('omelette') || item.name.toLowerCase().includes('fish')) {
          typeEnum = 'Non-Veg';
        }
        
        await models.FoodItem.findOrCreate({
          where: { name: item.name },
          defaults: {
            price: item.price,
            category: catEnum,
            type: typeEnum
          }
        });
        console.log(`Seeded food: ${item.name}`);
      }
    }
    
    console.log('All food seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding food:', error);
    process.exit(1);
  }
}

seedFood();
