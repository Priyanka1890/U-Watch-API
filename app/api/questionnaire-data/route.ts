import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      timestamp,
      energyLevel,
      stressLevel,
      sleepQuality,
      headache,
      musclePain,
      dizziness,
      nausea,
      notes,
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

      if (existingUser.length === 0) {
        throw new Error("User not found")
      }

      // Insert questionnaire data
      return await sql`
        INSERT INTO questionnaire_data (
          user_id, timestamp, energy_level, stress_level, sleep_quality,
          headache, muscle_pain, dizziness, nausea, notes
        )
        VALUES (
          ${userId}, 
          ${timestamp ? new Date(timestamp) : new Date()}, 
          ${energyLevel || null}, 
          ${stressLevel || null}, 
          ${sleepQuality || null},
          ${headache || false}, 
          ${musclePain || false}, 
          ${dizziness || false}, 
          ${nausea || false}, 
          ${notes || null}
        )
        RETURNING *
      `
    })

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in questionnaire-data API:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "100")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  const { data, error } = await executeQuery(async () => {
    return await sql`
      SELECT * FROM questionnaire_data 
      WHERE user_id = ${userId}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json(data)
}
