const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const path = require('path');

const models = require('./models');

const authRoutes = require('./routes/auth');
const hotelRoutes = require('./routes/hotels');
const foodRoutes = require('./routes/food');
const bookingRoutes = require('./routes/bookings');
const staffRoutes = require('./routes/staff');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/manager');
const orderRoutes = require('./routes/orders');

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));
  // Serve static frontend files
  app.use(express.static(path.join(__dirname, 'dbms project')));
} else {
  app.use(cors());
}

if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Connected',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message
    });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/food', foodRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/orders', orderRoutes);

// Fallback for client-side routing (serve home page)
app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'dbms project', 'home.html'));
  } else {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await testConnection();
    
    await sequelize.authenticate();
    console.log('✅ Database connection verified (no sync)');
    
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port 'http://localhost:${PORT}'`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);

      console.log(`🗄️  Database: PostgreSQL`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        sequelize.close();
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        sequelize.close();
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;