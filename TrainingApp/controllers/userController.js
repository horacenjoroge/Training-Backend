// controllers/userController.js
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Follower = require('../models/Follower');
const multer = require('multer');
const path = require('path');

// Set up multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function(req, file, cb) {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Upload middleware
exports.upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
}).single('image');

// Get current user's profile with stats
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      stats: user.stats,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get profile with social stats
exports.getFullProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get follower/following counts - check if models exist
    let followersCount = 0;
    let followingCount = 0;
    
    if (mongoose.models.Follower) {
      followersCount = await Follower.countDocuments({ following: user._id });
      followingCount = await Follower.countDocuments({ follower: user._id });
    }
    
    // Get achievements - check if model exists
    let achievements = [];
    if (mongoose.models.Achievement) {
      achievements = await Achievement.find({ user: user._id });
      achievements = achievements.map(a => ({
        id: a._id,
        title: a.title,
        emoji: a.emoji
      }));
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio || 'Fitness enthusiast | Runner',
      stats: {
        ...user.stats,
        following: followingCount,
        followers: followersCount
      },
      achievements: achievements
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Update user stats
exports.updateUserStats = async (req, res) => {
  try {
    const { workouts, hours, calories } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update stats if provided
    if (workouts !== undefined) {
      user.stats.workouts = workouts;
    }
    
    if (hours !== undefined) {
      user.stats.hours = hours;
    }
    
    if (calories !== undefined) {
      user.stats.calories = calories;
    }

    await user.save();

    res.json(user.stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, avatar, bio } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) {
      user.name = name;
    }
    
    if (avatar) {
      user.avatar = avatar;
    }
    
    // Update bio if your User model has a bio field
    if (bio && user.bio !== undefined) {
      user.bio = bio;
    }

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      stats: user.stats
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update avatar URL
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    
    res.json({
      message: 'Profile image updated',
      avatar: user.avatar
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get user's followers
exports.getFollowers = async (req, res) => {
  try {
    // Check if Follower model exists
    if (!mongoose.models.Follower) {
      return res.json([]);
    }
    
    const followers = await Follower.find({ following: req.user.id })
      .populate('follower', 'name email avatar')
      .sort({ createdAt: -1 });
    
    res.json(followers.map(f => f.follower));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get user's following
exports.getFollowing = async (req, res) => {
  try {
    // Check if Follower model exists
    if (!mongoose.models.Follower) {
      return res.json([]);
    }
    
    const following = await Follower.find({ follower: req.user.id })
      .populate('following', 'name email avatar')
      .sort({ createdAt: -1 });
    
    res.json(following.map(f => f.following));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Follow a user
exports.followUser = async (req, res) => {
  try {
    // Check if Follower model exists
    if (!mongoose.models.Follower) {
      return res.status(501).json({ message: 'Follower functionality not implemented' });
    }
    
    if (req.user.id === req.params.userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    
    const userToFollow = await User.findById(req.params.userId);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const existingFollow = await Follower.findOne({
      follower: req.user.id,
      following: req.params.userId
    });
    
    if (existingFollow) {
      return res.status(400).json({ message: 'Already following this user' });
    }
    
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
    // Check if Follower model exists
    if (!mongoose.models.Follower) {
      return res.status(501).json({ message: 'Follower functionality not implemented' });
    }
    
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

// Get user achievements
exports.getUserAchievements = async (req, res) => {
  try {
    // Check if Achievement model exists
    if (!mongoose.models.Achievement) {
      return res.json([]);
    }
    
    const achievements = await Achievement.find({ user: req.user.id });
    
    res.json(achievements);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Add achievement
exports.addAchievement = async (req, res) => {
  try {
    // Check if Achievement model exists
    if (!mongoose.models.Achievement) {
      return res.status(501).json({ message: 'Achievement functionality not implemented' });
    }
    
    const { title, emoji } = req.body;
    
    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }
    
    const newAchievement = new Achievement({
      user: req.user.id,
      title: title || 'Achievement',
      emoji
    });
    
    await newAchievement.save();
    
    res.status(201).json(newAchievement);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Don't forget to add this import at the top
const mongoose = require('mongoose');