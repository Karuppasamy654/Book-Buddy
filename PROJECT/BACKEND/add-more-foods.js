const { sequelize } = require('./config/database');
const models = require('./models');

async function addMoreFoods() {
  try {
    const newFoods = [
      { name: 'Pancakes with Maple Syrup', price: 150, category: 'Breakfast', type: 'Veg', img: 'pancakes.webp' },
      { name: 'Masala Dosa', price: 120, category: 'Breakfast', type: 'Veg', img: 'masala_dosa.webp' },
      { name: 'Club Sandwich', price: 180, category: 'Lunch', type: 'Non-Veg', img: 'club_sandwich.webp' },
      { name: 'Grilled Chicken Salad', price: 220, category: 'Lunch', type: 'Non-Veg', img: 'chicken_salad.webp' },
      { name: 'Pasta Alfredo', price: 250, category: 'Dinner', type: 'Veg', img: 'pasta_alfredo.webp' },
      { name: 'Margherita Pizza', price: 300, category: 'Dinner', type: 'Veg', img: 'pizza.webp' },
      { name: 'Mutton Rogan Josh', price: 350, category: 'Dinner', type: 'Non-Veg', img: 'mutton_rogan.webp' },
      { name: 'Virgin Mojito', price: 110, category: 'Beverages', type: 'Veg', img: 'mojito.webp' },
      { name: 'Cold Coffee with Ice Cream', price: 140, category: 'Beverages', type: 'Veg', img: 'cold_coffee.webp' },
      { name: 'Chocolate Brownie', price: 130, category: 'Beverages', type: 'Veg', img: 'brownie.webp' } // Categorized as Beverages for now if Desserts doesn't exist in enum
    ];

    for (const food of newFoods) {
      await models.FoodItem.findOrCreate({
        where: { name: food.name },
        defaults: {
          price: food.price,
          category: food.category,
          type: food.type
        }
      });
      console.log(`Added food: ${food.name}`);
    }
    
    console.log('Successfully added more food items.');
    process.exit(0);
  } catch (error) {
    console.error('Error adding more foods:', error);
    process.exit(1);
  }
}

addMoreFoods();
