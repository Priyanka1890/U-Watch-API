// Express.js route for user ID assignment
// This file should be part of a Node.js/Express API server

const express = require('express');
const router = express.Router();

// Simple in-memory counter for unique ID generation
// In production, this should be stored in a database
let userIdCounter = 1001; // Starting from 1001 as per the iOS code

/**
 * POST /api/users/assign-id
 * Assigns a unique user ID to a device
 */
router.post('/', async (req, res) => {
    try {
        // Validate API key
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== 'uwatch-api-12345-xyz-67890-abc') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Parse device info from request body
        const deviceInfo = req.body || {};
        
        // Generate a unique user ID
        const userId = `U${userIdCounter}`;
        userIdCounter++; // Increment for next user

        // Log the device info for debugging
        console.log(`🆔 Assigning user ID ${userId} to device:`, {
            model: deviceInfo.deviceModel || 'Unknown',
            version: deviceInfo.systemVersion || 'Unknown',
            timestamp: deviceInfo.requestTimestamp || new Date().toISOString(),
            appVersion: deviceInfo.appVersion || 'Unknown'
        });

        // Here you would typically save to database
        // For now, we'll just return the assigned ID
        
        // Return the assigned user ID
        res.status(200).json({
            userId,
            message: 'User ID assigned successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error assigning user ID:', error);
        res.status(500).json({ error: 'Insert error' });
    }
});

/**
 * GET /api/users/assign-id
 * Returns information about the endpoint (for testing)
 */
router.get('/', (req, res) => {
    res.status(200).json({
        message: 'User ID assignment endpoint',
        nextId: `U${userIdCounter}`,
        method: 'POST required'
    });
});

module.exports = router;
