// routes/followRoutes.js
const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const auth = require('../middleware/auth');

router.post('/:userId', auth, followController.followUser);
router.delete('/:userId', auth, followController.unfollowUser);
router.get('/followers', auth, followController.getFollowers);
router.get('/following', auth, followController.getFollowing);

module.exports = router;