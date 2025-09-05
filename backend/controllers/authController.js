// backend/controllers/authController.js
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For creating JWTs
const db = require('../config/db'); // Import the db pool directly

// User Registration
const registerUser = async (req, res) => {
    const { username, password, email, phone_number, role, full_name, address, city, state, pincode, aadhar_card_number, pan_card_number } = req.body;

    // Basic validation (you'll want more robust validation later)
    if (!username || !password || !email || !phone_number || !role) {
        return res.status(400).json({ message: 'Please enter all required fields: username, password, email, phone_number, role' });
    }

    try {
        // 1. Check if user already exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE username = ? OR email = ? OR phone_number = ?', [username, email, phone_number]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'User with this username, email, or phone number already exists.' });
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insert user into the 'users' table
        const [userResult] = await db.query(
            `INSERT INTO users (username, password_hash, email, phone_number, role, full_name, address, city, state, pincode, aadhar_card_number, pan_card_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, phone_number, role, full_name, address, city, state, pincode, aadhar_card_number, pan_card_number]
        );

        const userId = userResult.insertId;

        // 4. Create additional role-specific entries
        if (role === 'farmer') {
            await db.query('INSERT INTO farmers (user_id) VALUES (?)', [userId]);
        } else if (role === 'tractor_owner') {
            await db.query('INSERT INTO tractor_owners (user_id) VALUES (?)', [userId]);
        } else if (role === 'service_provider') { // Added this based on dashboard logic
            await db.query('INSERT INTO service_providers (user_id) VALUES (?)', [userId]);
        }
        // Add more role-specific inserts here if you have other roles like 'service_provider' later

        // 5. Generate JWT Token (payload only needs id and role for auth middleware)
        const token = jwt.sign({ id: userId, role: role }, process.env.JWT_SECRET, {
            expiresIn: '1h', // Token expires in 1 hour
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user_id: userId, // Added directly
            username,      // Added directly
            email,         // Added directly
            role,          // <--- IMPORTANT: Role is now at the top level
            full_name,     // Added directly
            phone_number   // Added directly
        });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

// User Login
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please enter username and password.' });
    }

    try {
        // 1. Check if user exists by username
        // Make sure to select all necessary user fields, including 'role'
        const [users] = await db.query('SELECT id, username, password_hash, email, role, full_name, phone_number FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const user = users[0];

        // 2. Compare provided password with hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // 3. Generate JWT Token (payload only needs id and role for auth middleware)
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        // 4. Send successful response with token, username, AND ROLE AT TOP LEVEL
        res.status(200).json({
            message: 'Logged in successfully',
            token,
            username: user.username, // <--- Username at top level
            role: user.role // <--- CRUCIAL: Role is now at the top level
            // You can also add other user details at the top level if needed by the frontend directly,
            // e.g., email: user.email, full_name: user.full_name
        });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

module.exports = {
    registerUser,
    loginUser,
};