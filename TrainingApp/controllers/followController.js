// controllers/followController.js
const User = require('../models/user');
const Follower = require('../models/Follower');

// Follow a user
exports.followUser = async (req, res) => {
  try {
    // Check if trying to follow self
    if (req.user.id === req.params.userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    
    // Check if user exists
    const userToFollow = await User.findById(req.params.userId);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already following
    const existingFollow = await Follower.findOne({
      follower: req.user.id,
      following: req.params.userId
    });
    
    if (existingFollow) {
      return res.status(400).json({ message: 'You are already following this user' });
    }
    
    // Create new follow relationship
    const newFollow = new Follower({
      follower: req.user.id,
      following: req.params.userId
    });
    
    await newFollow.save();
    
    res.json({ message: 'User followed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
  try {
    // Delete follow relationship
    const result = await Follower.findOneAndDelete({
      follower: req.user.id,
      following: req.params.userId
    });
    
    if (!result) {
      return res.status(400).json({ message: 'You are not following this user' });
    }
    
    res.json({ message: 'User unfollowed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get followers
exports.getFollowers = async (req, res) => {
  try {
    // Use query param if provided, otherwise use current user's ID
    const userId = req.query.userId || req.user.id;
    
    const followers = await Follower.find({ following: userId })
      .populate('follower', 'name email avatar bio')
      .sort({ createdAt: -1 });
        
    res.json(followers.map(f => f.follower));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get following
exports.getFollowing = async (req, res) => {
  try {
    // Use query param if provided, otherwise use current user's ID
    const userId = req.query.userId || req.user.id;
    
    const following = await Follower.find({ follower: userId })
      .populate('following', 'name email avatar bio')
      .sort({ createdAt: -1 });
        
    res.json(following.map(f => f.following));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};