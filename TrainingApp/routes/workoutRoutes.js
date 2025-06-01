const express = require('express');
const workoutController = require('../controllers/workoutcontroller');
const auth = require('../middleware/auth'); // Your existing auth middleware

const router = express.Router();

// Apply your existing authentication to all routes
router.use(auth);

// Workout CRUD routes
router.post('/', workoutController.createWorkout);
router.get('/', workoutController.getWorkouts);
router.get('/stats/summary', workoutController.getWorkoutStats);
router.get('/public/feed', workoutController.getPublicWorkouts);
router.get('/:id', workoutController.getWorkout);
router.patch('/:id', workoutController.updateWorkout);
router.delete('/:id', workoutController.deleteWorkout);

// Social features
router.post('/:id/like', workoutController.toggleLike);
router.post('/:id/comments', workoutController.addComment);

module.exports = router;