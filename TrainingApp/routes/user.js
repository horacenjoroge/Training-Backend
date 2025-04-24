// routes/user.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, userController.getUserProfile);

// @route   PUT api/users/stats
// @desc    Update user stats
// @access  Private
router.put('/stats', auth, userController.updateUserStats);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, userController.updateUserProfile);

module.exports = router;