const { sequelize } = require('./config/database');
const models = require('./models');

async function recreateFoodOrder() {
  try {
    await sequelize.query('DROP TABLE IF EXISTS `order_detail`;');
    await sequelize.query('DROP TABLE IF EXISTS `food_order`;');
    
    // Recreate them based on the updated models
    await models.FoodOrder.sync();
    await models.OrderDetail.sync();
    
    console.log('FoodOrder tables recreated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error recreating tables:', error);
    process.exit(1);
  }
}

recreateFoodOrder();
