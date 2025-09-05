// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // Required for cross-origin requests from frontend
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for auth middleware

// Load environment variables from .env file
dotenv.config();

// --- Database Connection Setup ---
// Assuming db.js exports a connection pool (e.g., mysql2/promise pool)
// If db.js connects and exports 'connection', make sure it's a pool for efficiency.
const db = require('./config/db'); // This 'db' should be your database connection pool

// --- Route Imports ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const serviceRequestRoutes = require('./routes/serviceRequestRoutes');
const offerRoutes = require('./routes/offerRoutes'); // This is the file we will create/modify significantly
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// --- Middleware Setup ---
app.use(express.json()); // Built-in Express middleware to parse JSON request bodies
app.use(cors()); // Enable CORS for all origins (for development). In production, specify origins.


// --- JWT Authentication Middleware (Centralized) ---
// This function verifies the token and attaches user info (id, role) to `req.user`
// We define it here so it can be passed to all route modules that need it.
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Get the token part after "Bearer "

    if (token == null) {
        // If no token is provided, return 401 Unauthorized
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // If token is invalid or expired, return 403 Forbidden
            console.error('JWT Verification Error:', err.message); // Log actual JWT error
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user; // Attach decoded user payload to the request (e.g., { id: 123, role: 'farmer', username: 'user1' })
        next(); // Proceed to the next middleware/route handler
    });
}


// --- Pass `db` and `authenticateToken` to Route Modules ---
// This is a common pattern to inject dependencies into route files.
// Each route module will receive `db` and `authenticateToken` as arguments
// when initialized. This ensures they don't have to re-import/re-define.
app.use((req, res, next) => {
    // Attach db and authenticateToken to the request object or app locals
    // so routes can access them.
    req.db = db; // Make db pool available on every request
    req.authenticateToken = authenticateToken; // Make the middleware available
    next();
});

// --- Basic Route for testing server status ---
app.get('/', (req, res) => {
    res.send('AgriConnect Backend API is running...');
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/offers', offerRoutes); // Only one instance is needed
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);


// --- Global Error Handling Middleware (VERY IMPORTANT for JSON errors) ---
// This middleware catches any errors that occur in your routes or other middleware
// and ensures a consistent JSON error response.
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err.stack); // Log the full error stack for debugging

    // If headers have already been sent, delegate to default Express error handler
    // (This usually means an error occurred during a response stream)
    if (res.headersSent) {
        return next(err);
    }

    // Determine the status code: Use the error's status code if available, otherwise 500
    const statusCode = err.statusCode || 500;
    // Determine the message: Use the error's message, otherwise a generic one
    const message = err.message || 'An unexpected internal server error occurred.';

    // Send a JSON response for all errors
    res.status(statusCode).json({
        message: message,
        // Optionally, include stack trace in development for debugging
        // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Define the port to run the server on
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Optional: Test DB connection on startup
    db.getConnection()
        .then(connection => {
            console.log('Database connection successful!');
            connection.release();
        })
        .catch(err => {
            console.error('Database connection failed:', err.message);
            // Optionally exit the process if DB connection is critical
            // process.exit(1);
        });
});