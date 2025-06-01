const mongoose = require('mongoose');

const WorkoutSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'],
    index: true,
  },
  sessionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
  },
  type: { 
    type: String, 
    required: [true, 'Workout type is required'],
    enum: ['Running', 'Cycling', 'Swimming', 'Gym', 'Walking', 'Hiking'],
    // Removed: index: true (if you have WorkoutSchema.index({ type: 1 }) elsewhere, remove it OR remove this comment and add explicit index below)
  },
  name: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Workout name cannot exceed 100 characters'],
  },
  startTime: { 
    type: Date, 
    required: [true, 'Start time is required'],
    // Removed: index: true (if you have WorkoutSchema.index({ startTime: 1 }) elsewhere, remove it OR remove this comment and add explicit index below)
  },
  endTime: { 
    type: Date, 
    required: [true, 'End time is required'] 
  },
  duration: { 
    type: Number, 
    required: [true, 'Duration is required'],
    min: [0, 'Duration must be positive'],
  },
  calories: { 
    type: Number, 
    default: 0,
    min: [0, 'Calories must be positive'],
  },
  notes: { 
    type: String, 
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  location: {
    city: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    weather: {
      temperature: Number,
      conditions: String,
      humidity: Number,
      windSpeed: Number,
    },
  },
  running: {
    distance: { type: Number, min: 0 },
    pace: {
      average: { type: Number, min: 0 },
      best: { type: Number, min: 0 },
      current: { type: Number, min: 0 },
    },
    speed: {
      average: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      current: { type: Number, min: 0 },
    },
    elevation: {
      gain: { type: Number, default: 0 },
      loss: { type: Number, default: 0 },
      max: Number,
      min: Number,
      current: Number,
    },
    splits: [{
      number: Number,
      distance: Number,
      time: Number,
      pace: Number,
      elevation: Number,
      timestamp: Date,
      type: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    }],
    route: {
      gpsPoints: [{
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        altitude: Number,
        timestamp: { type: Date, required: true },
        accuracy: Number,
        speed: Number,
        distance: Number,
      }],
      polyline: String,
      totalPoints: { type: Number, default: 0 },
      boundingBox: {
        north: Number,
        south: Number,
        east: Number,
        west: Number,
      },
    },
    heartRate: {
      average: Number,
      max: Number,
      min: Number,
      zones: [{
        zone: { type: Number, min: 1, max: 5 },
        duration: Number,
        percentage: Number,
      }],
    },
    performance: {
      averageMovingSpeed: Number,
      movingTime: Number,
      stoppedTime: Number,
      maxPace: Number,
      minPace: Number,
    },
  },
  cycling: {
    distance: { type: Number, min: 0 },
    speed: {
      average: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      current: { type: Number, min: 0 },
    },
    elevation: {
      gain: { type: Number, default: 0 },
      loss: { type: Number, default: 0 },
      current: Number,
      max: Number,
      min: Number,
    },
    cadence: {
      average: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      current: { type: Number, min: 0 },
    },
    power: {
      average: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      normalized: { type: Number, min: 0 },
      current: { type: Number, min: 0 },
    },
    segments: [{
      id: String,
      name: String,
      startTime: Date,
      endTime: Date,
      startDistance: Number,
      distance: Number,
      averageSpeed: Number,
      maxSpeed: Number,
      elevationGain: Number,
      elevationLoss: Number,
      route: [{
        latitude: Number,
        longitude: Number,
        altitude: Number,
        timestamp: Date,
      }],
    }],
    intervals: [{
      id: String,
      type: { type: String, enum: ['work', 'rest', 'warmup', 'cooldown'] },
      startTime: Date,
      duration: Number,
      targetPower: Number,
      actualPower: Number,
      averageSpeed: Number,
      distance: Number,
    }],
    route: {
      gpsPoints: [{
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        altitude: Number,
        timestamp: { type: Date, required: true },
        speed: Number,
        accuracy: Number,
        distance: Number,
      }],
      polyline: String,
      totalPoints: { type: Number, default: 0 },
      boundingBox: {
        north: Number,
        south: Number,
        east: Number,
        west: Number,
      },
    },
    performance: {
      averageMovingSpeed: Number,
      movingTime: Number,
      stoppedTime: Number,
      maxGradient: Number,
      minGradient: Number,
    },
    autoPause: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 2 },
      pausedSegments: [{
        startTime: Date,
        endTime: Date,
        location: {
          latitude: Number,
          longitude: Number,
        },
      }],
    },
  },
  swimming: {
    poolLength: {
      type: Number,
      required: function() { return this.type === 'Swimming'; },
      min: [10, 'Pool length must be at least 10 meters'],
    },
    distance: { type: Number, min: 0 },
    strokeType: {
      type: String,
      enum: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Mixed'],
      default: 'Freestyle',
    },
    laps: [{
      lapNumber: { type: Number, required: true },
      time: { type: Number, required: true },
      strokeCount: { type: Number, min: 0 },
      swolf: { type: Number, min: 0 },
      strokeType: String,
      timestamp: { type: Date, default: Date.now },
      distance: { type: Number, default: 25 },
    }],
    intervals: [{
      type: String,
      laps: Number,
      totalTime: Number,
      restTime: Number,
      averageSwolf: Number,
      startLap: Number,
      endLap: Number,
    }],
    technique: {
      averageStrokeRate: { type: Number, min: 0 },
      averageSwolf: { type: Number, min: 0 },
      efficiency: { type: Number, min: 0, max: 100 },
    },
    restPeriods: [{
      startTime: Date,
      endTime: Date,
      duration: Number,
      afterLap: Number,
    }],
  },
  gym: {
    exercises: [{
      name: { type: String, required: true },
      category: {
        type: String,
        enum: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'full-body'],
      },
      muscleGroups: [String],
      sets: [{
        setNumber: { type: Number, required: true },
        targetReps: { type: Number, min: 0 },
        actualReps: { type: Number, min: 0 },
        weight: { type: Number, min: 0 },
        restTime: { type: Number, min: 0 },
        completed: { type: Boolean, default: false },
        rpe: { type: Number, min: 1, max: 10 },
        notes: String,
        timestamp: { type: Date, default: Date.now },
      }],
      totalVolume: { type: Number, default: 0 },
      personalBest: {
        weight: Number,
        reps: Number,
        date: Date,
      },
    }],
    stats: {
      totalSets: { type: Number, default: 0 },
      totalReps: { type: Number, default: 0 },
      totalWeight: { type: Number, default: 0 },
      exerciseCount: { type: Number, default: 0 },
      muscleGroups: [String],
      averageRestTime: { type: Number, default: 0 },
    },
  },
  heartRate: {
    average: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    min: { type: Number, min: 0 },
    zones: [{
      zone: { type: Number, min: 1, max: 5 },
      duration: Number,
      percentage: Number,
    }],
  },
}, { timestamps: true });

// Add compound indexes for better query performance
// These are more useful than individual field indexes
WorkoutSchema.index({ userId: 1, startTime: -1 }); // User workouts sorted by date
WorkoutSchema.index({ userId: 1, type: 1 }); // User workouts by type
WorkoutSchema.index({ type: 1, startTime: -1 }); // Workouts by type and date

module.exports = mongoose.model('Workout', WorkoutSchema);