const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/post');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Path to your React Native app's assets
const SOURCE_AVATAR_PATH = '/Users/la/Desktop/Repository/horacenjoroge/Trainly/assets/images/bike.jpg';
// Path for the server's public uploads directories
const AVATARS_DIR = path.join(__dirname, 'public/uploads/avatars');
const POSTS_DIR = path.join(__dirname, 'public/uploads/posts');

async function copyImages() {
  try {
    // Ensure directories exist
    if (!fs.existsSync(AVATARS_DIR)) {
      fs.mkdirSync(AVATARS_DIR, { recursive: true });
      console.log(`Created directory: ${AVATARS_DIR}`);
    }
    
    if (!fs.existsSync(POSTS_DIR)) {
      fs.mkdirSync(POSTS_DIR, { recursive: true });
      console.log(`Created directory: ${POSTS_DIR}`);
    }
    
    // Verify source image exists
    if (!fs.existsSync(SOURCE_AVATAR_PATH)) {
      console.error(`Source image not found at: ${SOURCE_AVATAR_PATH}`);
      return false;
    }
    
    // Copy for avatar
    const avatarDestPath = path.join(AVATARS_DIR, 'default-avatar.jpg');
    fs.copyFileSync(SOURCE_AVATAR_PATH, avatarDestPath);
    console.log(`Copied image to: ${avatarDestPath}`);
    
    // Copy for post image
    const postDestPath = path.join(POSTS_DIR, 'default-post-image.jpg');
    fs.copyFileSync(SOURCE_AVATAR_PATH, postDestPath);
    console.log(`Copied image to: ${postDestPath}`);
    
    return true;
  } catch (error) {
    console.error('Error copying images:', error);
    return false;
  }
}

async function updateDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Update users with default avatar path
    const usersResult = await User.updateMany(
      { $or: [{ avatar: '' }, { avatar: 'default-avatar-url' }] },
      { $set: { avatar: '/uploads/avatars/default-avatar.jpg' } }
    );
    
    console.log(`Updated ${usersResult.modifiedCount} users with default avatars`);
    
    // Update posts with file:/// URLs
    const postsResult = await Post.updateMany(
      { image: { $regex: /^file:\/\// } },
      { $set: { image: '/uploads/posts/default-post-image.jpg' } }
    );
    
    console.log(`Updated ${postsResult.modifiedCount} posts with default images`);
    
    // Update User model schema default value
    try {
      const userSchema = User.schema;
      const avatarPath = userSchema.path('avatar').defaultValue;
      
      if (avatarPath !== '/uploads/avatars/default-avatar.jpg') {
        console.log('Note: Your User model default avatar path is:', avatarPath);
        console.log('Consider updating your User model to use: /uploads/avatars/default-avatar.jpg');
      }
    } catch (err) {
      console.log('Could not check User model schema default value');
    }
    
    console.log('Database update completed successfully!');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function main() {
  console.log('Starting image fix script...');
  
  // Step 1: Copy the images
  const imagesCopied = await copyImages();
  
  if (!imagesCopied) {
    console.error('Error copying images. Proceeding with database update anyway...');
  }
  
  // Step 2: Update database records
  await updateDatabase();
  
  console.log('Image fix script completed!');
}

// Run the script
main();