const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { FoodItem, Hotel, HotelFood } = require('../models');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadMultiple } = require('../middleware/upload');

const router = express.Router();

router.get('/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().isIn(['Breakfast', 'Lunch', 'Dinner', 'Beverages']).withMessage('Invalid category'),
    query('subcategory').optional().isIn(['Veg', 'Non-Veg', 'General']).withMessage('Invalid subcategory'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
    query('search').optional().trim(),
    query('sort').optional().isIn(['price', '-price', 'name', '-name', 'food_item_id', '-food_item_id'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {};


    if (req.query.category) {
      whereClause.category = req.query.category;
    }

    if (req.query.subcategory) {
      whereClause.type = req.query.subcategory;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      whereClause.price = {};
      if (req.query.minPrice) {
        whereClause.price[Op.gte] = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        whereClause.price[Op.lte] = parseFloat(req.query.maxPrice);
      }
    }

    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    let order = [['food_item_id', 'DESC']];
    if (req.query.sort) {
      const sortFieldRaw = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';
      const sortable = new Set(['price', 'name', 'food_item_id']);
      const sortField = sortable.has(sortFieldRaw) ? sortFieldRaw : 'food_item_id';
      order = [[sortField, sortOrder]];
    }

    const include = [];

    const { count, rows: foodItems } = await FoodItem.findAndCountAll({
      where: whereClause,
      order,
      limit,
      offset,
      include
    });

    let resultData = foodItems.map(f => f.toJSON ? f.toJSON() : f);
    if (req.query.hotel_id && HotelFood) {
      try {
        const overrides = await HotelFood.findAll({
          where: { hotel_id: req.query.hotel_id, food_item_id: resultData.map(f => f.food_item_id) }
        });
        const overrideMap = new Map();
        overrides.forEach(o => overrideMap.set(o.food_item_id, o.price));
        
        resultData = resultData.map(item => {
          if (overrideMap.has(item.food_item_id) && overrideMap.get(item.food_item_id) !== null) {
            item.price = overrideMap.get(item.food_item_id);
          }
          return item;
        });
      } catch (err) {
        // Fallback to global prices if table missing
      }
    }

    res.json({
      success: true,
      count: resultData.length,
      total: count,
      page,
      pages: Math.ceil(count / limit),
      data: resultData
    });
  })
);

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const foodItem = await FoodItem.findByPk(id);

  if (!foodItem) {
    return res.status(404).json({
      success: false,
      message: 'Food item not found'
    });
  }

  res.json({
    success: true,
    data: foodItem
  });
}));

router.post('/',
  protect,
  authorize('manager', 'admin'),
  uploadMultiple('foodImages', 5),
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isIn(['breakfast', 'lunch', 'dinner', 'beverages', 'desserts', 'snacks']).withMessage('Invalid category'),
    body('subcategory').optional().isIn(['veg', 'non-veg', 'vegan', 'jain', 'continental', 'indian', 'chinese', 'italian', 'mexican']),
    body('hotel').isMongoId().withMessage('Valid hotel ID is required'),
    body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
    body('allergens').optional().isArray().withMessage('Allergens must be an array'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('preparationTime').optional().isInt({ min: 1 }).withMessage('Preparation time must be a positive integer'),
    body('spiceLevel').optional().isInt({ min: 0, max: 5 }).withMessage('Spice level must be 0-5')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const hotel = await Hotel.findById(req.body.hotel);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    if (req.user.role !== 'admin' && hotel.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to add food items to this hotel.'
      });
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        images.push({
          url: file.url,
          alt: `${req.body.name} - Image ${index + 1}`,
          isPrimary: index === 0
        });
      });
    }

    const foodItemData = {
      ...req.body,
      createdBy: req.user._id,
      images
    };

    const foodItem = await FoodItem.create(foodItemData);

    res.status(201).json({
      success: true,
      message: 'Food item created successfully',
      data: foodItem
    });
  })
);

