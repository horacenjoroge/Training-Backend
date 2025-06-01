// models/User.js - Updated to support workout tracking
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: '/uploads/avatars/default-avatar.jpg' 
  },
  
  // Enhanced stats for comprehensive workout tracking
  stats: {
    // Basic stats (keeping your existing structure)
    workouts: {
      type: Number,
      default: 0
    },
    hours: {
      type: Number,
      default: 0
    },
    calories: {
      type: Number,
      default: 0
    },
    
    // NEW: Enhanced workout statistics
    totalDistance: {
      type: Number,
      default: 0 // meters
    },
    totalDuration: {
      type: Number, 
      default: 0 // seconds
    },
    currentStreak: {
      type: Number,
      default: 0 // consecutive workout days
    },
    longestStreak: {
      type: Number,
      default: 0 // best streak achieved
    },
    lastWorkout: {
      type: Date
    },
    averageWorkoutsPerWeek: {
      type: Number,
      default: 0
    },
    
    // Activity-specific stats
    running: {
      totalRuns: { type: Number, default: 0 },
      totalDistance: { type: Number, default: 0 }, // meters
      totalDuration: { type: Number, default: 0 }, // seconds
      bestPace: { type: Number, default: 0 }, // min/km
      longestRun: { type: Number, default: 0 }, // meters
      avgPace: { type: Number, default: 0 }
    },
    cycling: {
      totalRides: { type: Number, default: 0 },
      totalDistance: { type: Number, default: 0 }, // meters
      totalDuration: { type: Number, default: 0 }, // seconds
      bestSpeed: { type: Number, default: 0 }, // km/h
      longestRide: { type: Number, default: 0 }, // meters
      avgSpeed: { type: Number, default: 0 },
      totalElevation: { type: Number, default: 0 } // meters climbed
    },
    swimming: {
      totalSwims: { type: Number, default: 0 },
      totalDistance: { type: Number, default: 0 }, // meters
      totalDuration: { type: Number, default: 0 }, // seconds
      totalLaps: { type: Number, default: 0 },
      bestSwolf: { type: Number, default: 0 },
      avgSwolf: { type: Number, default: 0 }
    },
    gym: {
      totalWorkouts: { type: Number, default: 0 },
      totalDuration: { type: Number, default: 0 }, // seconds
      totalWeight: { type: Number, default: 0 }, // kg lifted
      totalSets: { type: Number, default: 0 },
      totalReps: { type: Number, default: 0 },
      exercisesCompleted: { type: Number, default: 0 }
    }
  },
  
  // NEW: User preferences for workout tracking
  preferences: {
    units: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric'
    },
    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'friends'
    },
    notifications: {
      workoutReminders: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
      social: { type: Boolean, default: true }
    },
    autoSave: {
      type: Boolean,
      default: true
    }
  },
  
  // NEW: User profile information
  profile: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    weight: Number, // kg
    height: Number, // cm
    fitnessLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    bio: {
      type: String,
      maxlength: 500
    }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's age
