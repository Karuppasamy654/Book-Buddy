const { sequelize } = require('./config/database');
const bcrypt = require('bcryptjs');
const models = require('./models'); // Loads models and does association

async function initDB() {
  try {
    console.log('Syncing database...');
    // Sync all models (force: true drops existing tables)
    await sequelize.sync({ force: true });
    console.log('Database synced successfully.');

    console.log('Seeding initial data...');
    // Seed admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await models.User.create({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin User',
      email: 'admin@bookbuddy.com',
      password_hash: hashedPassword,
      role: 'admin',
      phone: '1234567890'
    });

    const managerPassword = await bcrypt.hash('manager123', salt);
    await models.User.create({
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Manager User',
      email: 'rajesh@bookbuddy.com',
      password_hash: managerPassword,
      role: 'manager',
      phone: '0987654321'
    });

    const customerPassword = await bcrypt.hash('customer123', salt);
    await models.User.create({
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Customer User',
      email: 'amit@example.com',
      password_hash: customerPassword,
      role: 'customer',
      phone: '1112223333'
    });

    console.log('Seeding completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDB();
