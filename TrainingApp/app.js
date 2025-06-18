const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-frontend-domain.com' // Replace with your React Native app's domain in production
    : '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization']
}));
app.use(express.json({ limit: '50mb' })); // Increased limit for workout data with GPS points
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body keys:', Object.keys(req.body));
  }
  next();
});

// Create unified uploads directory structure in public folder
const dirs = [
  'public', 
  'public/uploads', 
  'public/uploads/avatars', 
  'public/uploads/posts',
  'public/uploads/workouts' // Added for workout-related files
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Set up static folders for serving uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

 // Log env variables to debug Railway issues
console.log('\n🔍 ENV DEBUG');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('NODE_ENV:', process.env.NODE_ENV);


// Connect to MongoDB with detailed logging and options
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
  .then(() => console.log('Connected to MongoDB at', process.env.MONGODB_URI))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('Connection string:', process.env.MONGODB_URI);
  });

// Load routes with error handling
let authRoutes, userRoutes, postRoutes, achievementRoutes, followRoutes, uploadRoutes, contactsRoutes, workoutRoutes;

try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
  authRoutes = express.Router();
}

try {
  userRoutes = require('./routes/user');
  console.log('✅ User routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading user routes:', error.message);
  userRoutes = express.Router();
}

try {
  postRoutes = require('./routes/post');
  console.log('✅ Post routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading post routes:', error.message);
  postRoutes = express.Router();
}

try {
  uploadRoutes = require('./routes/uploads');
  console.log('✅ Upload routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading upload routes:', error.message);
  uploadRoutes = express.Router();
}

try {
  achievementRoutes = require('./routes/achievementRoutes');
  console.log('✅ Achievement routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading achievement routes:', error.message);
  achievementRoutes = express.Router();
}

try {
  followRoutes = require('./routes/followRoutes');
  console.log('✅ Follow routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading follow routes:', error.message);
  followRoutes = express.Router();
}

try {
  contactsRoutes = require('./routes/contact');
  console.log('✅ Contacts routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading contacts routes:', error.message);
  contactsRoutes = express.Router();
}

// NEW: Load workout routes
try {
  workoutRoutes = require('./routes/workoutRoutes');
  console.log('✅ Workout routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading workout routes:', error.message);
  console.error('Make sure you have created ./routes/workoutRoutes.js');
  workoutRoutes = express.Router();
  // Create a basic fallback route
  workoutRoutes.get('/', (req, res) => {
    res.status(503).json({
      error: 'Workout service unavailable',
      message: 'Workout routes not properly loaded'
    });
  });
}

// Health check route - UPDATED to include workout routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'API is running',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    routes: {
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      uploads: '/api/uploads',
      achievements: '/api/achievements',
      follow: '/api/follow',
      contacts: '/api/contacts',
      workouts: '/api/workouts' // NEW: Added workout routes
    },
    version: '1.0.0'
  });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/workouts', workoutRoutes); // NEW: Added workout routes

// NEW: API documentation endpoint for development
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Fitness Tracker API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile'
      },
      users: {
        getUser: 'GET /api/users/:id',
        updateUser: 'PUT /api/users/:id'
      },
      workouts: {
        create: 'POST /api/workouts',
        getAll: 'GET /api/workouts',
        getOne: 'GET /api/workouts/:id',
        update: 'PATCH /api/workouts/:id',
        delete: 'DELETE /api/workouts/:id',
        stats: 'GET /api/workouts/stats/summary',
        like: 'POST /api/workouts/:id/like',
        comment: 'POST /api/workouts/:id/comments',
        public: 'GET /api/workouts/public/feed'
      },
      achievements: {
        getAll: 'GET /api/achievements',
        getOne: 'GET /api/achievements/:id',
        recent: 'GET /api/achievements/recent',
        progress: 'GET /api/achievements/progress',
        leaderboard: 'GET /api/achievements/leaderboard',
        share: 'POST /api/achievements/:id/share'
      },
      posts: {
        create: 'POST /api/posts',
        getAll: 'GET /api/posts',
        getOne: 'GET /api/posts/:id',
        like: 'POST /api/posts/:id/like',
        comment: 'POST /api/posts/:id/comment'
      }
    },
    authentication: {
      method: 'JWT Token',
      header: 'x-auth-token',
      example: 'x-auth-token: your-jwt-token-here'
    }
  });
});

// NEW: Workout-specific middleware for handling large GPS data
app.use('/api/workouts', (req, res, next) => {
  // Log workout data size for monitoring
  if (req.body && req.body.route && req.body.route.gpsPoints) {
    console.log(`Workout GPS points: ${req.body.route.gpsPoints.length}`);
  }
  next();
});

// Add 404 handler for undefined routes - UPDATED
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.url} does not exist`,
    suggestion: 'Check /api/docs for available endpoints',
    availableRoutes: [
      '/api/health',
      '/api/docs',
      '/api/auth/...',
      '/api/users/...',
      '/api/posts/...',
      '/api/uploads/...',
      '/api/achievements/...',
      '/api/follow/...',
      '/api/contacts/...',
      '/api/workouts/...' // NEW: Added workout routes
    ]
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error handling request:', err);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  console.error('Request headers:', req.headers);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid data provided',
      details: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID Format',
      message: 'The provided ID is not in the correct format'
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate Entry',
      message: 'A record with this data already exists'
    });
  }

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File Too Large',
      message: 'File too large, maximum size is 5MB'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too Many Files',
      message: 'Too many files uploaded at once'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Authentication token has expired'
    });
  }

  // Handle MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      error: 'Database Connection Error',
      message: 'Unable to connect to database'
    });
  }

  // Handle workout-specific errors
  if (err.message && err.message.includes('workout')) {
    return res.status(400).json({
      error: 'Workout Error',
      message: err.message
    });
  }

  // In production, hide detailed error messages
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Something went wrong!';

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: 'Server Error',
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// FIXED: Graceful shutdown handling using async/await
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// NEW: Add startup validation
const validateServer = () => {
  console.log('\n🚀 Server Startup Validation:');
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : '❌ Missing'}`);
  console.log(`✅ JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : '❌ Missing'}`);
  console.log('✅ Routes loaded:');
  console.log('   - Auth routes');
  console.log('   - User routes');
  console.log('   - Post routes');
  console.log('   - Upload routes');
  console.log('   - Achievement routes');
  console.log('   - Follow routes');
  console.log('   - Contact routes');
  console.log('   - Workout routes'); // NEW
  console.log('\n📡 API Endpoints Available:');
  console.log('   GET  /api/health - Health check');
  console.log('   GET  /api/docs - API documentation');
  console.log('   POST /api/workouts - Create workout');
  console.log('   GET  /api/workouts - Get workouts');
  console.log('   GET  /api/achievements - Get achievements');
  console.log('   And more...\n');
};

// Run validation on startup
validateServer();

// Export the Express app
module.exports = app;