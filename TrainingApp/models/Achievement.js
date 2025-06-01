const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const achievementSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  emoji: {
    type: String,
    required: true
  },
  
  // NEW: Enhanced achievement data
  type: {
    type: String,
    required: true
    // Removed: index: true (handled by explicit index below)
    // Examples: 'first_workout', 'distance_5k', 'streak_7_days', 'total_100_workouts'
  },
  category: {
    type: String,
    required: true,
    enum: ['distance', 'duration', 'consistency', 'strength', 'milestone', 'social', 'technique']
    // Removed: index: true (handled by compound index below)
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Achievement progression
  progress: {
    current: { type: Number, default: 0 },
    target: { type: Number, required: true },
    percentage: { type: Number, default: 0 }
  },
  
  // Achievement metadata
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  points: {
    type: Number,
    default: 10
  },
  
  // Achievement trigger data
  triggerValue: Number, // The value that triggered this achievement
  workoutId: {
    type: Schema.Types.ObjectId,
    ref: 'Workout'
  },
  workoutType: {
    type: String,
    enum: ['Running', 'Cycling', 'Swimming', 'Gym', 'Walking', 'Hiking']
  },
  
  // Achievement status
  isUnlocked: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  
  // Social features
  isShared: {
    type: Boolean,
    default: false
  },
  sharedAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance (no duplicates)
achievementSchema.index({ user: 1, createdAt: -1 });
achievementSchema.index({ category: 1, rarity: 1 });
achievementSchema.index({ type: 1 });

// Virtual for achievement age
achievementSchema.virtual('daysAgo').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (24 * 60 * 60 * 1000));
});

