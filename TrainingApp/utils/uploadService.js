// utils/uploadService.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create upload directories
ensureDirectoryExists(path.join(__dirname, '../public/uploads/avatars'));
ensureDirectoryExists(path.join(__dirname, '../public/uploads/posts'));

// Common file filter for images
const imageFileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
};

// Avatar upload storage configuration
const avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dest = path.join(__dirname, '../public/uploads/avatars');
    cb(null, dest);
  },
  filename: function(req, file, cb) {
    // Use user ID + timestamp for uniqueness
    const fileName = `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

// Post image upload storage configuration
const postStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dest = path.join(__dirname, '../public/uploads/posts');
    cb(null, dest);
  },
  filename: function(req, file, cb) {
    // Use post ID (if available) or user ID + timestamp for uniqueness
    const postId = req.body.postId || 'new';
    const fileName = `post-${postId}-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

// Avatar upload middleware
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFileFilter
});

// Post image upload middleware
const postUpload = multer({
  storage: postStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: imageFileFilter
});

// Helper function to format image URL
const formatImageUrl = (filename, type) => {
  if (!filename) return null;
  const baseFolder = type === 'avatar' ? 'avatars' : 'posts';
  return `/uploads/${baseFolder}/${filename}`;
};

// Helper to remove old files (optional cleanup)
const removeOldFile = (filePath) => {
  if (!filePath) return;
  
  const fullPath = path.join(__dirname, '../public', filePath);
  
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (!err) {
      fs.unlink(fullPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error removing old file:', unlinkErr);
        }
      });
    }
  });
};

module.exports = {
  avatarUpload: avatarUpload.single('image'),
  postUpload: postUpload.single('image'),
  formatImageUrl,
  removeOldFile
};