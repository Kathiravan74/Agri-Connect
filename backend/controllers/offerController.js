// backend/controllers/offerController.js
const db = require('../config/db'); // Your database connection pool

// Helper function for consistent error handling
// This uses 'next(error)' to pass control to your global error middleware in server.js
const handleControllerError = (error, next, message = 'An internal server error occurred.') => {
    console.error(`Controller Error: ${message}`, error); // Log detailed error for debugging
    const err = new Error(message);
    err.statusCode = error.statusCode || 500; // Use error's status code if available, else 500
    next(err); // Pass to global error handler
};

// @desc    Create a new offer for a service request
// @route   POST /api/offers
// @access  Private (Service Provider, Tractor Owner)
const createOffer = async (req, res, next) => { // Added 'next'
    const provider_id = req.user.id; // Get SP/Tractor Owner ID from authenticated user token
    const user_role = req.user.role; // Get user role for validation

    if (user_role !== 'service_provider' && user_role !== 'tractor_owner') {
        return res.status(403).json({ message: 'Only service providers or tractor owners can create offers.' });
    }

    const { request_id, offered_price, estimated_cost, notes } = req.body;

    // Basic validation
    if (!request_id || offered_price === undefined || estimated_cost === undefined) {
        return res.status(400).json({ message: 'Please provide request_id, offered_price, and estimated_cost.' });
    }

    const parsedOfferedPrice = parseFloat(offered_price);
    const parsedEstimatedCost = parseFloat(estimated_cost);

    if (isNaN(parsedOfferedPrice) || parsedOfferedPrice <= 0 ||
        isNaN(parsedEstimatedCost) || parsedEstimatedCost <= 0) {
        return res.status(400).json({ message: 'Offered price and estimated cost must be positive numbers.' });
    }

    let connection; // Declare connection outside try block
    try {
        connection = await db.getConnection(); // Get a connection from the pool
        await connection.beginTransaction(); // Start a transaction on this specific connection

        // 1. Check if the service request exists, is still pending, AND ensure it's not created by the offerer
        const [requestRows] = await connection.execute( // Use connection.execute for prepared statements
            'SELECT id, farmer_id FROM service_requests WHERE id = ? AND status = ?',
            [request_id, 'pending']
        );
        if (requestRows.length === 0) {
            await connection.rollback(); // Rollback on specific connection
            return res.status(404).json({ message: 'Service request not found or not in a pending state. Cannot make an offer.' });
        }
        const serviceRequest = requestRows[0];
        // Ensure offerer is not the request creator
        if (serviceRequest.farmer_id === provider_id) {
            await connection.rollback();
            return res.status(400).json({ message: 'You cannot make an offer on your own service request.' });
        }

        // 2. Check if the SP has already made a pending offer for this request
        const [existingOffer] = await connection.execute(
            'SELECT id FROM offers WHERE request_id = ? AND provider_id = ? AND status = ?',
            [request_id, provider_id, 'pending']
        );
        if (existingOffer.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'You have already made a pending offer for this service request.' });
        }

        // 3. Insert the new offer into the database
        const [result] = await connection.execute(
            `INSERT INTO offers (request_id, provider_id, offered_price, estimated_cost, notes, status, created_at)
             VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
            [request_id, provider_id, parsedOfferedPrice, parsedEstimatedCost, notes || null]
        );

        await connection.commit(); // Commit on specific connection
        res.status(201).json({
            message: 'Offer created successfully.',
            offer_id: result.insertId,
            status: 'pending'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // Rollback on error
        }
        handleControllerError(error, next, 'Server error creating offer.');
    } finally {
        if (connection) connection.release(); // Always release the connection
    }
};

// @desc    Get all offers based on user role
// @route   GET /api/offers
// @access  Private (Admin, Service Provider, Farmer, Tractor Owner)
const getOffers = async (req, res, next) => { // Added 'next'
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
        SELECT o.*,
               sr.service_type, sr.description AS request_description, sr.farmer_id, sr.status AS request_status,
               u_sp.username AS service_provider_username, u_f.username AS farmer_username
        FROM offers o
        JOIN service_requests sr ON o.request_id = sr.id
        JOIN users u_sp ON o.provider_id = u_sp.id
        JOIN users u_f ON sr.farmer_id = u_f.id
    `;
    let params = [];
    let whereClause = [];

    if (userRole === 'admin') {
        // Admin can see all offers - no additional WHERE clause
    } else if (userRole === 'service_provider' || userRole === 'tractor_owner') {
        // Service Providers/Tractor Owners can only see offers they made
        whereClause.push('o.provider_id = ?');
        params.push(userId);
    } else if (userRole === 'farmer') {
        // Farmers can only see offers made on their service requests
        whereClause.push('sr.farmer_id = ?');
        params.push(userId);
    } else {
        return res.status(403).json({ message: 'Unauthorized to view offers.' });
    }

    if (whereClause.length > 0) {
        query += ` WHERE ` + whereClause.join(' AND ');
    }
    query += ` ORDER BY o.created_at DESC`;

    try {
        const [rows] = await db.query(query, params); // db.query is fine for single reads
        res.status(200).json({
            message: 'Offers fetched successfully.',
            count: rows.length,
            offers: rows
        });

    } catch (error) {
        handleControllerError(error, next, 'Server error fetching offers.');
    }
};

