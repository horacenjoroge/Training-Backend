// controllers/achievementController.js - Achievement Management
const Achievement = require('../models/Achievement');
const User = require('../models/user');
const Workout = require('../models/workout');

// Helper function to get user ID from your auth structure
const getUserId = (req) => {
  if (req.user.id) return req.user.id;
  if (req.user.userId) return req.user.userId;
  if (req.user._id) return req.user._id;
  return req.user;
};

class AchievementController {
  // Get all achievements for the authenticated user
  async getUserAchievements(req, res) {
    try {
      const userId = getUserId(req);
      const { 
        page = 1, 
        limit = 20, 
        category, 
        rarity, 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = req.query;

      // Build query
      const query = { user: userId };
      
      if (category) {
        query.category = category;
      }
      
      if (rarity) {
        query.rarity = rarity;
      }

      // Execute query with pagination
      const achievements = await Achievement.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('workoutId', 'type startTime duration')
        .populate('user', 'name avatar');

      const total = await Achievement.countDocuments(query);

      // Get achievement statistics
      const achievementStats = await this.getAchievementStats(userId);

      res.status(200).json({
        status: 'success',
        results: achievements.length,
        data: {
          achievements,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalAchievements: total,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
          },
          stats: achievementStats
        }
      });
    } catch (error) {
      console.error('Get achievements error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch achievements'
      });
    }
  }

  // Get single achievement by ID
  async getAchievement(req, res) {
    try {
      const userId = getUserId(req);
      
      const achievement = await Achievement.findById(req.params.id)
        .populate('workoutId', 'type startTime duration distance')
        .populate('user', 'name avatar profile');

      if (!achievement) {
        return res.status(404).json({
          status: 'error',
          message: 'Achievement not found'
        });
      }

      // Check ownership
      if (achievement.user._id.toString() !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied to this achievement'
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          achievement
        }
      });
    } catch (error) {
      console.error('Get achievement error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch achievement'
      });
    }
  }

  // Get recent achievements (last 7 days)
  async getRecentAchievements(req, res) {
    try {
      const userId = getUserId(req);
      const { days = 7 } = req.query;
      
      const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const recentAchievements = await Achievement.find({
        user: userId,
        createdAt: { $gte: dateFilter }
      })
      .sort({ createdAt: -1 })
      .populate('workoutId', 'type startTime')
      .limit(50);

      res.status(200).json({
        status: 'success',
        results: recentAchievements.length,
        data: {
          achievements: recentAchievements,
          period: `Last ${days} days`
        }
      });
    } catch (error) {
      console.error('Get recent achievements error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch recent achievements'
      });
    }
  }

  // Get achievement progress (achievements user is close to earning)
  async getAchievementProgress(req, res) {
    try {
      const userId = getUserId(req);
      
      // Get user's current stats
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Get existing achievements
      const existingAchievements = await Achievement.find({ user: userId });
      const earnedTypes = existingAchievements.map(a => a.type);

      // Calculate progress for potential achievements
      const templates = Achievement.getAchievementTemplates();
      const progressData = [];

      // Workout milestones
      const workoutMilestones = [
        { count: 10, type: 'workouts_10' },
        { count: 50, type: 'workouts_50' },
        { count: 100, type: 'workouts_100' },
        { count: 250, type: 'workouts_250' },
        { count: 500, type: 'workouts_500' }
      ];

      for (const milestone of workoutMilestones) {
        if (!earnedTypes.includes(milestone.type) && templates[milestone.type]) {
          const progress = Math.min((user.stats.workouts / milestone.count) * 100, 100);
          if (progress > 0) {
            progressData.push({
              ...templates[milestone.type],
              type: milestone.type,
              progress: {
                current: user.stats.workouts,
                target: milestone.count,
                percentage: Math.round(progress)
              },
              isCompleted: progress >= 100
            });
          }
        }
      }

      // Streak milestones
      const streakMilestones = [
        { days: 3, type: 'streak_3_days' },
        { days: 7, type: 'streak_7_days' },
        { days: 14, type: 'streak_14_days' },
        { days: 30, type: 'streak_30_days' },
        { days: 60, type: 'streak_60_days' },
        { days: 100, type: 'streak_100_days' }
      ];

      for (const milestone of streakMilestones) {
        if (!earnedTypes.includes(milestone.type) && templates[milestone.type]) {
          const progress = Math.min((user.stats.currentStreak / milestone.days) * 100, 100);
          if (progress > 0 || user.stats.currentStreak > 0) {
            progressData.push({
              ...templates[milestone.type],
              type: milestone.type,
              progress: {
                current: user.stats.currentStreak,
                target: milestone.days,
                percentage: Math.round(progress)
              },
              isCompleted: progress >= 100
            });
          }
        }
      }

      // Activity-specific progress
      if (user.stats.running && user.stats.running.totalRuns > 0) {
        const runningMilestones = [
          { distance: 5000, type: 'distance_5k' },
          { distance: 10000, type: 'distance_10k' },
          { distance: 21097, type: 'distance_half_marathon' },
          { distance: 42195, type: 'distance_marathon' }
        ];

        // Check longest single run distance from workouts
        const longestRun = await this.getLongestDistance(userId, 'Running');
        
        for (const milestone of runningMilestones) {
          if (!earnedTypes.includes(milestone.type) && templates[milestone.type]) {
            const progress = Math.min((longestRun / milestone.distance) * 100, 100);
            if (progress > 0) {
              progressData.push({
                ...templates[milestone.type],
                type: milestone.type,
                progress: {
                  current: longestRun,
                  target: milestone.distance,
                  percentage: Math.round(progress)
                },
                isCompleted: progress >= 100
              });
            }
          }
        }
      }

      // Sort by progress percentage (closest to completion first)
      progressData.sort((a, b) => b.progress.percentage - a.progress.percentage);

      res.status(200).json({
        status: 'success',
        results: progressData.length,
        data: {
          progress: progressData,
          userStats: {
            totalWorkouts: user.stats.workouts,
            currentStreak: user.stats.currentStreak,
            longestStreak: user.stats.longestStreak,
            totalDistance: user.stats.totalDistance
          }
        }
      });
    } catch (error) {
      console.error('Get achievement progress error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch achievement progress'
      });
    }
  }

  // Share achievement (mark as shared)
  async shareAchievement(req, res) {
    try {
      const userId = getUserId(req);
      
      const achievement = await Achievement.findById(req.params.id);

      if (!achievement) {
        return res.status(404).json({
          status: 'error',
          message: 'Achievement not found'
        });
      }

      // Check ownership
      if (achievement.user.toString() !== userId) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only share your own achievements'
        });
      }

      // Update achievement as shared
      achievement.isShared = true;
      achievement.sharedAt = new Date();
      await achievement.save();

      res.status(200).json({
        status: 'success',
        message: 'Achievement shared successfully',
        data: {
          achievement
        }
      });
    } catch (error) {
      console.error('Share achievement error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to share achievement'
      });
    }
  }

  // Get achievement leaderboard
  async getLeaderboard(req, res) {
    try {
      const { category = 'all', period = 'all', limit = 50 } = req.query;

      let matchStage = {};
      
      // Filter by category
      if (category !== 'all') {
        matchStage.category = category;
      }

      // Filter by time period
      if (period !== 'all') {
        const dateFilter = this.getDateFilter(period);
        if (dateFilter) {
          matchStage.createdAt = dateFilter;
        }
      }

      // Aggregate achievements by user
      const leaderboard = await Achievement.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$user',
            totalAchievements: { $sum: 1 },
            totalPoints: { $sum: '$points' },
            recentAchievement: { $max: '$createdAt' },
            categories: { $addToSet: '$category' },
            rarityBreakdown: {
              $push: '$rarity'
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: '$userInfo'
        },
        {
          $project: {
            userId: '$_id',
            name: '$userInfo.name',
            avatar: '$userInfo.avatar',
            totalAchievements: 1,
            totalPoints: 1,
            recentAchievement: 1,
            categoriesCount: { $size: '$categories' },
            commonCount: {
              $size: {
                $filter: {
                  input: '$rarityBreakdown',
                  cond: { $eq: ['$$this', 'common'] }
                }
              }
            },
            rareCount: {
              $size: {
                $filter: {
                  input: '$rarityBreakdown',
                  cond: { $eq: ['$$this', 'rare'] }
                }
              }
            },
            epicCount: {
              $size: {
                $filter: {
                  input: '$rarityBreakdown',
                  cond: { $eq: ['$$this', 'epic'] }
                }
              }
            },
            legendaryCount: {
              $size: {
                $filter: {
                  input: '$rarityBreakdown',
                  cond: { $eq: ['$$this', 'legendary'] }
                }
              }
            }
          }
        },
        { $sort: { totalPoints: -1, totalAchievements: -1 } },
        { $limit: parseInt(limit) }
      ]);

      res.status(200).json({
        status: 'success',
        results: leaderboard.length,
        data: {
          leaderboard,
          filters: {
            category,
            period,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch leaderboard'
      });
    }
  }

  // Get available achievement templates
  async getAchievementTemplates(req, res) {
    try {
      const templates = Achievement.getAchievementTemplates();
      
      // Organize templates by category
      const categorizedTemplates = {};
      
      Object.entries(templates).forEach(([key, template]) => {
        const category = template.category;
        if (!categorizedTemplates[category]) {
          categorizedTemplates[category] = [];
        }
        categorizedTemplates[category].push({
          ...template,
          type: key
        });
      });

      res.status(200).json({
        status: 'success',
        data: {
          templates: categorizedTemplates,
          totalTemplates: Object.keys(templates).length,
          categories: Object.keys(categorizedTemplates)
        }
      });
    } catch (error) {
      console.error('Get achievement templates error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch achievement templates'
      });
    }
  }

  // Helper Methods
  async getAchievementStats(userId) {
    const achievements = await Achievement.find({ user: userId });
    
    const stats = {
      total: achievements.length,
      totalPoints: achievements.reduce((sum, achievement) => sum + (achievement.points || 0), 0),
      byCategory: {},
      byRarity: {},
      recentCount: 0 // Last 7 days
    };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    achievements.forEach(achievement => {
      // Count by category
      const category = achievement.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by rarity
      const rarity = achievement.rarity;
      stats.byRarity[rarity] = (stats.byRarity[rarity] || 0) + 1;

      // Count recent achievements
      if (achievement.createdAt >= sevenDaysAgo) {
        stats.recentCount++;
      }
    });

    return stats;
  }

  async getLongestDistance(userId, workoutType) {
    const workouts = await Workout.find({
      userId: userId,
      type: workoutType
    });

    let longestDistance = 0;

    workouts.forEach(workout => {
      let distance = 0;
      switch (workoutType) {
        case 'Running':
          distance = workout.running?.distance || 0;
          break;
        case 'Cycling':
          distance = workout.cycling?.distance || 0;
          break;
        case 'Swimming':
          distance = workout.swimming?.distance || 0;
          break;
      }
      
      if (distance > longestDistance) {
        longestDistance = distance;
      }
    });

    return longestDistance;
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
}

module.exports = new AchievementController();