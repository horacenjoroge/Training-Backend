// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { user: { id: user.id } },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }  // 1 day expiration
    );
    
    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { user: { id: user.id } },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '30d' }  // 30 day expiration
    );
    
    // Return both tokens
    res.json({
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).send('Server error');
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { user: { id: user.id } },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }  // 1 day expiration
    );
    
    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { user: { id: user.id } },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '30d' }  // 30 day expiration
    );
    
    // Log tokens for debugging (remove in production)
    console.log('Generated new tokens on login:');
    console.log('Access token expires in 1 day');
    console.log('Refresh token expires in 30 days');
    
    // Return both tokens
    res.json({
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
};

// Get user profile
exports.getUser = async (req, res) => {
  try {
    // Get user from database (exclude password)
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).send('Server error');
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Check if refresh token is provided
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }
    
    // Verify refresh token
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      async (err, decoded) => {
        if (err) {
          console.error('Refresh token verification error:', err);
          return res.status(401).json({ 
            message: 'Invalid refresh token',
            error: err.name
          });
        }
        
        try {
          // Get user from payload
          const userId = decoded.user?.id;
          if (!userId) {
            return res.status(401).json({ message: 'Invalid token payload' });
          }
          
          // Verify user exists
          const user = await User.findById(userId);
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }
          
          // Generate new access token
          const accessToken = jwt.sign(
            { user: { id: user.id } },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }  // 1 day expiration
          );
          
          // Optionally generate new refresh token if nearing expiration
          // This extends the session lifetime on active usage
          const currentTime = Math.floor(Date.now() / 1000);
          const refreshExpiration = decoded.exp;
          const refreshThreshold = 7 * 24 * 60 * 60; // 7 days in seconds
          
          let newRefreshToken = refreshToken;
          
          // If refresh token is older than threshold, generate a new one
          if (refreshExpiration - currentTime < refreshThreshold) {
            newRefreshToken = jwt.sign(
              { user: { id: user.id } },
              process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
              { expiresIn: '30d' }
            );
            
            console.log('Generated new refresh token (old one nearing expiration)');
          }
          
          // Return new tokens
          res.json({
            token: accessToken,
            refreshToken: newRefreshToken
          });
        } catch (userError) {
          console.error('User lookup error during refresh:', userError);
          res.status(500).send('Server error during token refresh');
        }
      }
    );
  } catch (err) {
    console.error('Refresh token error:', err.message);
    res.status(500).send('Server error');
  }
};

// Logout (optional - can be used to invalidate refresh tokens in a token blacklist)
exports.logout = async (req, res) => {
  try {
    // In a more advanced implementation, you could add the refresh token
    // to a blacklist or invalidate it in a database
    
    // For now, just return success (client will delete tokens)
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).send('Server error');
  }
};