// routes/uploads.js
const express = require('express');
const router = express.Router();
const { avatarUpload, postUpload } = require('../utils/uploadService');
const uploadController = require('../controllers/uploadController');
const auth = require('../middleware/auth');

// @route   POST api/uploads/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, avatarUpload, uploadController.uploadAvatar);

// @route   POST api/uploads/post
// @desc    Upload post image
// @access  Private
router.post('/post', auth, postUpload, uploadController.uploadPostImage);

module.exports = router;