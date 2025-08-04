import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('X-API-Key');
    if (apiKey !== 'uwatch-api-12345-xyz-67890-abc') {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json()
    console.log('Received request body:', body)

    // Get the highest current user ID
    const { data: lastUser, error: queryError } = await executeQuery(async () => {
      return await sql`
        SELECT user_id FROM users 
        WHERE user_id ~ '^U[0-9]+$'
        ORDER BY CAST(SUBSTRING(user_id, 2) AS INTEGER) DESC 
        LIMIT 1
      `
    })

    if (queryError) {
      console.error('Error querying last user:', queryError)
      return NextResponse.json({ error: 'Query error' }, { status: 500 })
    }

    // Calculate next ID
    let nextIdNumber = 1001
    if (lastUser && lastUser.length > 0) {
      const lastIdNumber = parseInt(lastUser[0].user_id.substring(1))
      nextIdNumber = lastIdNumber + 1
    }

    const newUserId = `U${nextIdNumber}`
    console.log('Assigning new user ID:', newUserId)

    // Create user record
    const { data: newUser, error: insertError } = await executeQuery(async () => {
      return await sql`
        INSERT INTO users (user_id, created_at)
        VALUES (${newUserId}, CURRENT_TIMESTAMP)
        RETURNING user_id
      `
    })

    if (insertError) {
      console.error('Error creating user:', insertError)
      return NextResponse.json({ error: 'Insert error' }, { status: 500 })
    }

    console.log('Successfully created user:', newUserId)

    return NextResponse.json({
      userId: newUserId,
      message: 'New user ID assigned successfully',
      isNewUser: true,
      assignedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in assign-id endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to assign user ID', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== 'uwatch-api-12345-xyz-67890-abc') {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  const { data, error } = await executeQuery(async () => {
    const totalUsers = await sql`SELECT COUNT(*) as count FROM users`
    const recentUsers = await sql`
      SELECT user_id, created_at FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `
    return { totalUsersRegistered: totalUsers[0].count, recentUsers }
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json(data)
}