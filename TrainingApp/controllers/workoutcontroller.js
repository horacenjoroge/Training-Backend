const mongoose = require('mongoose');
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

      console.log('Workout created successfully:', workout._id);

      // Update user stats
      const user = await User.findById(userId);
      if (user) {
        user.updateWorkoutStats(workoutData);
        await user.save();
        console.log('User stats updated');
      }

      // Check for new achievements
      const newAchievements = await workoutController.checkAndCreateAchievements(userId, workout, user);
      console.log('New achievements earned:', newAchievements.length);

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

  // FIXED: Get user's workouts with filters and pagination (NO DUPLICATES)
  async getWorkouts(req, res) {
    try {
      const userId = getUserId(req);
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      const {
        page = 1,
        limit = 20,
        type,
        startDate,
        endDate,
        sortBy = 'startTime',
        sortOrder = 'desc',
        search
      } = req.query;

      console.log('Loading workouts with params:', { 
        page, 
        limit, 
        type, 
        sortBy, 
        sortOrder, 
        search,
        userId: userObjectId 
      });

      // Build query with proper ObjectId
      const query = { userId: userObjectId };
      
      if (type && type !== 'All') {
        query.type = type;
      }
      
      if (startDate && endDate) {
        query.startTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Add search functionality
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { name: searchRegex },
          { type: searchRegex },
          { notes: searchRegex }
        ];
      }

      console.log('Final query:', query);

      // Convert page and limit to numbers
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

      console.log('Sort object:', sortObj);

      // FIXED: Execute query without populate (since likes/comments may not exist in schema)
      const workouts = await Workout.find(query)
        .sort(sortObj)
        .limit(limitNum)
        .skip(skip)
        .lean(); // Use lean() for better performance

      console.log(`Found ${workouts.length} workouts`);

      // Get total count for pagination
      const total = await Workout.countDocuments(query);

      // Calculate summary stats for the filtered workouts
      const summaryStats = await workoutController.calculateSummaryStats(query);

      // Calculate pagination info
      const totalPages = Math.ceil(total / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      console.log('Pagination info:', {
        currentPage: pageNum,
        totalPages,
        hasNextPage,
        hasPrevPage,
        total
      });

      // FIXED: Add default values for social features if they don't exist in schema
      const workoutsWithSocialFeatures = workouts.map(workout => ({
        ...workout,
        likes: workout.likes || [], // Default empty array if not in schema
        comments: workout.comments || [], // Default empty array if not in schema
        privacy: workout.privacy || 'public' // Default privacy setting
      }));

      const response = {
        status: 'success',
        results: workoutsWithSocialFeatures.length,
        data: {
          workouts: workoutsWithSocialFeatures,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalWorkouts: total,
            hasNextPage,
            hasPrevPage,
            limit: limitNum
          },
          summary: summaryStats
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get workouts error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch workouts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get single workout by ID
  async getWorkout(req, res) {
    try {
      const userId = getUserId(req);
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      const workout = await Workout.findById(req.params.id).lean();

      if (!workout) {
        return res.status(404).json({
          status: 'error',
          message: 'Workout not found'
        });
      }

      // Check privacy permissions
      if (workout.privacy === 'private' && workout.userId.toString() !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied to this workout'
        });
      }

      // Add default social features
      const workoutWithSocialFeatures = {
        ...workout,
        likes: workout.likes || [],
        comments: workout.comments || [],
        privacy: workout.privacy || 'public'
      };

      res.status(200).json({
        status: 'success',
        data: {
          workout: workoutWithSocialFeatures
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

      console.log('Getting workout stats for user:', userId, 'period:', period);

      // Ensure userId is properly converted to ObjectId
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      const dateFilter = workoutController.getDateFilter(period);
      const query = { 
        userId: userObjectId,
        ...(dateFilter && { startTime: dateFilter })
      };

      console.log('Query filter:', query);

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
                    { case: { $ne: ['$swimming.distance', null] }, then: '$swimming.distance' },
                    { case: { $ne: ['$walking.distance', null] }, then: '$walking.distance' }
                  ],
                  default: 0
                }
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      console.log('Stats aggregation result:', stats);

      // Get personal bests
      const personalBests = await workoutController.getPersonalBests(userObjectId);

      // Get recent achievements
      const recentAchievements = await Achievement.find({ 
        user: userObjectId
      })
      .sort({ createdAt: -1 })
      .limit(5);

      console.log('Recent achievements found:', recentAchievements.length);

      // Get workout trends
      const trends = await workoutController.getWorkoutTrends(userObjectId);

      console.log('Trends result:', trends);

      // Calculate summary stats for the period
      const summaryResult = await Workout.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalWorkouts: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            totalCalories: { $sum: '$calories' },
            totalDistance: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $ne: ['$running.distance', null] }, then: '$running.distance' },
                    { case: { $ne: ['$cycling.distance', null] }, then: '$cycling.distance' },
                    { case: { $ne: ['$swimming.distance', null] }, then: '$swimming.distance' },
                    { case: { $ne: ['$walking.distance', null] }, then: '$walking.distance' }
                  ],
                  default: 0
                }
              }
            }
          }
        }
      ]);

      const summary = summaryResult.length > 0 ? summaryResult[0] : {
        totalWorkouts: 0,
        totalDuration: 0,
        totalCalories: 0,
        totalDistance: 0
      };

      // Remove _id field from summary
      delete summary._id;

      console.log('Summary stats:', summary);

      // Return complete response
      const response = {
        status: 'success',
        data: {
          period,
          summary,
          stats,
          personalBests,
          recentAchievements,
          trends
        }
      };

      console.log('Final response structure:', {
        period: response.data.period,
        statsCount: response.data.stats.length,
        trendsCount: response.data.trends.length,
        personalBestsKeys: Object.keys(response.data.personalBests),
        achievementsCount: response.data.recentAchievements.length,
        summaryKeys: Object.keys(response.data.summary)
      });

      res.status(200).json(response);
    } catch (error) {
      console.error('Get workout stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch workout statistics',
        error: error.message
      });
    }
  }

  // Debug workouts endpoint
  async debugWorkouts(req, res) {
    try {
      const userId = getUserId(req);
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      console.log('Debugging workouts for user:', userObjectId);
      
      // Get total count
      const total = await Workout.countDocuments({ userId: userObjectId });
      
      // Get sample workouts
      const samples = await Workout.find({ userId: userObjectId })
        .limit(5)
        .sort({ startTime: -1 });
      
      // Get workout types
      const types = await Workout.distinct('type', { userId: userObjectId });
      
      console.log('Debug results:', {
        userId: userObjectId,
        totalWorkouts: total,
        workoutTypes: types,
        sampleCount: samples.length
      });
      
      res.json({
        status: 'success',
        data: {
          userId: userObjectId,
          totalWorkouts: total,
          workoutTypes: types,
          sampleWorkouts: samples.map(w => ({
            id: w._id,
            type: w.type,
            startTime: w.startTime,
            duration: w.duration,
            calories: w.calories,
            hasRunning: !!w.running,
            hasCycling: !!w.cycling,
            hasGym: !!w.gym,
            hasSwimming: !!w.swimming,
            structure: Object.keys(w.toObject())
          }))
        }
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  }

  // Like/Unlike workout (if schema supports it)
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

      // Initialize likes array if it doesn't exist
      if (!workout.likes) {
        workout.likes = [];
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

  // Add comment to workout (if schema supports it)
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

      // Initialize comments array if it doesn't exist
      if (!workout.comments) {
        workout.comments = [];
      }

      workout.comments.push({
        userId: userId,
        text: text.trim(),
        createdAt: new Date()
      });

      await workout.save();

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
        .lean();

      const total = await Workout.countDocuments(query);

      // Add default social features
      const workoutsWithSocialFeatures = workouts.map(workout => ({
        ...workout,
        likes: workout.likes || [],
        comments: workout.comments || [],
        privacy: workout.privacy || 'public'
      }));

      res.status(200).json({
        status: 'success',
        results: workoutsWithSocialFeatures.length,
        data: {
          workouts: workoutsWithSocialFeatures,
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
    try {
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
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  getWorkoutDistance(workout) {
    switch (workout.type) {
      case 'Running':
        return workout.running?.distance || 0;
      case 'Cycling':
        return workout.cycling?.distance || 0;
      case 'Swimming':
        return workout.swimming?.distance || 0;
      case 'Walking':
        return workout.walking?.distance || 0;
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
                  { case: { $ne: ['$swimming.distance', null] }, then: '$swimming.distance' },
                  { case: { $ne: ['$walking.distance', null] }, then: '$walking.distance' }
                ],
                default: 0
              }
            }
          }
        }
      }
    ]);

    const stats = result[0] || {
      totalWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      avgDuration: 0,
      totalDistance: 0
    };

    // Remove _id field
    delete stats._id;
    return stats;
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
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      console.log('Getting personal bests for user:', userObjectId);

      // Get running personal bests
      const runningBests = await Workout.aggregate([
        { $match: { userId: userObjectId, type: 'Running' } },
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
        { $match: { userId: userObjectId, type: 'Cycling' } },
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
        { $match: { userId: userObjectId, type: 'Swimming' } },
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
        { $match: { userId: userObjectId, type: 'Gym' } },
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

      const result = {
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

      // Remove _id fields
      Object.values(result).forEach(best => delete best._id);

      console.log('Personal bests result:', result);
      return result;
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
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      console.log('Getting trends for user:', userObjectId, 'since:', thirtyDaysAgo);
      
      const trends = await Workout.aggregate([
        {
          $match: {
            userId: userObjectId,
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

      console.log('Trends aggregation result:', trends);
      return trends;
    } catch (error) {
      console.error('Error getting workout trends:', error);
      return [];
    }
  }

  async updateUserStatsAfterDeletion(user, workout) {
    try {
      // Subtract workout from stats
      user.stats.workouts = Math.max(0, user.stats.workouts - 1);
      user.stats.hours = Math.max(0, user.stats.hours - ((workout.duration || 0) / 3600));
      user.stats.calories = Math.max(0, user.stats.calories - (workout.calories || 0));
      user.stats.totalDuration = Math.max(0, user.stats.totalDuration - (workout.duration || 0));
      
      const distance = workoutController.getWorkoutDistance(workout);
      user.stats.totalDistance = Math.max(0, user.stats.totalDistance - distance);
    } catch (error) {
      console.error('Error updating user stats after deletion:', error);
    }
  }
}

// Create single instance
const workoutController = new WorkoutController();

module.exports = workoutController;