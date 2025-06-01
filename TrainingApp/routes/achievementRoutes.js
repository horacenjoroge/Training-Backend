const express = require('express');
const achievementController = require('../controllers/achievementController');
const auth = require('../middleware/auth'); // Your existing auth middleware

const router = express.Router();

// Apply your existing authentication to all routes
router.use(auth);

// Achievement routes
router.get('/', achievementController.getUserAchievements);
router.get('/recent', achievementController.getRecentAchievements);
router.get('/progress', achievementController.getAchievementProgress);
router.get('/leaderboard', achievementController.getLeaderboard);
router.get('/templates', achievementController.getAchievementTemplates);
router.get('/:id', achievementController.getAchievement);

// Achievement actions
router.post('/:id/share', achievementController.shareAchievement);

module.exports = router;