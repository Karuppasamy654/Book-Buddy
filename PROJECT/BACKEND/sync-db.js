const { sequelize } = require('./config/database');
const models = require('./models');

async function syncDb() {
  try {
    await sequelize.query('PRAGMA foreign_keys = OFF');
    await sequelize.sync({ alter: true });
    await sequelize.query('PRAGMA foreign_keys = ON');
    console.log('Database synced with alter: true');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing DB:', error);
    process.exit(1);
  }
}

syncDb();