// @desc    Get a single offer by ID
// @route   GET /api/offers/:id
// @access  Private (Admin, related Service Provider, related Farmer, related Tractor Owner)
const getOfferById = async (req, res, next) => { // Added 'next'
    const offerId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const [rows] = await db.query(
            `SELECT o.*,
                    sr.service_type, sr.description AS request_description, sr.farmer_id, sr.status AS request_status,
                    u_sp.username AS service_provider_username, u_f.username AS farmer_username
              FROM offers o
              JOIN service_requests sr ON o.request_id = sr.id
              JOIN users u_sp ON o.provider_id = u_sp.id
              JOIN users u_f ON sr.farmer_id = u_f.id
              WHERE o.id = ?`,
            [offerId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Offer not found.' });
        }

        const offer = rows[0];

        // Authorization check: Admin, or if user is the service provider who made the offer,
        // or if user is the farmer who owns the service request
        if (userRole === 'admin' ||
            (userRole === 'service_provider' && offer.provider_id === userId) ||
            (userRole === 'tractor_owner' && offer.provider_id === userId) ||
            (userRole === 'farmer' && offer.farmer_id === userId)
        ) {
            res.status(200).json({
                message: 'Offer fetched successfully.',
                offer: offer
            });
        } else {
            res.status(403).json({ message: 'Unauthorized to view this offer.' });
        }

    } catch (error) {
        handleControllerError(error, next, 'Server error fetching offer.');
    }
};

// @desc    Accept an offer made on a farmer's request
// @route   PUT /api/offers/:offerId/accept
// @access  Private (Farmer only)
const acceptOffer = async (req, res, next) => { // Added 'next'
    const offerId = req.params.offerId;
    const farmerId = req.user.id; // Get farmer ID from authenticated user token

    // This check is redundant if `authorizeRoles('farmer')` is used in routes,
    // but harmless to keep as a double-check.
    if (!req.user || req.user.role !== 'farmer') {
        return res.status(403).json({ message: 'Access denied. Only farmers can accept offers.' });
    }

    let connection; // Declare connection outside try block
    try {
        connection = await db.getConnection(); // Get a connection
        await connection.beginTransaction(); // Start transaction

        // 1. Get offer details
        const [offerRows] = await connection.execute('SELECT * FROM offers WHERE id = ?', [offerId]);
        if (offerRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Offer not found.' });
        }
        const offer = offerRows[0];

        // 2. Verify the offer's request belongs to the authenticated farmer
        const [requestRows] = await connection.execute('SELECT * FROM service_requests WHERE id = ? AND farmer_id = ?', [offer.request_id, farmerId]);
        if (requestRows.length === 0) {
            await connection.rollback();
            return res.status(403).json({ message: 'You are not authorized to accept offers for this request.' });
        }
        const serviceRequest = requestRows[0]; // The request associated with this offer

        // 3. Ensure the offer is pending before accepting
        if (offer.status !== 'pending') {
            await connection.rollback();
            return res.status(400).json({ message: 'Only pending offers can be accepted.' });
        }
        // Also ensure the request itself is still pending (not already accepted/completed)
        // If request is already accepted, farmer would need to reject the current accepted offer first
        if (serviceRequest.status !== 'pending') {
             await connection.rollback();
             return res.status(400).json({ message: `Service request is no longer pending (current status: ${serviceRequest.status}). Cannot accept offer.` });
        }

        // 4. Update the accepted offer's status to 'accepted'
        await connection.execute('UPDATE offers SET status = ? WHERE id = ?', ['accepted', offerId]);

        // 5. Update the service request's status, accepted_offer_id, and service_provider_id
        await connection.execute(
            'UPDATE service_requests SET status = ?, accepted_offer_id = ?, service_provider_id = ? WHERE id = ?',
            ['in_progress', offerId, offer.provider_id, offer.request_id] // Changed 'accepted' to 'in_progress' for service_request status
        );

        // 6. Reject all other pending offers for the same service request
        await connection.execute(
            'UPDATE offers SET status = ? WHERE request_id = ? AND id != ? AND status = ?',
            ['rejected', offer.request_id, offerId, 'pending']
        );

        await connection.commit(); // Commit the transaction
        res.status(200).json({ message: 'Offer accepted successfully! Request status updated to in progress.' });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // Rollback on error
        }
        handleControllerError(error, next, 'Server error accepting offer.');
    } finally {
        if (connection) connection.release(); // Always release the connection
    }
};

