// Next.js API route for user ID assignment
import { type NextRequest, NextResponse } from "next/server"

// Simple in-memory counter for unique ID generation
// In production, this should be stored in a database
let userIdCounter = 1001; // Starting from 1001 as per the iOS code

/**
 * POST /api/users/assign-id
 * Assigns a unique user ID to a device
 */
export async function POST(request: NextRequest) {
    try {
        // Validate API key
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey || apiKey !== 'uwatch-api-12345-xyz-67890-abc') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse device info from request body
        const deviceInfo = await request.json().catch(() => ({}));
        
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
        return NextResponse.json({
            userId,
            message: 'User ID assigned successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error assigning user ID:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/users/assign-id
 * Returns information about the endpoint (for testing)
 */
export async function GET() {
    return NextResponse.json({
        message: 'User ID assignment endpoint',
        nextId: `U${userIdCounter}`,
        method: 'POST required'
    });
}
