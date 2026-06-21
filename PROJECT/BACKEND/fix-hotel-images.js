const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');
const models = require('./models');

const projectDir = 'd:\\Documents\\hotel\\PROJECT\\dbms project';
const imagesDir = path.join(projectDir, 'images');

async function fixHotelImages() {
  try {
    // 1. Create hotel-placeholder.svg if missing
    const placeholderPath = path.join(imagesDir, 'hotel-placeholder.svg');
    const fallbackSource = path.join(imagesDir, 'default-food.svg');
    
    if (!fs.existsSync(placeholderPath)) {
      fs.copyFileSync(fallbackSource, placeholderPath);
      console.log('Created hotel-placeholder.svg');
    }

    // 2. Also create the actual missing images just in case (optional, but good for UX)
    const reportedMissing = [
      'holiday-lnn.jpg', 'ramada.jpg', 'the-park.jpg', 'sheraton.jpg', 
      'taj-connemara.jpg', 'trident.jpg', 'novotel.jpg', 'Radisson Blu Hotel.jpg', 
      'the-leela-palace.jpg', 'itc-hotel.jpg'
    ];
    
    for (const img of reportedMissing) {
      const targetPath = path.join(imagesDir, img);
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(fallbackSource, targetPath);
        console.log(`Created placeholder for missing hotel image: ${img}`);
      }
    }

    // 3. Update database to prepend 'images/' to all image_urls
    const hotels = await models.Hotel.findAll();
    let updatedCount = 0;
    
    for (const hotel of hotels) {
      let currentUrl = hotel.image_url || '';
      // If it doesn't already start with 'images/', fix it
      if (currentUrl && !currentUrl.startsWith('images/')) {
        hotel.image_url = `images/${currentUrl}`;
        await hotel.save();
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} hotel image paths in the database.`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing hotel images:', error);
    process.exit(1);
  }
}

fixHotelImages();
