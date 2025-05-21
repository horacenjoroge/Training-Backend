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
let authRoutes, userRoutes, postRoutes, achievementRoutes, followRoutes, uploadRoutes, contactsRoutes;

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
  uploadRoutes = require('./routes/uploads');
  console.log('Upload routes loaded successfully');
} catch (error) {
  console.error('Error loading upload routes:', error.message);
  uploadRoutes = express.Router();
}

try {
  achievementRoutes = require('./routes/achievementRoutes');
  console.log('Achievement routes loaded successfully');
} catch (error) {
  console.error('Error loading achievement routes:', error.message);
  achievementRoutes = express.Router();
}

try {
  followRoutes = require('./routes/followRoutes');
  console.log('Follow routes loaded successfully');
} catch (error) {
  console.error('Error loading follow routes:', error.message);
  followRoutes = express.Router();
}

try {
  contactsRoutes = require('./routes/contact');
  console.log('Contacts routes loaded successfully');
} catch (error) {
  console.error('Error loading contacts routes:', error.message);
  contactsRoutes = express.Router();
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
      follow: '/api/follow',
      contacts: '/api/contacts' // Added contacts route
    }
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
      '/api/uploads/...',
      '/api/achievements/...',
      '/api/follow/...',
      '/api/contacts/...' // Added contacts route
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error handling request:', err);

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large, maximum size is 5MB'
    });
  }

  // In production, hide detailed error messages
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Something went wrong!';

  res.status(500).json({
    error: 'Server Error',
    message: errorMessage
  });
});

// Export the Express app
module.exports = app;