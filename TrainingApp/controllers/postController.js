// controllers/postController.js
const Post = require('../models/post');
const User = require('../models/user');

// Get all posts
exports.getPosts = async (req, res) => {
  try {
    console.log("Fetching posts for user:", req.user.id);
    
    const posts = await Post.find()
      .sort({ createdAt: -1 }) // Newest first
      .populate('user', 'name avatar')
      .lean();

    console.log(`Found ${posts.length} posts`);

    // Format posts for the frontend
    const formattedPosts = posts.map(post => ({
      id: post._id,
      user: {
        id: post.user._id,
        name: post.user.name,
        avatar: post.user.avatar || 'default-avatar-url'
      },
      content: post.content,
      image: post.image,
      workoutDetails: post.workoutDetails || null,
      likes: post.likes.length,
      comments: post.comments.length,
      createdAt: post.createdAt,
      isLiked: req.user ? post.likes.some(like => like.toString() === req.user.id) : false
    }));

    console.log("Sending formatted posts to client");
    res.json(formattedPosts);
  } catch (err) {
    console.error("Error fetching posts:", err.message);
    res.status(500).send('Server error');
  }
};

// Create a post
exports.createPost = async (req, res) => {
  try {
    console.log("Create post request from user:", req.user.id);
    console.log("Post data received:", req.body);
    
    const { content, image, workoutDetails } = req.body;

    // Create new post object
    const newPost = new Post({
      user: req.user.id,
      content,
      image,
      workoutDetails
    });

    console.log("Saving new post to database:", newPost);
    const post = await newPost.save();
    console.log("Post saved successfully with ID:", post._id);
    
    // Get user info to send back
    const user = await User.findById(req.user.id).select('name avatar');

    // Format for response
    const formattedPost = {
      id: post._id,
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar || 'default-avatar-url'
      },
      content: post.content,
      image: post.image,
      workoutDetails: post.workoutDetails || null,
      likes: 0,
      comments: 0,
      createdAt: post.createdAt,
      isLiked: false
    };

    // If workoutDetails are included, update user stats
    if (workoutDetails && workoutDetails.type) {
      try {
        console.log("Updating user stats with workout details");
        const userToUpdate = await User.findById(req.user.id);
        
        if (userToUpdate) {
          // Increment stats
          userToUpdate.stats.workouts += 1;
          userToUpdate.stats.hours += (parseInt(workoutDetails.duration) || 0) / 60; // Convert minutes to hours
          userToUpdate.stats.calories += parseInt(workoutDetails.calories) || 0;
          
          await userToUpdate.save();
          console.log("User stats updated successfully");
        }
      } catch (statsErr) {
        console.error("Error updating user stats:", statsErr);
        // Don't fail the whole request if stats update fails
      }
    }

    console.log("Sending formatted post back to client");
    res.json(formattedPost);
  } catch (err) {
    console.error("Error creating post:", err.message);
    res.status(500).send('Server error');
  }
};

// Like a post
exports.likePost = async (req, res) => {
  try {
    console.log(`Like/unlike request for post ${req.params.id} from user ${req.user.id}`);
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      console.log("Post not found");
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if post has already been liked by this user
    const alreadyLiked = post.likes.some(like => like.toString() === req.user.id);
    console.log("Post already liked by user?", alreadyLiked);

    if (alreadyLiked) {
      // Unlike the post
      console.log("Removing like");
      post.likes = post.likes.filter(like => like.toString() !== req.user.id);
    } else {
      // Like the post
      console.log("Adding like");
      post.likes.push(req.user.id);
    }

    await post.save();
    console.log(`Post now has ${post.likes.length} likes`);
    
    res.json({ 
      likes: post.likes.length,
      isLiked: !alreadyLiked
    });
  } catch (err) {
    console.error("Error liking post:", err.message);
    res.status(500).send('Server error');
  }
};

// Add comment to post
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    console.log(`Adding comment to post ${req.params.id} from user ${req.user.id}`);
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      console.log("Post not found");
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      user: req.user.id,
      text
    };

    post.comments.unshift(newComment);
    await post.save();
    console.log("Comment added successfully");

    // Get user info
    const user = await User.findById(req.user.id).select('name avatar');

    // Format comment for response
    const formattedComment = {
      id: post.comments[0]._id,
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar || 'default-avatar-url'
      },
      text,
      date: post.comments[0].date
    };

    res.json(formattedComment);
  } catch (err) {
    console.error("Error adding comment:", err.message);
    res.status(500).send('Server error');
  }
};

// Get comments for a post
exports.getComments = async (req, res) => {
  try {
    console.log(`Fetching comments for post ${req.params.id}`);
    
    const post = await Post.findById(req.params.id)
      .populate('comments.user', 'name avatar');
    
    if (!post) {
      console.log("Post not found");
      return res.status(404).json({ message: 'Post not found' });
    }

    console.log(`Found ${post.comments.length} comments`);

    // Format comments for response
    const comments = post.comments.map(comment => ({
      id: comment._id,
      user: {
        id: comment.user._id,
        name: comment.user.name,
        avatar: comment.user.avatar || 'default-avatar-url'
      },
      text: comment.text,
      date: comment.date
    }));

    res.json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err.message);
    res.status(500).send('Server error');
  }
};