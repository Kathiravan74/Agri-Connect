// backend/controllers/userController.js
//const { db } = require('../server');
const db = require('../config/db'); // Import the db pool from server.js (or directly from db.js if you prefer consistency)
// NOTE: Based on our previous fix, you might want to use:
// const db = require('../config/db'); // Import the db pool directly

// @desc    Get user profile (of the logged-in user)
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        // req.user.id is populated by the protect middleware
        const [users] = await db.query(
    `SELECT
        u.id, u.username, u.full_name, u.email, u.phone_number, u.role, u.address, u.city, u.state, u.pincode,
        u.aadhar_card_number, u.pan_card_number, u.latitude, u.longitude, u.is_verified,
        f.land_area_acres, f.crop_types_grown,
        tr_o.fleet_size, tr_o.service_area_radius_km AS tractor_service_area_km, tr_o.available_for_ploughing, tr_o.available_for_harvesting,
        dr_o.drone_models, dr_o.payload_capacity_kg, dr_o.service_area_radius_km AS drone_service_area_km, dr_o.certifications_link, dr_o.available_for_spraying
    FROM users u
    LEFT JOIN farmers f ON u.id = f.user_id AND u.role = 'farmer'
    LEFT JOIN tractor_owners tr_o ON u.id = tr_o.user_id AND u.role = 'tractor_owner'  -- Changed 'to' to 'tr_o'
    LEFT JOIN drone_operators dr_o ON u.id = dr_o.user_id AND u.role = 'drone_operator' -- Changed 'do' to 'dr_o'
    WHERE u.id = ?`,
    [req.user.id]
);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];

        // Format the response based on role to avoid sending nulls for irrelevant fields
        const profile = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            role: user.role,
            address: user.address,
            city: user.city,
            state: user.state,
            pincode: user.pincode,
            aadhar_card_number: user.aadhar_card_number,
            pan_card_number: user.pan_card_number,
            latitude: user.latitude,
            longitude: user.longitude,
            is_verified: user.is_verified
        };

        if (user.role === 'farmer') {
            profile.farmer_profile = {
                land_area_acres: user.land_area_acres,
                crop_types_grown: user.crop_types_grown
            };
        } else if (user.role === 'tractor_owner') {
            profile.tractor_owner_profile = {
                fleet_size: user.fleet_size,
                service_area_radius_km: user.tractor_service_area_km,
                available_for_ploughing: user.available_for_ploughing,
                available_for_harvesting: user.available_for_harvesting
            };
        } else if (user.role === 'drone_operator') {
            profile.drone_operator_profile = {
                drone_models: user.drone_models,
                payload_capacity_kg: user.payload_capacity_kg,
                service_area_radius_km: user.drone_service_area_km,
                certifications_link: user.certifications_link,
                available_for_spraying: user.available_for_spraying
            };
        }

        res.status(200).json(profile);

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

