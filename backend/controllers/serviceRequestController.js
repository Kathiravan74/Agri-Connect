// backend/controllers/serviceRequestController.js
const db = require('../config/db'); // Ensure this imports your db connection (assuming 'db' is your pool or connection)
const validateServiceRequest = require('../validation/serviceRequestValidation'); // Ensure this file exists for validation to work

// @desc    Create a new service request
// @route   POST /api/service-requests
// @access  Private (Farmer only)
const createServiceRequest = async (req, res) => {
    // farmer_id and user_role should be set by your authentication middleware
    // Assuming req.user.id and req.user.role are available after authentication
    const farmer_id = req.user.id;
    const user_role = req.user.role;

    // This role check is actually handled by authorizeRoles middleware in routes,
    // but good to have a backup if needed.
    if (user_role !== 'farmer') {
        return res.status(403).json({ message: 'Only farmers can create service requests.' });
    }

    const {
        service_type,
        description,
        location_lat,
        location_lon,
        required_date,
        budget
    } = req.body;

    // Basic validation (using the validation file you included)
    const { errors, isValid } = validateServiceRequest(req.body);

    if (!isValid) {
        // Modified: Send a general message along with detailed errors
        return res.status(400).json({
            message: 'Validation failed. Please check your inputs.',
            errors: errors // The detailed error messages
        });
    }

    try {
        // Convert lat, lon, budget to numbers just before DB insertion, even if validation checks type,
        // as req.body values might still be strings from the client if not explicitly converted there.
        // Frontend script.js will now handle this, but it's good practice for backend safety.
        const parsedLat = parseFloat(location_lat);
        const parsedLon = parseFloat(location_lon);
        const parsedBudget = parseFloat(budget);

        // Ensure date format is correct for MySQL. Frontend is sending YYYY-MM-DD now.
        const formattedRequiredDate = new Date(required_date).toISOString().split('T')[0]; // Converts to YYYY-MM-DD

        const [result] = await db.query(
            `INSERT INTO service_requests (
                farmer_id, service_type, description, location_lat, location_lon, required_date, budget, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`, // Added default 'pending' status
            [
                farmer_id,
                service_type,
                description,
                parsedLat, // Use parsed numbers
                parsedLon, // Use parsed numbers
                formattedRequiredDate, // Use formatted date
                parsedBudget // Use parsed number
            ]
        );

        res.status(201).json({
            message: 'Service request created successfully.',
            request_id: result.insertId,
            status: 'pending' // Return default status
        });

    } catch (error) {
        console.error('Error creating service request:', error);
        res.status(500).json({ message: 'Server error creating service request.' });
    }
};

// @desc    Get all service requests (for service providers/tractor owners to see)
// @route   GET /api/service-requests
// @access  Private (Service Provider, Tractor Owner)
const getServiceRequests = async (req, res) => {
    try {
        // Fetch only pending requests for display on dashboard
        // A service provider might also want to see 'accepted' requests assigned to them
        // For now, let's keep it to 'pending' as per original logic for available requests.
        const [requests] = await db.query('SELECT * FROM service_requests WHERE status = ?', ['pending']);

        res.status(200).json({
            message: 'Service requests fetched successfully.',
            count: requests.length,
            requests: requests
        });

    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ message: 'Server error fetching service requests.' });
    }
};

// @desc    Get service requests posted by the logged-in farmer
// @route   GET /api/service-requests/my-requests
// @access  Private (Farmer only)
const getMyServiceRequests = async (req, res) => {
    // req.user should be populated by your JWT authentication middleware
    if (!req.user || req.user.role !== 'farmer') {
        return res.status(403).json({ message: 'Access denied. Only farmers can view their requests.' });
    }

    try {
        const farmer_id = req.user.id; // Get farmer ID from authenticated user token

        // 1. Fetch all service requests for this farmer
        const [requestsRows] = await db.query(
            'SELECT * FROM service_requests WHERE farmer_id = ? ORDER BY created_at DESC',
            [farmer_id]
        );

        // Map rows to plain objects to ensure mutability and proper JSON serialization
        const requests = requestsRows.map(row => ({ ...row }));

        // 2. For each request, fetch its associated offers
        for (let request of requests) {
            const [offersRows] = await db.query(
                'SELECT * FROM offers WHERE request_id = ? ORDER BY created_at DESC', // Order offers by creation for consistent display
                [request.id]
            );
            // Attach the offers array to the request object
            request.offers = offersRows.map(row => ({ ...row }));
        }

        res.status(200).json({
            message: 'My service requests fetched successfully.',
            count: requests.length,
            requests: requests
        });

    } catch (error) {
        console.error('Error fetching farmer service requests with offers:', error);
        res.status(500).json({ message: 'Server error fetching your requests.', error: error.message });
    }
};

// @desc    Mark a service request as completed by the assigned service provider
// @route   PUT /api/service-requests/:requestId/complete
// @access  Private (Service Provider/Tractor Owner only)
const markRequestAsCompleted = async (req, res) => {
    const requestId = req.params.requestId;

    // Ensure user is authenticated and has the correct role
    if (!req.user || (req.user.role !== 'service_provider' && req.user.role !== 'tractor_owner')) {
        return res.status(403).json({ message: 'Access denied. Only service providers or tractor owners can mark requests as completed.' });
    }

    try {
        // 1. Get the service request details
        const [requestRows] = await db.query('SELECT * FROM service_requests WHERE id = ?', [requestId]);
        if (requestRows.length === 0) {
            return res.status(404).json({ message: 'Service request not found.' });
        }
        const serviceRequest = requestRows[0];

        // 2. Ensure the request is in an 'accepted' status
        if (serviceRequest.status !== 'accepted') {
            return res.status(400).json({ message: 'Cannot mark a request as completed unless its status is "accepted".' });
        }

        // 3. Verify that the current user is the service provider assigned to this accepted request
        // This relies on the 'service_provider_id' column we added to 'service_requests'
        if (serviceRequest.service_provider_id !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to mark this request as completed. You are not the assigned service provider.' });
        }

        // Start a transaction for atomicity to ensure all related updates either pass or fail together
        await db.query('START TRANSACTION');

        // 4. Update the service request status to 'completed' and set completed_at timestamp
        await db.query('UPDATE service_requests SET status = ?, completed_at = NOW() WHERE id = ?', ['completed', requestId]);

        // Optional: Update the status of the specific accepted offer to 'completed' as well
        // This is good practice for consistency
        if (serviceRequest.accepted_offer_id) {
            await db.query('UPDATE offers SET status = ? WHERE id = ?', ['completed', serviceRequest.accepted_offer_id]);
        }

        await db.query('COMMIT'); // Commit the transaction if all queries are successful

        res.status(200).json({ message: 'Service request marked as completed successfully!', requestId });

    } catch (error) {
        await db.query('ROLLBACK'); // Rollback the transaction if any query fails
        console.error('Error marking request as completed:', error);
        res.status(500).json({ message: 'Server error marking request as completed.', error: error.message });
    }
};


// Export all the functions
module.exports = {
    createServiceRequest,
    getServiceRequests,
    getMyServiceRequests,
    markRequestAsCompleted // Export the new function
};