router.put('/:id',
  protect,
  authorize('manager', 'admin'),
  uploadMultiple('foodImages', 5),
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('price').optional().isFloat({ min: 0 }),
    body('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'beverages', 'desserts', 'snacks']),
    body('subcategory').optional().isIn(['veg', 'non-veg', 'vegan', 'jain', 'continental', 'indian', 'chinese', 'italian', 'mexican']),
    body('ingredients').optional().isArray(),
    body('allergens').optional().isArray(),
    body('tags').optional().isArray(),
    body('preparationTime').optional().isInt({ min: 1 }),
    body('spiceLevel').optional().isInt({ min: 0, max: 5 }),
    body('isAvailable').optional().isBoolean(),
    body('isPopular').optional().isBoolean(),
    body('isSpicy').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    if (req.user.role !== 'admin') {
      const hotel = await Hotel.findById(foodItem.hotel);
      if (hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to update this food item.'
        });
      }
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: file.url,
        alt: `${foodItem.name} - Image ${foodItem.images.length + index + 1}`,
        isPrimary: false
      }));
      foodItem.images.push(...newImages);
    }

    const allowedUpdates = [
      'name', 'description', 'price', 'category', 'subcategory',
      'ingredients', 'allergens', 'tags', 'preparationTime',
      'spiceLevel', 'isAvailable', 'isPopular', 'isSpicy'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        foodItem[field] = req.body[field];
      }
    });

    await foodItem.save();

    res.json({
      success: true,
      message: 'Food item updated successfully',
      data: foodItem
    });
  })
);

router.delete('/:id',
  protect,
  authorize('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    if (req.user.role !== 'admin') {
      const hotel = await Hotel.findById(foodItem.hotel);
      if (hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to delete this food item.'
        });
      }
    }

    await FoodItem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Food item deleted successfully'
    });
  })
);

router.post('/:id/rating',
  protect,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().trim().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { rating, review } = req.body;

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    await foodItem.addRating(req.user._id, rating, review);

    res.json({
      success: true,
      message: 'Rating added successfully',
      data: {
        averageRating: foodItem.averageRating,
        ratingCount: foodItem.ratings.length
      }
    });
  })
);

router.get('/popular',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('hotel').optional().isMongoId().withMessage('Hotel ID must be valid')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const filter = { isPopular: true, isAvailable: true };

    if (req.query.hotel) {
      filter.hotel = req.query.hotel;
    }

    const popularItems = await FoodItem.find(filter)
      .populate('hotel', 'name location')
      .sort({ totalOrders: -1, averageRating: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      count: popularItems.length,
      data: popularItems
    });
  })
);

router.get('/search',
  [
    query('q').trim().notEmpty().withMessage('Search query is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('hotel').optional().isMongoId().withMessage('Hotel ID must be valid')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.q;
    const filter = {
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { ingredients: { $in: [new RegExp(searchQuery, 'i')] } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } }
      ],
      isAvailable: true
    };

    if (req.query.hotel) {
      filter.hotel = req.query.hotel;
    }

    const foodItems = await FoodItem.find(filter)
      .populate('hotel', 'name location')
      .sort({ averageRating: -1, totalOrders: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await FoodItem.countDocuments(filter);

    res.json({
      success: true,
      count: foodItems.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: foodItems
    });
  })
);

router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await FoodItem.distinct('category', { isAvailable: true });
  
  const categoryData = await Promise.all(
    categories.map(async (category) => {
      const count = await FoodItem.countDocuments({ category, isAvailable: true });
      return { category, count };
    })
  );

  res.json({
    success: true,
    data: categoryData
  });
}));

router.put('/:id/availability',
  protect,
  authorize('manager', 'admin'),
  [
    body('isAvailable').isBoolean().withMessage('Availability must be boolean')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isAvailable } = req.body;

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    if (req.user.role !== 'admin') {
      const hotel = await Hotel.findById(foodItem.hotel);
      if (hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to update this food item.'
        });
      }
    }

    await foodItem.updateAvailability(isAvailable);

    res.json({
      success: true,
      message: `Food item ${isAvailable ? 'made available' : 'made unavailable'} successfully`,
      data: {
        isAvailable: foodItem.isAvailable
      }
    });
  })
);

router.put('/:id/price',
  protect,
  authorize('manager', 'admin'),
  [
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { price } = req.body;

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    if (req.user.role !== 'admin') {
      const hotel = await Hotel.findById(foodItem.hotel);
      if (hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to update this food item.'
        });
      }
    }

    await foodItem.updatePrice(price);

    res.json({
      success: true,
      message: 'Food item price updated successfully',
      data: {
        price: foodItem.price
      }
    });
  })
);

module.exports = router;
