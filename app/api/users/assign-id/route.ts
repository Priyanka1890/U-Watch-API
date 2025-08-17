// Next.js API route for user ID assignment
import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'

// File to persist the counter across server restarts
const counterFilePath = path.join(process.cwd(), 'user_id_counter.txt');

// In-memory cache to avoid file I/O on every request
let cachedCounter: number | null = null;

// Function to get the current counter value
function getCurrentCounter(): number {
    if (cachedCounter !== null) {
        return cachedCounter;
    }
    
    try {
        if (fs.existsSync(counterFilePath)) {
            const counterStr = fs.readFileSync(counterFilePath, 'utf8').trim();
            const counter = parseInt(counterStr) || 1001;
            cachedCounter = counter;
            return counter;
        }
    } catch (error) {
        console.error('Error reading counter file:', error);
    }
    
    cachedCounter = 1001; // Default starting value
    return cachedCounter;
}

// Function to save the counter value
function saveCounter(counter: number): void {
    try {
        fs.writeFileSync(counterFilePath, counter.toString());
        cachedCounter = counter;
    } catch (error) {
        console.error('Error saving counter file:', error);
    }
}

// Function to get next unique user ID with file persistence
function getNextUserId(): string {
    const currentCounter = getCurrentCounter();
    const nextCounter = currentCounter + 1;
    saveCounter(nextCounter);
    return `U${currentCounter}`;
}

// Store device assignments to prevent duplicates (in production, use database)
const deviceAssignments = new Map<string, string>();

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
        
        // Create a unique device fingerprint to prevent duplicate assignments
        const deviceFingerprint = `${deviceInfo.deviceModel || 'Unknown'}-${deviceInfo.systemVersion || 'Unknown'}-${deviceInfo.requestTimestamp || 'NoTimestamp'}`;
        
        // Check if we've already assigned an ID to this device
        let userId = deviceAssignments.get(deviceFingerprint);
        
        if (!userId) {
            // Generate a new unique user ID using the persistent counter
            userId = getNextUserId();
            deviceAssignments.set(deviceFingerprint, userId);
        }

        // Log the device info for debugging
        console.log(`🆔 ${deviceAssignments.has(deviceFingerprint) ? 'Reusing' : 'Assigning new'} user ID ${userId} to device:`, {
            userId,
            model: deviceInfo.deviceModel || 'Unknown',
            version: deviceInfo.systemVersion || 'Unknown',
            timestamp: deviceInfo.requestTimestamp || new Date().toISOString(),
            appVersion: deviceInfo.appVersion || 'Unknown',
            deviceFingerprint,
            isReused: deviceAssignments.has(deviceFingerprint)
        });

        // Here you would typically save to database with device fingerprint
        // to prevent duplicate assignments to the same device
        
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
    const currentCounter = getCurrentCounter();
    return NextResponse.json({
        message: 'User ID assignment endpoint',
        nextId: `U${currentCounter}`,
        method: 'POST required',
        totalAssignments: deviceAssignments.size
    });
}
