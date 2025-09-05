// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getUserProfile, updateUserProfile } = require('../controllers/userController'); // Import the new functions

// Example: A route to get user profile (only accessible if logged in)
// We will now use the more detailed getUserProfile from userController
router.get('/profile', protect, getUserProfile); // Uses the new controller function
router.put('/profile', protect, updateUserProfile); // New route to update profile

// Example: A route accessible only by 'admin' role
router.get('/admin-dashboard', protect, authorizeRoles('admin'), (req, res) => {
    res.status(200).json({
        message: `Welcome to the Admin Dashboard, Admin ID: ${req.user.id}`
    });
});

// Example: A route accessible by 'farmer' or 'admin' roles
router.get('/farmer-resources', protect, authorizeRoles('farmer', 'admin'), (req, res) => {
    res.status(200).json({
        message: `Accessing farmer resources, User ID: ${req.user.id}, Role: ${req.user.role}`
    });
});

module.exports = router;