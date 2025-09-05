// backend/routes/serviceRequestRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    createServiceRequest,
    getServiceRequests,
    getMyServiceRequests,
    markRequestAsCompleted // <-- IMPORTANT: Make sure this is imported
} = require('../controllers/serviceRequestController');

// @route   POST /api/service-requests
// @desc    Create a new service request
// @access  Private (Farmer only)
router.post('/', protect, authorizeRoles('farmer'), createServiceRequest);

// @route   GET /api/service-requests
// @desc    Get all service requests (accessible by service_provider and tractor_owner)
// @access  Private (Service Provider, Tractor Owner)
router.get('/', protect, authorizeRoles('service_provider', 'tractor_owner'), getServiceRequests);

// @route   GET /api/service-requests/my-requests
// @desc    Get service requests posted by the logged-in farmer
// @access  Private (Farmer only)
router.get('/my-requests', protect, authorizeRoles('farmer'), getMyServiceRequests);

// @route   PUT /api/service-requests/:requestId/complete
// @desc    Mark a service request as completed by the assigned service provider
// @access  Private (Service Provider, Tractor Owner)
// NEW ROUTE ADDED HERE:
router.put('/:requestId/complete', protect, authorizeRoles(['service_provider', 'tractor_owner']), markRequestAsCompleted);

module.exports = router;