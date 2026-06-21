const express = require('express');
const router = express.Router();
const { sequelize, FoodOrder, OrderDetail, FoodItem, Booking, User, Hotel, HotelFood } = require('../models');
const auth = require('../middleware/auth');

router.post('/create', auth.protect, async (req, res) => {
  try {
    const { booking_id, food_items } = req.body;
    
    let booking = null;
    if (booking_id) {
      booking = await Booking.findOne({
        where: { booking_id, user_id: req.user.user_id },
        include: [{ model: Hotel, as: 'hotel' }]
      });
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      const existingOrder = await FoodOrder.findOne({ where: { booking_id } });
      if (existingOrder) {
        return res.status(400).json({ message: 'Order already exists for this booking' });
      }
    }

    const t = await sequelize.transaction();
    try {
      const foodOrder = await FoodOrder.create({ 
        booking_id: booking_id || null, 
        user_id: req.user.user_id,
        status: 'Pending' 
      }, { transaction: t });

      let totalAmount = 0;
      const orderDetails = [];

      for (const item of food_items) {
        const qty = Number(item.quantity || 0);
        if (!item.food_item_id || qty <= 0) {
          await t.rollback();
          return res.status(400).json({ message: 'Invalid food item or quantity' });
        }

        const foodItem = await FoodItem.findByPk(item.food_item_id, { transaction: t });
        if (!foodItem) {
          await t.rollback();
          return res.status(400).json({ message: `Food item ${item.food_item_id} not found` });
        }

        let hf = null;
        if (booking) {
          try {
            hf = await HotelFood.findOne({ where: { hotel_id: booking.hotel_id, food_item_id: item.food_item_id }, transaction: t });
          } catch (_) {  }
        }

        const unitPrice = (hf && hf.price != null) ? Number(hf.price) : Number(foodItem.price);

        if (hf) {
          if (hf.stock == null || Number(hf.stock) < qty) {
            await t.rollback();
            return res.status(400).json({ message: `Insufficient stock for ${foodItem.name}`, food_item_id: item.food_item_id });
          }
          await hf.update({ stock: Number(hf.stock) - qty }, { transaction: t });
        }

        const subtotal = unitPrice * qty;
        totalAmount += subtotal;

        orderDetails.push({
          order_id: foodOrder.order_id,
          food_item_id: item.food_item_id,
          quantity: qty,
          subtotal
        });
      }

      await OrderDetail.bulkCreate(orderDetails, { transaction: t });
      await t.commit();

      return res.status(201).json({
        message: 'Order created successfully',
        order: {
          order_id: foodOrder.order_id,
          booking_id: foodOrder.booking_id,
          status: foodOrder.status,
          total_amount: totalAmount,
          items: orderDetails
        }
      });
    } catch (e) {
      if (typeof t?.rollback === 'function') await t.rollback();
      throw e;
    }
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:order_id', auth.protect, async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const order = await FoodOrder.findOne({
      where: { order_id },
      include: [
        {
          model: OrderDetail,
          as: 'orderDetails',
          include: [{ model: FoodItem, as: 'foodItem' }]
        },
        {
          model: Booking,
          as: 'booking',
          include: [
            { model: User, as: 'user' },
            { model: Hotel, as: 'hotel' }
          ]
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/stock', auth.protect, async (req, res) => {
  try {
    const { hotel_id } = req.query;
    if (!hotel_id) return res.status(400).json({ success: false, message: 'hotel_id is required' });
    try {
      const rows = await HotelFood.findAll({ where: { hotel_id: Number(hotel_id) } });
      const data = rows.map(r => ({
        food_item_id: r.food_item_id,
        stock: r.stock == null ? null : Number(r.stock),
        price: r.price == null ? null : Number(r.price)
      }));
      return res.json({ success: true, data });
    } catch (e) {
      const code = (e && (e.original && e.original.code)) || (e && e.parent && e.parent.code);
      const msg = (e && (e.original && e.original.message)) || (e && e.parent && e.parent.message) || '';
      if (code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))) {
        return res.json({ success: true, data: [] });
      }
      throw e;
    }
  } catch (error) {
    console.error('Stock lookup failed:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;