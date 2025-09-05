-- sql/schema.sql

-- Drop database if it exists to ensure a clean slate for development
DROP DATABASE IF EXISTS agriconnect_db;

-- Create the database
CREATE DATABASE agriconnect_db;

-- Use the newly created database
USE agriconnect_db;

-- Table for Users (Farmers, Tractor Owners, Drone Operators, Admins)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL, -- ADDED: This was missing
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('farmer', 'tractor_owner', 'drone_operator', 'admin') NOT NULL,
    address TEXT,
    city VARCHAR(100), -- ADDED: This was missing
    state VARCHAR(100), -- ADDED: This was missing
    pincode VARCHAR(10), -- ADDED: This was missing
    aadhar_card_number VARCHAR(12) UNIQUE, -- ADDED: This was missing
    pan_card_number VARCHAR(10) UNIQUE, -- ADDED: This was missing
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(10)
);

-- Farmer specific profile data
CREATE TABLE farmers (
    user_id INT PRIMARY KEY,
    land_area_acres DECIMAL(10, 2),
    crop_types_grown TEXT, -- e.g., "Wheat, Rice, Corn"
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tractor Owner specific profile data
CREATE TABLE tractor_owners (
    user_id INT PRIMARY KEY,
    fleet_size INT DEFAULT 1,
    service_area_radius_km DECIMAL(10, 2),
    available_for_ploughing BOOLEAN DEFAULT TRUE,
    available_for_harvesting BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Drone Operator specific profile data
CREATE TABLE drone_operators (
    user_id INT PRIMARY KEY,
    drone_models TEXT, -- e.g., "DJI Agras MG-1, DJI Mavic 2"
    payload_capacity_kg DECIMAL(10, 2),
    service_area_radius_km DECIMAL(10, 2),
    certifications_link VARCHAR(255), -- URL to certifications
    available_for_spraying BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Table for Service Requests made by Farmers
CREATE TABLE service_requests (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `farmer_id` INT NOT NULL,
    `service_type` ENUM('ploughing', 'harvesting', 'spraying', 'other') NOT NULL, -- Updated ENUM for consistency with controller
    `description` TEXT, -- THIS MUST BE HERE
    `location_lat` DECIMAL(10, 8), -- THIS MUST BE HERE
    `location_lon` DECIMAL(11, 8), -- THIS MUST BE HERE
    `required_date` DATE NOT NULL, -- THIS MUST BE HERE
    `budget` DECIMAL(10, 2), -- THIS MUST BE HERE
    `status` ENUM('pending', 'accepted', 'completed', 'cancelled') DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`farmer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Table for Offers made by Service Providers on Requests
CREATE TABLE offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    provider_id INT NOT NULL, -- Can be tractor_owner or drone_operator
    offered_price DECIMAL(10, 2) NOT NULL,
    estimated_completion_time_days INT, -- Optional
    notes TEXT,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for Confirmed Bookings
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    offer_id INT NOT NULL,
    farmer_id INT NOT NULL,
    provider_id INT NOT NULL,
    booking_date DATETIME NOT NULL, -- The date/time the service is actually scheduled for
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    total_price DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(offer_id) -- An offer can only lead to one booking
);

-- Table for Reviews/Ratings
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNIQUE NOT NULL, -- Each booking can only have one review
    reviewer_id INT NOT NULL, -- The user writing the review
    reviewee_id INT NOT NULL, -- The user being reviewed
    rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for Payments (for tracking transactions)
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNIQUE NOT NULL, -- Each booking has one payment record (or primary payment)
    payer_id INT NOT NULL, -- User who made the payment (usually farmer)
    payee_id INT NOT NULL, -- User who received the payment (usually provider)
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(255), -- e.g., "Stripe", "Cash", "Bank Transfer"
    transaction_id VARCHAR(255) UNIQUE, -- Gateway's transaction ID
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('request_created', 'offer_received', 'offer_accepted', 'offer_rejected', 'booking_scheduled', 'booking_completed', 'payment_received', 'payment_sent', 'review_received', 'system_message', 'profile_update') NOT NULL,
    message TEXT NOT NULL,
    related_entity_type ENUM('request', 'offer', 'booking', 'review', 'payment', 'user'), -- What type of entity this notification is about
    related_entity_id INT, -- ID of the related entity
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for performance (optional, but good practice for large datasets)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_requests_farmer_id ON service_requests(farmer_id);
CREATE INDEX idx_offers_request_id ON offers(request_id);
CREATE INDEX idx_offers_provider_id ON offers(provider_id);
CREATE INDEX idx_bookings_farmer_id ON bookings(farmer_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);