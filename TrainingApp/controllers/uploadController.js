// controllers/uploadController.js
const path = require('path');
const User = require('../models/User');
const Post = require('../models/post');
const { formatImageUrl, removeOldFile } = require('../utils/uploadService');

// Upload avatar and update user profile
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove old avatar if it exists (optional cleanup)
    if (user.avatar && !user.avatar.includes('default-avatar')) {
      removeOldFile(user.avatar);
    }
    
    // Format new avatar URL
    const avatarUrl = formatImageUrl(req.file.filename, 'avatar');
    
    // Update user's avatar
    user.avatar = avatarUrl;
    await user.save();
    
    res.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarUrl
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ message: 'Server error during avatar upload' });
  }
};

// Upload post image
exports.uploadPostImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Format image URL
    const imageUrl = formatImageUrl(req.file.filename, 'post');
    
    // If updating existing post
    if (req.body.postId) {
      const post = await Post.findById(req.body.postId);
      
      // Check post ownership
      if (post && post.user.toString() === req.user.id) {
        // Remove old image if it exists
        if (post.image) {
          removeOldFile(post.image);
        }
        
        // Update post with new image
        post.image = imageUrl;
        await post.save();
      }
    }
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: imageUrl
    });
  } catch (err) {
    console.error('Post image upload error:', err);
    res.status(500).json({ message: 'Server error during image upload' });
  }
};