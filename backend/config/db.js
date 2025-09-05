// backend/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env

// Database connection pool configuration
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true, // Whether to wait for a connection to be available in the pool
    connectionLimit: 10,      // Maximum number of connections in the pool
    queueLimit: 0             // Maximum number of requests the pool will queue before returning an error
});

// Test the database connection
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database!');
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error('Error connecting to the database:', err.message);
        // It's critical to exit if the DB connection fails at startup
        process.exit(1);
    });

module.exports = pool;