// routes/user.js - With correct controller reference

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController'); // SINGULAR - userController

// Original routes
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

// @route   GET api/users/fullprofile
// @desc    Get complete user profile with social stats
// @access  Private
router.get('/fullprofile', auth, userController.getFullProfile);

// @route   POST api/users/avatar
// @desc    Upload profile image
// @access  Private
router.post('/avatar', auth, userController.upload, userController.uploadProfileImage);

// @route   GET api/users/followers
// @desc    Get user's followers
// @access  Private
router.get('/followers', auth, userController.getFollowers);

// @route   GET api/users/following
// @desc    Get user's following
// @access  Private
router.get('/following', auth, userController.getFollowing);

// @route   POST api/users/follow/:userId
// @desc    Follow a user
// @access  Private
router.post('/follow/:userId', auth, userController.followUser);

// @route   DELETE api/users/follow/:userId
// @desc    Unfollow a user
// @access  Private
router.delete('/follow/:userId', auth, userController.unfollowUser);

// @route   GET api/users/achievements
// @desc    Get user's achievements
// @access  Private
router.get('/achievements', auth, userController.getUserAchievements);

// @route   POST api/users/achievements
// @desc    Add new achievement
// @access  Private
router.post('/achievements', auth, userController.addAchievement);

// NEW ROUTES - Add these before the /:userId route

// @route   GET api/users/search
// @desc    Get all users except current user (for Find Friends)
// @access  Private
router.get('/search', auth, userController.searchUsers);

// @route   GET api/users/search/:query
// @desc    Search users by name, username, or bio
// @access  Private
router.get('/search/:query', auth, userController.searchUsersByQuery);

// MUST BE LAST - Generic param route should always be at the end
// @route   GET api/users/:userId
// @desc    Get a specific user by ID
// @access  Public
router.get('/:userId', userController.getUserById);

module.exports = router;