// @desc    Update user profile (for the logged-in user)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const userId = req.user.id; // From the protect middleware
    const userRole = req.user.role; // From the protect middleware

    // Destructure common fields
    const {
        full_name, email, phone_number, address, city, state, pincode,
        latitude, longitude, aadhar_card_number, pan_card_number
    } = req.body;

    // Destructure role-specific fields (optional, if you want users to update these via general profile)
    // For simplicity, we might update these via separate endpoints or based on role detection
    const {
        land_area_acres, crop_types_grown, // for farmer
        fleet_size, service_area_radius_km, available_for_ploughing, available_for_harvesting, // for tractor owner
        drone_models, payload_capacity_kg, certifications_link, available_for_spraying // for drone operator
    } = req.body;


    try {
        // Start a transaction for atomicity
        await db.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED;');
         await db.query('START TRANSACTION;');
        // 1. Update common user fields in 'users' table
        const updateFields = [];
        const updateValues = [];

        if (full_name !== undefined) { updateFields.push('full_name = ?'); updateValues.push(full_name); }
        if (email !== undefined) { updateFields.push('email = ?'); updateValues.push(email); }
        if (phone_number !== undefined) { updateFields.push('phone_number = ?'); updateValues.push(phone_number); }
        if (address !== undefined) { updateFields.push('address = ?'); updateValues.push(address); }
        if (city !== undefined) { updateFields.push('city = ?'); updateValues.push(city); }
        if (state !== undefined) { updateFields.push('state = ?'); updateValues.push(state); }
        if (pincode !== undefined) { updateFields.push('pincode = ?'); updateValues.push(pincode); }
        if (latitude !== undefined) { updateFields.push('latitude = ?'); updateValues.push(latitude); }
        if (longitude !== undefined) { updateFields.push('longitude = ?'); updateValues.push(longitude); }
        // For Aadhar/PAN, consider if users should be allowed to change them freely after initial registration
        // For now, let's allow it but you might add more robust logic (e.g., separate verification for updates)
        if (aadhar_card_number !== undefined) { updateFields.push('aadhar_card_number = ?'); updateValues.push(aadhar_card_number); }
        if (pan_card_number !== undefined) { updateFields.push('pan_card_number = ?'); updateValues.push(pan_card_number); }


        if (updateFields.length > 0) {
            const userUpdateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
            await db.query(userUpdateQuery, [...updateValues, userId]);
        }

        // 2. Update role-specific fields in their respective tables
        if (userRole === 'farmer') {
            const farmerUpdateFields = [];
            const farmerUpdateValues = [];
            if (land_area_acres !== undefined) { farmerUpdateFields.push('land_area_acres = ?'); farmerUpdateValues.push(land_area_acres); }
            if (crop_types_grown !== undefined) { farmerUpdateFields.push('crop_types_grown = ?'); farmerUpdateValues.push(crop_types_grown); }

            if (farmerUpdateFields.length > 0) {
                const farmerUpdateQuery = `UPDATE farmers SET ${farmerUpdateFields.join(', ')} WHERE user_id = ?`;
                await db.query(farmerUpdateQuery, [...farmerUpdateValues, userId]);
            }
        } else if (userRole === 'tractor_owner') {
            const tractorOwnerUpdateFields = [];
            const tractorOwnerUpdateValues = [];
            if (fleet_size !== undefined) { tractorOwnerUpdateFields.push('fleet_size = ?'); tractorOwnerUpdateValues.push(fleet_size); }
            if (service_area_radius_km !== undefined) { tractorOwnerUpdateFields.push('service_area_radius_km = ?'); tractorOwnerUpdateValues.push(service_area_radius_km); }
            if (available_for_ploughing !== undefined) { tractorOwnerUpdateFields.push('available_for_ploughing = ?'); tractorOwnerUpdateValues.push(available_for_ploughing); }
            if (available_for_harvesting !== undefined) { tractorOwnerUpdateFields.push('available_for_harvesting = ?'); tractorOwnerUpdateValues.push(available_for_harvesting); }

            if (tractorOwnerUpdateFields.length > 0) {
                const tractorOwnerUpdateQuery = `UPDATE tractor_owners SET ${tractorOwnerUpdateFields.join(', ')} WHERE user_id = ?`;
                await db.query(tractorOwnerUpdateQuery, [...tractorOwnerUpdateValues, userId]);
            }
        }
        // Add similar logic for 'drone_operator' if you have specific profile fields for them

        await db.query('COMMIT;'); // Commit the transaction
        res.status(200).json({ message: 'Profile updated successfully.' });

    } catch (error) {
        await db.query('ROLLBACK;'); // Rollback on error
        console.error('Error updating user profile:', error);

        // Check for duplicate entry errors (e.g., if new email/phone already exists)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A user with the provided email or phone number already exists.' });
        }
        res.status(500).json({ message: 'Server error updating profile.' });
    }
};


module.exports = {
    getUserProfile,
    updateUserProfile,
};