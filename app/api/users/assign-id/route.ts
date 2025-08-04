import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('X-API-Key');
    if (apiKey !== 'uwatch-api-12345-xyz-67890-abc') {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await request.json()
    const { deviceModel, systemVersion, requestTimestamp, appVersion } = body

    // Create a device fingerprint to prevent duplicate assignments
    const deviceFingerprint = `${deviceModel}_${systemVersion}_${appVersion}`
    
    const { data, error } = await executeQuery(async () => {
      try {
        // Check if this device already has an assigned ID
        const existingDevice = await sql`
          SELECT user_id FROM device_registrations 
          WHERE device_fingerprint = ${deviceFingerprint}
        `

        if (existingDevice.length > 0) {
          const existingUserId = existingDevice[0].user_id
          console.log(`Device already registered with ID: ${existingUserId}`)
          
          return {
            userId: existingUserId,
            message: 'Existing user ID returned',
            isNewUser: false
          }
        }

        // Get the highest current user ID to generate the next one
        const lastUser = await sql`
          SELECT user_id FROM users 
          WHERE user_id SIMILAR TO 'U[0-9]+' 
          ORDER BY CAST(SUBSTRING(user_id FROM 2) AS INTEGER) DESC 
          LIMIT 1
        `

        let nextIdNumber = 1001 // Start from U1001
        if (lastUser.length > 0) {
          const lastIdNumber = parseInt(lastUser[0].user_id.substring(1))
          nextIdNumber = lastIdNumber + 1
        }

        const newUserId = `U${nextIdNumber}`

        // Create a basic user record first
        await sql`
          INSERT INTO users (user_id, created_at)
          VALUES (${newUserId}, CURRENT_TIMESTAMP)
        `

        // Then insert the device registration
        await sql`
          INSERT INTO device_registrations (device_fingerprint, user_id, device_model, system_version, app_version, created_at)
          VALUES (${deviceFingerprint}, ${newUserId}, ${deviceModel}, ${systemVersion}, ${appVersion}, CURRENT_TIMESTAMP)
        `

        console.log(`Assigned new user ID: ${newUserId} to device: ${deviceModel}`)

        return {
          userId: newUserId,
          message: 'New user ID assigned successfully',
          isNewUser: true,
          assignedAt: new Date().toISOString()
        }
      } catch (dbError) {
        console.error('Database operation error:', dbError)
        throw dbError
      }
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error assigning user ID:', error)
    return NextResponse.json({ error: 'Failed to assign user ID', details: error.message }, { status: 500 })
  }
}

// GET endpoint to check current status (for debugging)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== 'uwatch-api-12345-xyz-67890-abc') {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  const { data, error } = await executeQuery(async () => {
    const totalUsers = await sql`
      SELECT COUNT(*) as count FROM users
    `
    
    const recentUsers = await sql`
      SELECT user_id, created_at FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `

    return {
      totalUsersRegistered: totalUsers[0].count,
      recentUsers: recentUsers
    }
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json(data)
}