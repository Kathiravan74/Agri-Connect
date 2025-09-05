// backend/routes/offerRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    createOffer,
    getOffers,
    getOfferById,
    // REMOVED: updateOfferStatus
    acceptOffer, // <-- IMPORTANT: NEW IMPORT
    rejectOffer  // <-- IMPORTANT: NEW IMPORT
} = require('../controllers/offerController'); // We have now ensured these controller functions exist

// @route   POST /api/offers
// @desc    Create a new offer for a service request
// @access  Private (Service Provider, Tractor Owner)
router.post('/', protect, authorizeRoles('service_provider', 'tractor_owner'), createOffer);

// @route   GET /api/offers
// @desc    Get all offers (for admins, or service providers to see their own, or farmers to see for their requests)
// @access  Private (Admin, Service Provider, Farmer, Tractor Owner) - logic inside controller
router.get('/', protect, authorizeRoles('admin', 'service_provider', 'farmer', 'tractor_owner'), getOffers);

// @route   GET /api/offers/:id
// @desc    Get a specific offer by ID
// @access  Private (Admin, related Service Provider, related Farmer)
router.get('/:id', protect, authorizeRoles('admin', 'service_provider', 'farmer', 'tractor_owner'), getOfferById);

// @route   PUT /api/offers/:offerId/accept
// @desc    Farmer accepts an offer
// @access  Private (Farmer only)
// NEW ROUTE ADDED HERE:
router.put('/:offerId/accept', protect, authorizeRoles('farmer'), acceptOffer);

// @route   PUT /api/offers/:offerId/reject
// @desc    Farmer rejects an offer
// @access  Private (Farmer only)
// NEW ROUTE ADDED HERE:
router.put('/:offerId/reject', protect, authorizeRoles('farmer'), rejectOffer);

// REMOVED: The generic updateOfferStatus route
// router.put('/:id/status', protect, authorizeRoles('admin', 'service_provider', 'farmer', 'tractor_owner'), updateOfferStatus);


module.exports = router;