// @desc    Reject an offer made on a farmer's request
// @route   PUT /api/offers/:offerId/reject
// @access  Private (Farmer only)
const rejectOffer = async (req, res, next) => { // Added 'next'
    const offerId = req.params.offerId;
    const farmerId = req.user.id; // Get farmer ID from authenticated user token

    // This check is redundant if `authorizeRoles('farmer')` is used in routes,
    // but harmless to keep as a double-check.
    if (!req.user || req.user.role !== 'farmer') {
        return res.status(403).json({ message: 'Access denied. Only farmers can reject offers.' });
    }

    let connection; // Declare connection outside try block
    try {
        connection = await db.getConnection(); // Get a connection
        await connection.beginTransaction(); // Start transaction

        // 1. Get offer details
        const [offerRows] = await connection.execute('SELECT * FROM offers WHERE id = ?', [offerId]);
        if (offerRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Offer not found.' });
        }
        const offer = offerRows[0];

        // 2. Verify the offer's request belongs to the authenticated farmer
        const [requestRows] = await connection.execute('SELECT * FROM service_requests WHERE id = ? AND farmer_id = ?', [offer.request_id, farmerId]);
        if (requestRows.length === 0) {
            await connection.rollback();
            return res.status(403).json({ message: 'You are not authorized to reject offers for this request.' });
        }
        const serviceRequest = requestRows[0]; // The request associated with this offer

        // 3. Ensure the offer is pending before rejecting
        if (offer.status !== 'pending') {
            await connection.rollback();
            return res.status(400).json({ message: 'Only pending offers can be rejected.' });
        }

        // Check if this is the *currently accepted* offer being rejected.
        // If it is, and the request status is 'in_progress' (or 'accepted'), we need to revert the request status.
        if (serviceRequest.accepted_offer_id === offerId &&
            (serviceRequest.status === 'in_progress' || serviceRequest.status === 'accepted')) { // Added check for 'accepted' status
            // If the currently accepted offer is being rejected, the request status should revert to 'pending'
            await connection.execute(
                'UPDATE offers SET status = ? WHERE id = ?',
                ['rejected', offerId]
            );

            await connection.execute(
                'UPDATE service_requests SET status = ?, accepted_offer_id = NULL, service_provider_id = NULL WHERE id = ?',
                ['pending', offer.request_id]
            );
            await connection.commit();
            return res.status(200).json({ message: 'Offer rejected, and service request reverted to pending.', offerId });

        } else {
            // If it's a pending offer being rejected (and not the currently accepted one)
            await connection.execute('UPDATE offers SET status = ? WHERE id = ?', ['rejected', offerId]);
            // No change to service_requests status here, as other offers might still be pending
            // or the request itself might be pending with other offers available.
            await connection.commit();
            return res.status(200).json({ message: 'Offer rejected successfully!', offerId });
        }

    } catch (error) {
        if (connection) {
            await connection.rollback(); // Rollback on error
        }
        handleControllerError(error, next, 'Server error rejecting offer.');
    } finally {
        if (connection) connection.release(); // Always release the connection
    }
};

// Export all the functions
module.exports = {
    createOffer,
    getOffers,
    getOfferById,
    acceptOffer, // Export the new function
    rejectOffer // Export the new function
};