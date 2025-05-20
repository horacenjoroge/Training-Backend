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
  origin: '*', // For development only - restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// Create unified uploads directory structure in public folder
const dirs = [
  'public', 
  'public/uploads', 
  'public/uploads/avatars', 
  'public/uploads/posts'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Set up static folders for serving uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Connect to MongoDB with detailed logging
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB at', process.env.MONGODB_URI))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('Connection string:', process.env.MONGODB_URI);
  });

// Load routes with error handling
let authRoutes, userRoutes, postRoutes, achievementRoutes, followRoutes, uploadRoutes;

try {
  authRoutes = require('./routes/auth');
  console.log('Auth routes loaded successfully');
} catch (error) {
  console.error('Error loading auth routes:', error.message);
  authRoutes = express.Router();
}

try {
  userRoutes = require('./routes/user');
  console.log('User routes loaded successfully');
} catch (error) {
  console.error('Error loading user routes:', error.message);
  userRoutes = express.Router();
}

try {
  postRoutes = require('./routes/post');
  console.log('Post routes loaded successfully');
} catch (error) {
  console.error('Error loading post routes:', error.message);
  postRoutes = express.Router();
}

try {
  // Load the new uploads routes
  uploadRoutes = require('./routes/uploads');
  console.log('Upload routes loaded successfully');
} catch (error) {
  console.error('Error loading upload routes:', error.message);
  uploadRoutes = express.Router();
}

try {
  // Using the original route names as in your code
  achievementRoutes = require('./routes/achievementRoutes');
  console.log('Achievement routes loaded successfully');
} catch (error) {
  console.error('Error loading achievement routes:', error.message);
  achievementRoutes = express.Router();
}

try {
  // Using the original route names as in your code
  followRoutes = require('./routes/followRoutes');
  console.log('Follow routes loaded successfully');
} catch (error) {
  console.error('Error loading follow routes:', error.message);
  followRoutes = express.Router();
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'API is running',
    time: new Date().toISOString(),
    routes: {
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      uploads: '/api/uploads',
      achievements: '/api/achievements',
      follow: '/api/follow'
    }
  });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/uploads', uploadRoutes); // Add the upload routes
app.use('/api/achievements', achievementRoutes);
app.use('/api/follow', followRoutes);

// Add 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.url} does not exist`,
    availableRoutes: [
      '/api/health',
      '/api/auth/...',
      '/api/users/...',
      '/api/posts/...',
      '/api/uploads/...', // Add uploads to available routes list
      '/api/achievements/...',
      '/api/follow/...'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error handling request:', err);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large, maximum size is 5MB'
    });
  }
  
  res.status(500).json({
    error: 'Server Error',
    message: err.message || 'Something went wrong!'
  });
});

// Export the Express app
module.exports = app;