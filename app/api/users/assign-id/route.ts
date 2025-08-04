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
    console.log('Assign ID request:', body)

    // Simply get the count of users and add 1
    const { data: userCount, error: countError } = await executeQuery(async () => {
      return await sql`SELECT COUNT(*) as count FROM users`
    })

    if (countError) {
      console.error('Count error:', countError)
      return NextResponse.json({ error: 'Count error' }, { status: 500 })
    }

    const nextNumber = 1001 + parseInt(userCount[0].count)
    const newUserId = `U${nextNumber}`
    
    console.log('Creating user with ID:', newUserId)

    // Create user record
    const { data: newUser, error: insertError } = await executeQuery(async () => {
      return await sql`
        INSERT INTO users (user_id, created_at)
        VALUES (${newUserId}, CURRENT_TIMESTAMP)
        RETURNING user_id
      `
    })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Insert error' }, { status: 500 })
    }

    return NextResponse.json({
      userId: newUserId,
      message: 'New user ID assigned successfully',
      isNewUser: true,
      assignedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in assign-id:', error)
    return NextResponse.json({ 
      error: 'Server error', 
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