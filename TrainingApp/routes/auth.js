// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Register a new user
router.post('/register', validateRegistration, authController.register);

// Login user
router.post('/login', validateLogin, authController.login);

// Get user profile (protected route)
router.get('/user', auth, authController.getUser);

module.exports = router;