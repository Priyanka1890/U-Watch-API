// Next.js API route for user ID assignment
import { type NextRequest, NextResponse } from "next/server"

// Simple counter that increments for each request
// In production, this should be stored in a database
// For now, we'll use timestamp-based IDs to ensure uniqueness across deployments
let requestCounter = 0;

// Function to generate a unique user ID
function generateUniqueUserId(): string {
    // Use current timestamp + request counter for uniqueness
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    requestCounter++;
    
    // Create a unique ID based on timestamp to avoid collisions
    const uniqueId = 1001 + (timestamp % 100000) + requestCounter + random;
    return `U${uniqueId}`;
}

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
        
        // Always generate a new unique user ID for each request
        const userId = generateUniqueUserId();

        // Log the device info for debugging
        console.log(`🆔 Assigning NEW user ID ${userId} to device:`, {
            userId,
            model: deviceInfo.deviceModel || 'Unknown',
            version: deviceInfo.systemVersion || 'Unknown',
            timestamp: deviceInfo.requestTimestamp || new Date().toISOString(),
            appVersion: deviceInfo.appVersion || 'Unknown',
            vendorId: deviceInfo.vendorId || 'Unknown',
            uniqueDeviceId: deviceInfo.uniqueDeviceId || 'Unknown',
            requestId: deviceInfo.requestId || 'Unknown'
        });

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
        nextId: 'Will generate unique ID based on timestamp',
        method: 'POST required',
        requestCounter: requestCounter
    });
}
