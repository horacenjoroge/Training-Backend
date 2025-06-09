const Workout = require('../models/workout');
const User = require('../models/user');
const Achievement = require('../models/Achievement');

// Helper function to get user ID from your auth structure
const getUserId = (req) => {
  // Handle different token structures from your auth middleware
  if (req.user.id) return req.user.id;
  if (req.user.userId) return req.user.userId;
  if (req.user._id) return req.user._id;
  return req.user; // fallback if user is just the ID
};

class WorkoutController {
  // Create new workout
  async createWorkout(req, res) {
    try {
      const userId = getUserId(req);
      console.log('Creating workout for user:', userId);
      
      const workoutData = {
        ...req.body,
        userId: userId,
      };

      // Validate workout data
      workoutController.validateWorkoutData(workoutData);

      // Create workout
      const workout = new Workout(workoutData);
      await workout.save();

      // Update user stats
      const user = await User.findById(userId);
      if (user) {
        user.updateWorkoutStats(workoutData);
        await user.save();
      }

      // Check for new achievements
      const newAchievements = await workoutController.checkAndCreateAchievements(userId, workout, user);

      res.status(201).json({
        status: 'success',
        message: 'Workout saved successfully',
        data: {
          workout,
          achievementsEarned: newAchievements
        }
      });
    } catch (error) {
      console.error('Create workout error:', error);
      res.status(400).json({
        status: 'error',
        message: error.message || 'Failed to create workout'
      });
    }
  }

  // Get user's workouts with filters and pagination
  async getWorkouts(req, res) {
    try {
      const userId = getUserId(req);
      const {
        page = 1,
        limit = 20,
        type,
        startDate,
        endDate,
        sortBy = 'startTime',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = { userId: userId };
      
      if (type) {
        query.type = type;
      }
      
      if (startDate && endDate) {
        query.startTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Execute query with pagination
      const workouts = await Workout.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('likes', 'name email')
        .populate('comments.userId', 'name email avatar');

      const total = await Workout.countDocuments(query);

      // Calculate summary stats for the filtered workouts
      const summaryStats = await workoutController.calculateSummaryStats(query);

      res.status(200).json({
        status: 'success',
        results: workouts.length,
        data: {
          workouts,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalWorkouts: total,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          },
          summary: summaryStats
        }
      });
    } catch (error) {
      console.error('Get workouts error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch workouts'
      });
    }
  }

