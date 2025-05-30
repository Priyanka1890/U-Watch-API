import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      name, 
      sex, 
      age, 
      height, 
      weight, 
      medications,
      legacyUUID // Support for legacy UUID mapping
    } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { data, error } = await executeQuery(async () => {
      // Check if user exists
      const existingUser = await sql`
        SELECT user_id FROM users WHERE user_id = ${userId}
      `

      if (existingUser.length > 0) {
        // Update existing user
        return await sql`
          UPDATE users 
          SET 
            name = ${name || null}, 
            sex = ${sex || null}, 
            age = ${age || null}, 
            height = ${height || null}, 
            weight = ${weight || null}, 
            medications = ${medications || null},
            legacy_uuid = ${legacyUUID || null},
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId}
          RETURNING *
        `
      } else {
        // Insert new user
        return await sql`
          INSERT INTO users (user_id, name, sex, age, height, weight, medications, legacy_uuid)
          VALUES (
            ${userId}, 
            ${name || null}, 
            ${sex || null}, 
            ${age || null}, 
            ${height || null}, 
            ${weight || null}, 
            ${medications || null},
            ${legacyUUID || null}
          )
          RETURNING *
        `
      }
    })

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in users API:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  const legacyUUID = request.nextUrl.searchParams.get("legacyUUID")

  if (!userId && !legacyUUID) {
    return NextResponse.json({ error: "User ID or Legacy UUID is required" }, { status: 400 })
  }

  const { data, error } = await executeQuery(async () => {
    if (userId) {
      return await sql`
        SELECT * FROM users WHERE user_id = ${userId}
      `
    } else {
      return await sql`
        SELECT * FROM users WHERE legacy_uuid = ${legacyUUID}
      `
    }
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(data[0])
}