// Method to check if achievement is recent (within last 7 days)
achievementSchema.methods.isRecent = function() {
  const daysDiff = (Date.now() - this.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  return daysDiff <= 7;
};

// Static method to get achievement templates
// Fixed getAchievementTemplates method for your Achievement model
achievementSchema.statics.getAchievementTemplates = function() {
  return {
    // Milestone achievements
    first_workout: {
      title: 'First Steps',
      emoji: '🎯',
      description: 'Completed your very first workout!',
      category: 'milestone',
      rarity: 'common',
      points: 50
    },
    workouts_10: {
      title: 'Getting Started',
      emoji: '💪',
      description: 'Completed 10 workouts',
      category: 'milestone',
      rarity: 'common',
      points: 100
    },
    workouts_50: {
      title: 'Fitness Enthusiast',
      emoji: '🔥',
      description: 'Completed 50 workouts',
      category: 'milestone',
      rarity: 'rare',
      points: 250
    },
    workouts_100: {
      title: 'Fitness Warrior',
      emoji: '⚡',
      description: 'Completed 100 workouts',
      category: 'milestone',
      rarity: 'epic',
      points: 500
    },
    workouts_250: {
      title: 'Fitness Master',
      emoji: '👑',
      description: 'Completed 250 workouts',
      category: 'milestone',
      rarity: 'epic',
      points: 750
    },
    workouts_500: {
      title: 'Workout Legend',
      emoji: '🔥',
      description: 'Completed 500 workouts',
      category: 'milestone',
      rarity: 'legendary',
      points: 1500
    },
    
    // Distance achievements
    distance_5k: {
      title: '5K Champion',
      emoji: '🏃‍♂️',
      description: 'Completed 5 kilometers in a single workout',
      category: 'distance',
      rarity: 'common',
      points: 75
    },
    distance_10k: {
      title: '10K Hero',
      emoji: '🏃‍♀️',
      description: 'Completed 10 kilometers in a single workout',
      category: 'distance',
      rarity: 'rare',
      points: 150
    },
    distance_half_marathon: {
      title: 'Half Marathon Legend',
      emoji: '🏅',
      description: 'Completed 21K in a single workout',
      category: 'distance',
      rarity: 'epic',
      points: 300
    },
    distance_marathon: {
      title: 'Marathon Hero',
      emoji: '🏅',
      description: 'Completed 42.195K in a single workout',
      category: 'distance',
      rarity: 'legendary',
      points: 1000
    },
    
    // Consistency achievements
    streak_3_days: {
      title: 'On a Roll',
      emoji: '🔥',
      description: 'Worked out for 3 days in a row',
      category: 'consistency',
      rarity: 'common',
      points: 60
    },
    streak_7_days: {
      title: 'Week Warrior',
      emoji: '📅',
      description: 'Worked out for 7 days straight',
      category: 'consistency',
      rarity: 'rare',
      points: 140
    },
    streak_14_days: {
      title: 'Two Week Warrior',
      emoji: '⚡',
      description: 'Worked out for 14 days straight',
      category: 'consistency',
      rarity: 'rare',
      points: 200
    },
    streak_30_days: {
      title: 'Monthly Master',
      emoji: '🌟',
      description: 'Worked out for 30 days straight',
      category: 'consistency',
      rarity: 'legendary',
      points: 1000
    },
    streak_60_days: {
      title: 'Two Month Master',
      emoji: '💎',
      description: 'Worked out for 60 days straight',
      category: 'consistency',
      rarity: 'epic',
      points: 1200
    },
    streak_100_days: {
      title: 'Century Streak',
      emoji: '🏆',
      description: 'Worked out for 100 days straight',
      category: 'consistency',
      rarity: 'legendary',
      points: 2000
    },
    
    // Swimming achievements
    swimming_first: {
      title: 'Pool Pioneer',
      emoji: '🏊‍♂️',
      description: 'Completed your first swimming workout',
      category: 'milestone',
      rarity: 'common',
      points: 50
    },
    swimming_100_laps: {
      title: 'Lap Master',
      emoji: '🌊',
      description: 'Completed 100 laps total',
      category: 'distance',
      rarity: 'rare',
      points: 200
    },
    swimming_500_laps: {
      title: 'Pool Master',
      emoji: '🌊',
      description: 'Completed 500 laps total',
      category: 'distance',
      rarity: 'epic',
      points: 400
    },
    
    // Cycling achievements
    cycling_first: {
      title: 'Bike Beginner',
      emoji: '🚴‍♂️',
      description: 'Completed your first cycling workout',
      category: 'milestone',
      rarity: 'common',
      points: 50
    },
    cycling_50k: {
      title: 'Long Distance Rider',
      emoji: '🚴‍♀️',
      description: 'Completed 50K in a single ride',
      category: 'distance',
      rarity: 'rare',
      points: 200
    },
    cycling_100k: {
      title: 'Century Rider',
      emoji: '🚵‍♀️',
      description: 'Completed 100K in a single ride',
      category: 'distance',
      rarity: 'epic',
      points: 400
    },

    // Time-based achievements
    duration_hour: {
      title: 'Hour Power',
      emoji: '⏰',
      description: 'Completed a workout lasting 1 hour',
      category: 'duration',
      rarity: 'common',
      points: 100
    },
    duration_2_hours: {
      title: 'Endurance Master',
      emoji: '🎯',
      description: 'Completed a workout lasting 2 hours',
      category: 'duration',
      rarity: 'rare',
      points: 250
    },

    // Social achievements
    first_share: {
      title: 'Social Starter',
      emoji: '📱',
      description: 'Shared your first workout',
      category: 'social',
      rarity: 'common',
      points: 25
    },
    popular_workout: {
      title: 'Popular Post',
      emoji: '❤️',
      description: 'Received 10 likes on a workout',
      category: 'social',
      rarity: 'rare',
      points: 150
    },

    // Running-specific achievements  
    running_first: {
      title: 'Running Rookie',
      emoji: '🏃‍♂️',
      description: 'Completed your first running workout',
      category: 'milestone',
      rarity: 'common',
      points: 50
    },

    // Gym achievements
    gym_first: {
      title: 'Gym Starter',
      emoji: '🏋️‍♂️',
      description: 'Completed your first gym workout',
      category: 'milestone',
      rarity: 'common',
      points: 50
    },

    // Technique achievements
    perfect_technique: {
      title: 'Perfect Form',
      emoji: '✨',
      description: 'Achieved perfect technique score',
      category: 'technique',
      rarity: 'rare',
      points: 200
    }
  };
};

// Check if the model exists before creating it
module.exports = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);