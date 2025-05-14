// controllers/achievementController.js
const Achievement = require('../models/Achievement');

// Get user achievements
exports.getUserAchievements = async (req, res) => {
  try {
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
    
    res.json(newAchievement);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};