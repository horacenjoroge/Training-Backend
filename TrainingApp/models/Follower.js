// models/Follower.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const followerSchema = new Schema({
  follower: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique relationships
followerSchema.index({ follower: 1, following: 1 }, { unique: true });

module.exports = mongoose.model('Follower', followerSchema);