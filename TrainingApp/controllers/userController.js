// controllers/userController.js
const User = require('../models/user');

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
    const { name, avatar } = req.body;
    
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

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      stats: user.stats
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};