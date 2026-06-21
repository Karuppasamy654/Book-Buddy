const express = require('express');
const router = express.Router();
const db = require('../models');
const { sequelize, FoodItem, Hotel, User, HotelFood, StaffAssignment, Booking, Room, FoodOrder, OrderDetail } = db;
const { protect, authorize } = require('../middleware/auth');

const requireManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Access denied. Manager role required.' });
  }
  next();
};

router.put('/food/:food_item_id/price', protect, authorize('manager'), async (req, res) => {
  try {
    const { food_item_id } = req.params;
    const { price } = req.body;
    
    if (price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }
    
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    if (!me || String(me.role).toLowerCase() !== 'manager' && String(me.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized for this operation' });
    }
    if (db.HotelFood) {
      try {
        const link = await db.HotelFood.findOne({ where: { hotel_id: me.hotel_id, food_item_id } });
        if (!link) {
          const hotels = await Hotel.findAll({ attributes: ['hotel_id'] });
          const existingLinks = await db.HotelFood.findAll({ where: { food_item_id } });
          const linked = new Set(existingLinks.map(l => Number(l.hotel_id)));
          const toCreate = hotels
            .map(h => Number(h.hotel_id))
            .filter(hid => !linked.has(hid))
            .map(hid => ({ hotel_id: hid, food_item_id }));
          if (toCreate.length) {
            await db.HotelFood.bulkCreate(toCreate);
          }
        }
      } catch (e) {
        const code = (e && (e.original && e.original.code)) || (e && e.parent && e.parent.code);
        const msg = (e && (e.original && e.original.message)) || (e && e.parent && e.parent.message) || '';
        if (!(code === '42P01' || msg.includes('relation') && msg.includes('does not exist'))) throw e;
      }
    }

    const t = await sequelize.transaction();
    const foodItem = await FoodItem.findByPk(food_item_id, { transaction: t });
    if (!foodItem) {
      await t.rollback();
      return res.status(404).json({ message: 'Food item not found' });
    }

    let oldPrice = foodItem.price;
    let scope = 'hotel';
    if (db.HotelFood) {
      let link = await db.HotelFood.findOne({ where: { hotel_id: me.hotel_id, food_item_id }, transaction: t });
      if (!link) {
        link = await db.HotelFood.create({ hotel_id: me.hotel_id, food_item_id }, { transaction: t });
      }
      const qi = sequelize.getQueryInterface();
      const desc = await qi.describeTable('hotel_foods').catch(() => ({}));
      if (!desc.price) {
        scope = 'global';
        oldPrice = foodItem.price;
        await foodItem.update({ price }, { transaction: t });
      } else {
        oldPrice = link.price ?? oldPrice;
        await link.update({ price }, { transaction: t });
      }
    } else {
      scope = 'global';
      oldPrice = foodItem.price;
      await foodItem.update({ price }, { transaction: t });
    }

    const updated_orders = 0;

    await t.commit();
    res.json({
      message: scope === 'hotel' ? 'Food item price updated for this hotel' : 'Food item price updated',
      scope,
      food_item: {
        food_item_id: foodItem.food_item_id,
        name: foodItem.name,
        old_price: oldPrice,
        new_price: price,
        updated_orders
      }
    });
    
  } catch (error) {
    console.error('Error updating food price:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/food/:food_item_id/stock', protect, authorize('manager'), async (req, res) => {
  try {
    const { food_item_id } = req.params;
    const { delta, stock } = req.body || {};
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    if (!me || String(me.role).toLowerCase() !== 'manager' && String(me.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const qi = sequelize.getQueryInterface();
    let desc = {};
    try { desc = await qi.describeTable('hotel_foods'); } catch (e) {
      const code = (e && (e.original && e.original.code)) || (e && e.parent && e.parent.code);
      const msg = (e && (e.original && e.original.message)) || (e && e.parent && e.parent.message) || '';
      if (code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))) {
        return res.status(400).json({ success: false, message: 'hotel_foods table not found; stock feature unavailable' });
      }
      throw e;
    }
    if (!desc.stock) {
      return res.status(400).json({ success: false, message: 'hotel_foods.stock column missing; add it to enable inventory' });
    }
    let link = await HotelFood.findOne({ where: { hotel_id: me.hotel_id, food_item_id } });
    if (!link) {
      link = await HotelFood.create({ hotel_id: me.hotel_id, food_item_id, stock: 0 });
    }
    let newStock = link.stock == null ? 0 : Number(link.stock);
    if (typeof stock === 'number') newStock = stock;
    else if (typeof delta === 'number') newStock = Math.max(0, newStock + delta);
    await link.update({ stock: newStock });
    return res.json({ success: true, message: 'Stock updated', data: { hotel_id: me.hotel_id, food_item_id: Number(food_item_id), stock: newStock } });
  } catch (e) {
    console.error('Adjust stock failed:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/tasks/mine', protect, async (req, res) => {
  try {
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role'] });
    if (!me || String(me.role).toLowerCase() !== 'staff') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const tasks = await StaffAssignment.findAll({ where: { staff_id: me.user_id }, order: [['assigned_at', 'DESC']] });
    return res.json({ success: true, data: tasks });
  } catch (e) {
    console.error('Staff list mine failed:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/tasks/:task_id/status', protect, async (req, res) => {
  try {
    const { task_id } = req.params;
    const { status } = req.body;
    const allowed = ['Pending','In Progress','Complete','Overdue'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role'] });
    if (!me || String(me.role).toLowerCase() !== 'staff') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const task = await StaffAssignment.findByPk(task_id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.staff_id !== me.user_id) return res.status(403).json({ success: false, message: 'Unauthorized for this task' });
    await task.update({ status });
    return res.json({ success: true, message: 'Task updated', data: task });
  } catch (e) {
    console.error('Staff update status failed:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/food/:food_item_id', protect, authorize('manager'), async (req, res) => {
  try {
    const { food_item_id } = req.params;
    const { name, price, category, type } = req.body;
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    if (!me || String(me.role).toLowerCase() !== 'manager' && String(me.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized for this operation' });
    }
    if (db.HotelFood) {
      try {
        const link = await db.HotelFood.findOne({ where: { hotel_id: me.hotel_id, food_item_id } });
        if (!link) {
          const hotels = await Hotel.findAll({ attributes: ['hotel_id'] });
          const existingLinks = await db.HotelFood.findAll({ where: { food_item_id } });
          const linked = new Set(existingLinks.map(l => Number(l.hotel_id)));
          const toCreate = hotels
            .map(h => Number(h.hotel_id))
            .filter(hid => !linked.has(hid))
            .map(hid => ({ hotel_id: hid, food_item_id }));
          if (toCreate.length) {
            await db.HotelFood.bulkCreate(toCreate);
          }
        }
      } catch (e) {
        const code = (e && (e.original && e.original.code)) || (e && e.parent && e.parent.code);
        const msg = (e && (e.original && e.original.message)) || (e && e.parent && e.parent.message) || '';
        if (!(code === '42P01' || msg.includes('relation') && msg.includes('does not exist'))) throw e;
      }
    }

    const t = await sequelize.transaction();
    const foodItem = await FoodItem.findByPk(food_item_id, { transaction: t });
    if (!foodItem) {
      await t.rollback();
      return res.status(404).json({ message: 'Food item not found' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (price) updateData.price = price;
    if (category) updateData.category = category;
    if (type) updateData.type = type; // optional legacy field
    await foodItem.update(updateData, { transaction: t });
    await t.commit();
    
    res.json({
      message: 'Food item updated successfully',
      food_item: foodItem
    });
    
  } catch (error) {
    console.error('Error updating food item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/food', protect, authorize('manager'), async (req, res) => {
  try {
    const { name, price, category, type } = req.body;
    
    const foodItem = await FoodItem.create({
      name,
      price,
      category,
      type
    });
    
    res.status(201).json({
      message: 'Food item created successfully',
      food_item: foodItem
    });
    
  } catch (error) {
    console.error('Error creating food item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/hotel/:hotel_id/room-price', protect, authorize('manager'), async (req, res) => {
  try {
    const { hotel_id } = req.params;
    const { base_price_per_night } = req.body;
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    if (!me || String(me.role).toLowerCase() !== 'manager' && String(me.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized for this hotel' });
    }
    const t = await sequelize.transaction();
    const hotel = await Hotel.findByPk(hotel_id, { transaction: t });
    if (!hotel) {
      await t.rollback();
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    const oldPrice = hotel.base_price_per_night;
    await hotel.update({ base_price_per_night }, { transaction: t });
    await t.commit();
    res.json({
      message: 'Hotel room price updated successfully',
      hotel: {
        hotel_id: hotel.hotel_id,
        name: hotel.name,
        old_price: oldPrice,
        new_price: base_price_per_night
      }
    });
    
  } catch (error) {
    console.error('Error updating hotel price:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/tasks', protect, authorize('manager'), async (req, res) => {
  try {
    const { staffEmail, title, description, due_date, shift = 'Morning' } = req.body;
    if (!staffEmail || !title) {
      return res.status(400).json({ success: false, message: 'staffEmail and title are required' });
    }
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    if (!me || String(me.role).toLowerCase() !== 'manager' && String(me.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const hotel = await Hotel.findByPk(me.hotel_id);
    const staff = await User.findOne({ where: { email: staffEmail }, attributes: ['user_id','email','role','hotel_id'] });
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }
    if (staff.hotel_id !== me.hotel_id) {
      return res.status(403).json({ success: false, message: 'Staff does not belong to your hotel' });
    }
    const { Op } = require('sequelize');
    const activeCount = await StaffAssignment.count({ where: { hotel_id: me.hotel_id, shift, status: { [Op.in]: ['Pending','In Progress'] } } });
    const limitPerShift = (hotel && hotel.max_staff_per_shift) ? hotel.max_staff_per_shift : 3;
    if (activeCount >= limitPerShift) {
      return res.status(400).json({ success: false, message: `Max ${limitPerShift} staff allowed on ${shift} shift` });
    }
    const task = await StaffAssignment.create({
      staff_id: staff.user_id,
      hotel_id: me.hotel_id,
      title,
      details: description || null,
      shift,
      status: 'Pending'
    });
    return res.status(201).json({ success: true, message: 'Task assigned', data: task });
  } catch (e) {
    console.error('Assign task failed:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/tasks', protect, authorize('manager'), async (req, res) => {
  try {
    const { staffEmail } = req.query;
    if (!staffEmail) {
      return res.status(400).json({ success: false, message: 'staffEmail is required' });
    }
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    const staff = await User.findOne({ where: { email: staffEmail }, attributes: ['user_id','hotel_id'] });
    if (!staff) {
      return res.json({ success: true, data: [] });
    }
    if (staff.hotel_id !== me.hotel_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this staff' });
    }
    const tasks = await StaffAssignment.findAll({ where: { staff_id: staff.user_id }, order: [['assigned_at', 'DESC']] });
    return res.json({ success: true, data: tasks });
  } catch (e) {
    console.error('List tasks failed:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/tasks/:task_id', protect, authorize('manager'), async (req, res) => {
  try {
    const { task_id } = req.params;
    const { status } = req.body;
    const allowed = ['Pending','In Progress','Complete','Overdue'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    const task = await StaffAssignment.findByPk(task_id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.hotel_id !== me.hotel_id) return res.status(403).json({ success: false, message: 'Unauthorized for this task' });
    await task.update({ status });
    return res.json({ success: true, message: 'Task updated', data: task });
  } catch (e) {
    console.error('Update task failed:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/staff', protect, authorize('manager'), async (req, res) => {
  try {
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    if (!me || String(me.role).toLowerCase() !== 'manager' && String(me.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const staff = await User.findAll({
      where: { role: 'staff', hotel_id: me.hotel_id },
      attributes: ['user_id','name','email','hotel_id']
    });
    return res.json({ success: true, data: staff });
  } catch (e) {
    console.error('List staff failed:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/analytics', protect, authorize('manager'), async (req, res) => {
  try {
    const me = await User.findByPk(req.user.user_id, { attributes: ['user_id','role','hotel_id'] });
    if (!me || String(me.role).toLowerCase() !== 'manager' && String(me.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const total_bookings_all_time = await Booking.count({ where: { hotel_id: me.hotel_id } });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const { Op } = require('sequelize');

    const total_bookings_this_month = await Booking.count({ where: { hotel_id: me.hotel_id, check_in_date: { [Op.gte]: start, [Op.lt]: end } } }).catch(() => 0);

    let room_revenue_this_month = 0;
    try {
      const sumRows = await Booking.findAll({
        where: { hotel_id: me.hotel_id, check_in_date: { [Op.gte]: start, [Op.lt]: end } },
        attributes: [[
          sequelize.fn('sum', sequelize.literal('COALESCE("grand_total", COALESCE("room_total",0) + COALESCE("food_total",0))')),
          'sum'
        ]]
      });
      room_revenue_this_month = Number((sumRows && sumRows[0] && sumRows[0].get('sum')) || 0);
    } catch (_) {
      const roomRevRows = await Booking.findAll({
        where: { hotel_id: me.hotel_id, check_in_date: { [Op.gte]: start, [Op.lt]: end } },
        attributes: [[sequelize.fn('sum', sequelize.col('grand_total')), 'sum']]
      });
      room_revenue_this_month = Number((roomRevRows && roomRevRows[0] && roomRevRows[0].get('sum')) || 0);
    }

    let food_revenue_this_month = 0;
    try {
      const foodRows = await OrderDetail.findAll({
        include: [{
          model: FoodOrder,
          as: 'foodOrder',
          include: [{
            model: Booking,
            as: 'booking',
            where: { hotel_id: me.hotel_id, check_in_date: { [Op.gte]: start, [Op.lt]: end } },
            attributes: []
          }],
          attributes: []
        }],
        attributes: [[sequelize.fn('sum', sequelize.col('subtotal')), 'sum']]
      });
      food_revenue_this_month = Number((foodRows && foodRows[0] && foodRows[0].get('sum')) || 0);
    } catch (_) {
    }

    const revenue_this_month = room_revenue_this_month + food_revenue_this_month;

    let room_revenue_all_time = 0;
    try {
      const sumAll = await Booking.findAll({
        where: { hotel_id: me.hotel_id },
        attributes: [[
          sequelize.fn('sum', sequelize.literal('COALESCE("grand_total", COALESCE("room_total",0) + COALESCE("food_total",0))')),
          'sum'
        ]]
      });
      room_revenue_all_time = Number((sumAll && sumAll[0] && sumAll[0].get('sum')) || 0);
    } catch (_) {}
    let food_revenue_all_time = 0;
    try {
      const foodAll = await OrderDetail.findAll({
        include: [{
          model: FoodOrder,
          as: 'foodOrder',
          include: [{ model: Booking, as: 'booking', where: { hotel_id: me.hotel_id }, attributes: [] }],
          attributes: []
        }],
        attributes: [[sequelize.fn('sum', sequelize.col('subtotal')), 'sum']]
      });
      food_revenue_all_time = Number((foodAll && foodAll[0] && foodAll[0].get('sum')) || 0);
    } catch (_) {}
    const revenue_all_time = room_revenue_all_time + food_revenue_all_time;

    const total_rooms = await Room.count({ where: { hotel_id: me.hotel_id } });
    const occupied_rooms = await Room.count({ where: { hotel_id: me.hotel_id, status: 'Occupied' } });
    const occupancy_rate = total_rooms > 0 ? Math.round((occupied_rooms / total_rooms) * 100) : 0;

    return res.json({ success: true, data: {
      total_bookings_all_time,
      total_bookings_this_month,
      room_revenue_this_month,
      food_revenue_this_month,
      revenue_this_month,
      room_revenue_all_time,
      food_revenue_all_time,
      revenue_all_time,
      occupancy_rate
    } });
  } catch (e) {
    console.error('Analytics failed:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