userSchema.virtual('age').get(function() {
  if (!this.profile.dateOfBirth) return null;
  return Math.floor((Date.now() - this.profile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.name;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update timestamps
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update workout stats
userSchema.methods.updateWorkoutStats = function(workoutData) {
  // Update basic stats (keeping compatibility with existing structure)
  this.stats.workouts += 1;
  this.stats.hours += (workoutData.duration || 0) / 3600; // convert seconds to hours
  this.stats.calories += workoutData.calories || 0;
  
  // Update enhanced stats
  this.stats.totalDuration += workoutData.duration || 0;
  this.stats.totalDistance += this.getWorkoutDistance(workoutData);
  
  // Update activity-specific stats
  this.updateActivityStats(workoutData);
  
  // Update streak
  this.updateStreak(workoutData.startTime || new Date());
  
  // Update last workout
  this.stats.lastWorkout = workoutData.startTime || new Date();
  
  // Calculate average workouts per week
  const daysSinceCreation = (Date.now() - this.createdAt) / (24 * 60 * 60 * 1000);
  this.stats.averageWorkoutsPerWeek = (this.stats.workouts / daysSinceCreation) * 7;
};

// Helper method to get distance from workout data
userSchema.methods.getWorkoutDistance = function(workoutData) {
  switch (workoutData.type) {
    case 'Running':
      return workoutData.running?.distance || 0;
    case 'Cycling':
      return workoutData.cycling?.distance || 0;
    case 'Swimming':
      return workoutData.swimming?.distance || 0;
    default:
      return 0;
  }
};

// Helper method to update activity-specific stats
userSchema.methods.updateActivityStats = function(workoutData) {
  const type = workoutData.type?.toLowerCase();
  
  switch (type) {
    case 'running':
      this.updateRunningStats(workoutData);
      break;
    case 'cycling':
      this.updateCyclingStats(workoutData);
      break;
    case 'swimming':
      this.updateSwimmingStats(workoutData);
      break;
    case 'gym':
      this.updateGymStats(workoutData);
      break;
  }
};

userSchema.methods.updateRunningStats = function(workoutData) {
  const stats = this.stats.running;
  const runData = workoutData.running || {};
  
  stats.totalRuns += 1;
  stats.totalDistance += runData.distance || 0;
  stats.totalDuration += workoutData.duration || 0;
  
  // Update best pace (lower is better)
  const avgPace = runData.pace?.average || 0;
  if (avgPace > 0 && (stats.bestPace === 0 || avgPace < stats.bestPace)) {
    stats.bestPace = avgPace;
  }
  
  // Update longest run
  if ((runData.distance || 0) > stats.longestRun) {
    stats.longestRun = runData.distance || 0;
  }
  
  // Calculate average pace
  if (stats.totalDistance > 0 && stats.totalDuration > 0) {
    stats.avgPace = (stats.totalDuration / 60) / (stats.totalDistance / 1000); // min/km
  }
};

userSchema.methods.updateCyclingStats = function(workoutData) {
  const stats = this.stats.cycling;
  const cyclingData = workoutData.cycling || {};
  
  stats.totalRides += 1;
  stats.totalDistance += cyclingData.distance || 0;
  stats.totalDuration += workoutData.duration || 0;
  stats.totalElevation += cyclingData.elevation?.gain || 0;
  
  // Update best speed
  const maxSpeed = cyclingData.speed?.max || 0;
  if (maxSpeed > stats.bestSpeed) {
    stats.bestSpeed = maxSpeed;
  }
  
  // Update longest ride
  if ((cyclingData.distance || 0) > stats.longestRide) {
    stats.longestRide = cyclingData.distance || 0;
  }
  
  // Calculate average speed
  if (stats.totalDistance > 0 && stats.totalDuration > 0) {
    stats.avgSpeed = (stats.totalDistance / 1000) / (stats.totalDuration / 3600); // km/h
  }
};

userSchema.methods.updateSwimmingStats = function(workoutData) {
  const stats = this.stats.swimming;
  const swimData = workoutData.swimming || {};
  
  stats.totalSwims += 1;
  stats.totalDistance += swimData.distance || 0;
  stats.totalDuration += workoutData.duration || 0;
  stats.totalLaps += swimData.laps?.length || 0;
  
  // Update best SWOLF (lower is better)
  const avgSwolf = swimData.technique?.averageSwolf || 0;
  if (avgSwolf > 0 && (stats.bestSwolf === 0 || avgSwolf < stats.bestSwolf)) {
    stats.bestSwolf = avgSwolf;
  }
  
  // Calculate average SWOLF
  if (stats.totalSwims > 0) {
    // This is a simplified calculation - you might want to store individual SWOLFs
    stats.avgSwolf = (stats.avgSwolf * (stats.totalSwims - 1) + avgSwolf) / stats.totalSwims;
  }
};

userSchema.methods.updateGymStats = function(workoutData) {
  const stats = this.stats.gym;
  const gymData = workoutData.gym || {};
  
  stats.totalWorkouts += 1;
  stats.totalDuration += workoutData.duration || 0;
  stats.totalWeight += gymData.stats?.totalWeight || 0;
  stats.totalSets += gymData.stats?.totalSets || 0;
  stats.totalReps += gymData.stats?.totalReps || 0;
  stats.exercisesCompleted += gymData.stats?.exerciseCount || 0;
};

// Helper method to update workout streak
userSchema.methods.updateStreak = function(workoutDate) {
  const today = new Date(workoutDate);
  today.setHours(0, 0, 0, 0);
  
  const lastWorkoutDate = this.stats.lastWorkout ? new Date(this.stats.lastWorkout) : null;
  if (lastWorkoutDate) {
    lastWorkoutDate.setHours(0, 0, 0, 0);
  }
  
  if (!lastWorkoutDate) {
    // First workout
    this.stats.currentStreak = 1;
  } else if (lastWorkoutDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
    // Consecutive day
    this.stats.currentStreak += 1;
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;
    }
  } else if (lastWorkoutDate.getTime() !== today.getTime()) {
    // Streak broken
    this.stats.currentStreak = 1;
  }
  // If same day, don't change streak
};

// Check if the model exists before creating it
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
