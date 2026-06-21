const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');
const models = require('./models');

async function seedHotels() {
  try {
    const dataPath = path.join(__dirname, '..', 'dbms project', 'database', 'hotels_db.json');
    const dbData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const hotels = dbData.hotels;

    for (const key in hotels) {
      const h = hotels[key];
      const basePrice = h.pricing ? h.pricing.standard : 5000;
      
      await models.Hotel.findOrCreate({
        where: { name: h.name },
        defaults: {
          location: h.location || 'Unknown',
          address: h.description || '',
          rating: h.rating || 4.0,
          base_price_per_night: basePrice,
          image_url: h.image || 'default-hotel.jpg'
        }
      });
      console.log(`Seeded hotel: ${h.name}`);
    }
    console.log('All hotels seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding hotels:', error);
    process.exit(1);
  }
}

seedHotels();
