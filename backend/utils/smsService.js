// backend/utils/smsService.js

// This is a placeholder for actual SMS sending logic.
// In a real application, you would integrate with services like Twilio, MSG91, etc.
// For now, it will just log the message to the console and insert into notifications table.

// IMPORTANT: This line assumes that 'db' is exported as a property of module.exports in server.js
// If server.js only exports 'app' as default, this needs to be: const db = require('../server').db;
// For our current server.js, 'const { db } = require('../server');' is correct.
const { db } = require('../server'); // Import the db pool from server.js

const sendSms = async (phoneNumber, message, userId, notificationType, relatedEntityType = null, relatedEntityId = null) => {
    console.log(`--- SMS SIMULATION ---`);
    console.log(`To: ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log(`User ID: ${userId}`);
    console.log(`Notification Type: ${notificationType}`);
    console.log(`----------------------`);

    try {
        // Also insert a record into the notifications table for in-app display
        const [result] = await db.query(
            `INSERT INTO notifications (user_id, type, message, related_entity_type, related_entity_id)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, notificationType, message, relatedEntityType, relatedEntityId]
        );
        console.log(`Notification saved to DB (ID: ${result.insertId})`);
    } catch (error) {
        console.error('Error saving SMS notification to DB:', error);
    }

    // In a real scenario, you'd integrate with a service here:
    /*
    Example with Twilio:
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });
        console.log(`SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
        console.error(`Error sending SMS to ${phoneNumber}:`, error);
    }
    */

    /*
    Example with MSG91 (using a simple HTTP request, you'd use a proper SDK if available):
    const axios = require('axios'); // You would need to `npm install axios`
    try {
        await axios.get(`https://api.msg91.com/api/sendhttp.php?authkey=${process.env.SMS_AUTH_KEY}&mobiles=${phoneNumber}&message=${encodeURIComponent(message)}&sender=${process.env.SMS_SENDER_ID}&route=4`);
        console.log(`SMS sent via MSG91 to ${phoneNumber}`);
    } catch (error) {
        console.error(`Error sending SMS via MSG91 to ${phoneNumber}:`, error);
    }
    */
};

module.exports = { sendSms };