  // Get single workout by ID
  async getWorkout(req, res) {
    try {
      const userId = getUserId(req);
      
      const workout = await Workout.findById(req.params.id)
        .populate('userId', 'name email avatar profile')
        .populate('likes', 'name avatar')
        .populate('comments.userId', 'name avatar');

      if (!workout) {
        return res.status(404).json({
          status: 'error',
          message: 'Workout not found'
        });
      }

      // Check privacy permissions
      if (workout.privacy === 'private' && workout.userId._id.toString() !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied to this workout'
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          workout
        }
      });
    } catch (error) {
      console.error('Get workout error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch workout'
      });
    }
  }

  // Update workout
  async updateWorkout(req, res) {
    try {
      const userId = getUserId(req);
      
      const workout = await Workout.findById(req.params.id);

      if (!workout) {
        return res.status(404).json({
          status: 'error',
          message: 'Workout not found'
        });
      }

      // Check ownership
      if (workout.userId.toString() !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only update your own workouts'
        });
      }

      // Update allowed fields
      const allowedFields = ['name', 'notes', 'privacy'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const updatedWorkout = await Workout.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        status: 'success',
        message: 'Workout updated successfully',
        data: {
          workout: updatedWorkout
        }
      });
    } catch (error) {
      console.error('Update workout error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update workout'
      });
    }
  }

  // Delete workout
  async deleteWorkout(req, res) {
    try {
      const userId = getUserId(req);
      
      const workout = await Workout.findById(req.params.id);

      if (!workout) {
        return res.status(404).json({
          status: 'error',
          message: 'Workout not found'
        });
      }

      // Check ownership
      if (workout.userId.toString() !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only delete your own workouts'
        });
      }

      await Workout.findByIdAndDelete(req.params.id);

      // Update user stats (subtract this workout)
      const user = await User.findById(userId);
      if (user) {
        await workoutController.updateUserStatsAfterDeletion(user, workout);
        await user.save();
      }

      res.status(200).json({
        status: 'success',
        message: 'Workout deleted successfully'
      });
    } catch (error) {
      console.error('Delete workout error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete workout'
      });
    }
  }

  // Get workout statistics
  async getWorkoutStats(req, res) {
    try {
      const userId = getUserId(req);
      const { period = 'month' } = req.query;

      const dateFilter = workoutController.getDateFilter(period);
      const query = { 
        userId: userId,
        ...(dateFilter && { startTime: dateFilter })
      };

      // Aggregate workout statistics
      const stats = await Workout.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            totalCalories: { $sum: '$calories' },
            avgDuration: { $avg: '$duration' },
            totalDistance: { 
              $sum: {
                $switch: {
                  branches: [
                    { case: { $ne: ['$running.distance', null] }, then: '$running.distance' },
                    { case: { $ne: ['$cycling.distance', null] }, then: '$cycling.distance' },
                    { case: { $ne: ['$swimming.distance', null] }, then: '$swimming.distance' }
                  ],
                  default: 0
                }
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get personal bests
      const personalBests = await workoutController.getPersonalBests(userId);

      // Get recent achievements
      const recentAchievements = await Achievement.find({ 
        user: userId 
      })
      .sort({ createdAt: -1 })
      .limit(5);

      // Get workout trends (last 30 days)
      const trends = await workoutController.getWorkoutTrends(userId);

      res.status(200).json({
        status: 'success',
        data: {
          period,
          stats,
          personalBests,
          recentAchievements,
          trends
        }
      });
    } catch (error) {
      console.error('Get workout stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch workout statistics'
      });
    }
  }

  // Like/Unlike workout
  async toggleLike(req, res) {
    try {
      const userId = getUserId(req);
      
      const workout = await Workout.findById(req.params.id);

      if (!workout) {
        return res.status(404).json({
          status: 'error',
          message: 'Workout not found'
        });
      }

      // Check if already liked
      const likeIndex = workout.likes.indexOf(userId);
      let action;

      if (likeIndex > -1) {
        // Unlike
        workout.likes.splice(likeIndex, 1);
        action = 'unliked';
      } else {
        // Like
        workout.likes.push(userId);
        action = 'liked';
      }

      await workout.save();

      res.status(200).json({
        status: 'success',
        message: `Workout ${action} successfully`,
        data: {
          likes: workout.likes.length,
          action
        }
      });
    } catch (error) {
      console.error('Toggle like error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to toggle like'
      });
    }
  }

  // Add comment to workout
  async addComment(req, res) {
    try {
      const userId = getUserId(req);
      const { text } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Comment text is required'
        });
      }

      const workout = await Workout.findById(req.params.id);

      if (!workout) {
        return res.status(404).json({
          status: 'error',
          message: 'Workout not found'
        });
      }

      workout.comments.push({
        userId: userId,
        text: text.trim()
      });

      await workout.save();

      // Populate the new comment
      await workout.populate('comments.userId', 'name avatar');

      const newComment = workout.comments[workout.comments.length - 1];

      res.status(201).json({
        status: 'success',
        message: 'Comment added successfully',
        data: {
          comment: newComment
        }
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to add comment'
      });
    }
  }

  // Get public workouts (social feed)
  async getPublicWorkouts(req, res) {
    try {
      const { page = 1, limit = 20, type } = req.query;

      const query = { 
        privacy: 'public',
        ...(type && { type })
      };

      const workouts = await Workout.find(query)
        .sort({ startTime: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('userId', 'name avatar profile')
        .populate('likes', 'name')
        .populate('comments.userId', 'name avatar');

      const total = await Workout.countDocuments(query);

      res.status(200).json({
        status: 'success',
        results: workouts.length,
        data: {
          workouts,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get public workouts error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch public workouts'
      });
    }
  }

  // Helper Methods
  validateWorkoutData(workoutData) {
    const requiredFields = ['type', 'startTime', 'endTime', 'duration'];
    
    for (const field of requiredFields) {
      if (!workoutData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate workout type
    const validTypes = ['Running', 'Cycling', 'Swimming', 'Gym', 'Walking', 'Hiking'];
    if (!validTypes.includes(workoutData.type)) {
      throw new Error('Invalid workout type');
    }

    // Validate duration
    if (workoutData.duration < 30) {
      throw new Error('Workout duration must be at least 30 seconds');
    }

    // Type-specific validation
    if (workoutData.type === 'Swimming' && !workoutData.swimming?.poolLength) {
      throw new Error('Pool length is required for swimming workouts');
    }
  }

  async checkAndCreateAchievements(userId, workout, user) {
    const templates = Achievement.getAchievementTemplates();
    const existingAchievements = await Achievement.find({ user: userId });
    const earnedTypes = existingAchievements.map(a => a.type);

    const newAchievements = [];

    // First workout achievement
    if (user.stats.workouts === 1 && !earnedTypes.includes('first_workout')) {
      newAchievements.push({
        ...templates.first_workout,
        user: userId,
        type: 'first_workout',
        triggerValue: 1,
        workoutId: workout._id,
        workoutType: workout.type,
        progress: { current: 1, target: 1, percentage: 100 }
      });
    }

    // Workout milestone achievements
    const workoutMilestones = [
      { count: 10, type: 'workouts_10' },
      { count: 50, type: 'workouts_50' },
      { count: 100, type: 'workouts_100' }
    ];

    for (const milestone of workoutMilestones) {
      if (user.stats.workouts === milestone.count && !earnedTypes.includes(milestone.type)) {
        newAchievements.push({
          ...templates[milestone.type],
          user: userId,
          type: milestone.type,
          triggerValue: milestone.count,
          workoutId: workout._id,
          progress: { current: milestone.count, target: milestone.count, percentage: 100 }
        });
      }
    }

    // Distance achievements
    const distance = workoutController.getWorkoutDistance(workout);
    if (distance >= 5000 && !earnedTypes.includes('distance_5k')) {
      newAchievements.push({
        ...templates.distance_5k,
        user: userId,
        type: 'distance_5k',
        triggerValue: distance,
        workoutId: workout._id,
        workoutType: workout.type,
        progress: { current: distance, target: 5000, percentage: 100 }
      });
    }

    if (distance >= 10000 && !earnedTypes.includes('distance_10k')) {
      newAchievements.push({
        ...templates.distance_10k,
        user: userId,
        type: 'distance_10k',
        triggerValue: distance,
        workoutId: workout._id,
        workoutType: workout.type,
        progress: { current: distance, target: 10000, percentage: 100 }
      });
    }

    // Streak achievements
    const streakMilestones = [
      { days: 3, type: 'streak_3_days' },
      { days: 7, type: 'streak_7_days' },
      { days: 30, type: 'streak_30_days' }
    ];

    for (const milestone of streakMilestones) {
      if (user.stats.currentStreak === milestone.days && !earnedTypes.includes(milestone.type)) {
        newAchievements.push({
          ...templates[milestone.type],
          user: userId,
          type: milestone.type,
          triggerValue: milestone.days,
          progress: { current: milestone.days, target: milestone.days, percentage: 100 }
        });
      }
    }

    // Activity-specific achievements
    if (workout.type === 'Swimming' && !earnedTypes.includes('swimming_first')) {
      newAchievements.push({
        ...templates.swimming_first,
        user: userId,
        type: 'swimming_first',
        workoutId: workout._id,
        workoutType: 'Swimming',
        progress: { current: 1, target: 1, percentage: 100 }
      });
    }

    if (workout.type === 'Cycling' && !earnedTypes.includes('cycling_first')) {
      newAchievements.push({
        ...templates.cycling_first,
        user: userId,
        type: 'cycling_first',
        workoutId: workout._id,
        workoutType: 'Cycling',
        progress: { current: 1, target: 1, percentage: 100 }
      });
    }

    // Save new achievements
    if (newAchievements.length > 0) {
      await Achievement.insertMany(newAchievements);
    }

    return newAchievements;
  }

  getWorkoutDistance(workout) {
    switch (workout.type) {
      case 'Running':
        return workout.running?.distance || 0;
      case 'Cycling':
        return workout.cycling?.distance || 0;
      case 'Swimming':
        return workout.swimming?.distance || 0;
      default:
        return 0;
    }
  }

  async calculateSummaryStats(query) {
    const result = await Workout.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalWorkouts: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$calories' },
          avgDuration: { $avg: '$duration' },
          totalDistance: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $ne: ['$running.distance', null] }, then: '$running.distance' },
                  { case: { $ne: ['$cycling.distance', null] }, then: '$cycling.distance' },
                  { case: { $ne: ['$swimming.distance', null] }, then: '$swimming.distance' }
                ],
                default: 0
              }
            }
          }
        }
      }
    ]);

    return result[0] || {
      totalWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      avgDuration: 0,
      totalDistance: 0
    };
  }

  getDateFilter(period) {
    const now = new Date();
    
    switch (period) {
      case 'week':
        return { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      case 'month':
        return { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      case 'year':
        return { $gte: new Date(now.getFullYear(), 0, 1) };
      case 'all':
      default:
        return null;
    }
  }

  async getPersonalBests(userId) {
    try {
      // Get running personal bests
      const runningBests = await Workout.aggregate([
        { $match: { userId: userId, type: 'Running' } },
        {
          $group: {
            _id: null,
            longestDistance: { $max: '$running.distance' },
            bestPace: { $min: '$running.pace.average' },
            longestDuration: { $max: '$duration' },
            fastestSpeed: { $max: '$running.speed.max' }
          }
        }
      ]);

      // Get cycling personal bests
      const cyclingBests = await Workout.aggregate([
        { $match: { userId: userId, type: 'Cycling' } },
        {
          $group: {
            _id: null,
            longestDistance: { $max: '$cycling.distance' },
            bestSpeed: { $max: '$cycling.speed.max' },
            longestDuration: { $max: '$duration' },
            avgSpeed: { $avg: '$cycling.speed.average' }
          }
        }
      ]);

      // Get swimming personal bests
      const swimmingBests = await Workout.aggregate([
        { $match: { userId: userId, type: 'Swimming' } },
        {
          $group: {
            _id: null,
            mostLaps: { $max: { $size: { $ifNull: ['$swimming.laps', []] } } },
            bestSwolf: { $min: '$swimming.technique.averageSwolf' },
            longestDuration: { $max: '$duration' },
            longestDistance: { $max: '$swimming.distance' }
          }
        }
      ]);

      // Get gym personal bests
      const gymBests = await Workout.aggregate([
        { $match: { userId: userId, type: 'Gym' } },
        {
          $group: {
            _id: null,
            heaviestWeight: { $max: '$gym.stats.totalWeight' },
            mostSets: { $max: '$gym.stats.totalSets' },
            longestDuration: { $max: '$duration' },
            mostReps: { $max: '$gym.stats.totalReps' }
          }
        }
      ]);

      return {
        running: runningBests[0] || {
          longestDistance: 0,
          bestPace: 0,
          longestDuration: 0,
          fastestSpeed: 0
        },
        cycling: cyclingBests[0] || {
          longestDistance: 0,
          bestSpeed: 0,
          longestDuration: 0,
          avgSpeed: 0
        },
        swimming: swimmingBests[0] || {
          mostLaps: 0,
          bestSwolf: 0,
          longestDuration: 0,
          longestDistance: 0
        },
        gym: gymBests[0] || {
          heaviestWeight: 0,
          mostSets: 0,
          longestDuration: 0,
          mostReps: 0
        }
      };
    } catch (error) {
      console.error('Error getting personal bests:', error);
      return {
        running: { longestDistance: 0, bestPace: 0, longestDuration: 0, fastestSpeed: 0 },
        cycling: { longestDistance: 0, bestSpeed: 0, longestDuration: 0, avgSpeed: 0 },
        swimming: { mostLaps: 0, bestSwolf: 0, longestDuration: 0, longestDistance: 0 },
        gym: { heaviestWeight: 0, mostSets: 0, longestDuration: 0, mostReps: 0 }
      };
    }
  }

  async getWorkoutTrends(userId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const trends = await Workout.aggregate([
        {
          $match: {
            userId: userId,
            startTime: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$startTime'
              }
            },
            count: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            totalCalories: { $sum: '$calories' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return trends;
    } catch (error) {
      console.error('Error getting workout trends:', error);
      return [];
    }
  }

  async updateUserStatsAfterDeletion(user, workout) {
    // Subtract workout from stats
    user.stats.workouts = Math.max(0, user.stats.workouts - 1);
    user.stats.hours = Math.max(0, user.stats.hours - ((workout.duration || 0) / 3600));
    user.stats.calories = Math.max(0, user.stats.calories - (workout.calories || 0));
    user.stats.totalDuration = Math.max(0, user.stats.totalDuration - (workout.duration || 0));
    
    const distance = workoutController.getWorkoutDistance(workout);
    user.stats.totalDistance = Math.max(0, user.stats.totalDistance - distance);
  }
}

// Create single instance
const workoutController = new WorkoutController();

module.exports = workoutController;