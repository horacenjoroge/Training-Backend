// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add debug logging
    console.log('Decoded token structure:', JSON.stringify(decoded, null, 2));
    
    // Use decoded.user if it exists, otherwise use the whole decoded object
    // This covers both token formats
    if (decoded.user) {
      req.user = decoded.user;
    } else if (decoded.id) {
      req.user = { id: decoded.id };
    } else {
      req.user = decoded;
    }
    
    console.log('User set in request:', req.user);
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};