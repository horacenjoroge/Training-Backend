// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true
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
  stats: {
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
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Check if the model exists before creating it
module.exports = mongoose.models.User || mongoose.model('User', userSchema);