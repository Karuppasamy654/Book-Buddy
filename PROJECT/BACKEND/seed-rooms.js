const { sequelize } = require('./config/database');
const models = require('./models');

async function seedRooms() {
  try {
    const types = [
      { name: 'Standard', max_capacity: 2, price_multiplier: 1.0 },
      { name: 'Deluxe', max_capacity: 3, price_multiplier: 1.5 },
      { name: 'Suite', max_capacity: 4, price_multiplier: 2.5 },
      { name: 'Presidential', max_capacity: 6, price_multiplier: 4.0 }
    ];

    const typeDocs = [];
    for (const t of types) {
      const [typeDoc] = await models.RoomType.findOrCreate({
        where: { name: t.name },
        defaults: t
      });
      typeDocs.push(typeDoc);
    }

    const hotels = await models.Hotel.findAll();

    for (const hotel of hotels) {
      // Check if hotel already has rooms
      const existingRooms = await models.Room.count({ where: { hotel_id: hotel.hotel_id } });
      if (existingRooms > 0) {
        console.log(`Hotel ${hotel.name} already has rooms.`);
        continue;
      }

      // Add 20 rooms to each hotel
      for (let i = 1; i <= 20; i++) {
        const floor = Math.ceil(i / 5);
        const num = (i % 5) === 0 ? 5 : (i % 5);
        const roomNumber = `${floor}0${num}`;

        // Assign room type based on floor
        let typeId = typeDocs[0].room_type_id; // Standard
        if (floor === 3) typeId = typeDocs[1].room_type_id; // Deluxe
        if (floor === 4) typeId = typeDocs[2].room_type_id; // Suite
        
        await models.Room.create({
          room_number: `${hotel.hotel_id}-${roomNumber}`, // prefix with hotel id to make it unique across hotels if needed, but primary key is (room_number, hotel_id)
          hotel_id: hotel.hotel_id,
          room_type_id: typeId,
          status: 'Vacant'
        });
      }
      console.log(`Seeded 20 rooms for Hotel: ${hotel.name}`);
    }

    console.log('Room seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding rooms:', err);
    process.exit(1);
  }
}

seedRooms();
