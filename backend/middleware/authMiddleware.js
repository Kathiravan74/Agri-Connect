// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware to protect routes (ensure user is logged in)
const protect = (req, res, next) => {
    let token;

    // Check if token is present in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (format: "Bearer TOKEN")
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user ID and role from token to the request object
            // This makes user.id and user.role available in subsequent route handlers
            req.user = {
                id: decoded.id,
                role: decoded.role
            };

            next(); // Proceed to the next middleware/route handler
        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Middleware to restrict access based on roles
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Role '${req.user ? req.user.role : 'none'}' is not authorized to access this route` });
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };