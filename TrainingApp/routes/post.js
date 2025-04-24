// routes/post.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const postController = require('../controllers/postController');

// @route   GET api/posts
// @desc    Get all posts
// @access  Public
router.get('/', auth, postController.getPosts);

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post('/', auth, postController.createPost);

// @route   PUT api/posts/:id/like
// @desc    Like or unlike a post
// @access  Private
router.put('/:id/like', auth, postController.likePost);

// @route   POST api/posts/:id/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/:id/comments', auth, postController.addComment);

// @route   GET api/posts/:id/comments
// @desc    Get comments for a post
// @access  Private
router.get('/:id/comments', auth, postController.getComments);

module.exports = router;