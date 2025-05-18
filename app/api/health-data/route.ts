import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      timestamp,
      heartRate,
      oxygenSaturation,
      activityLevel,
      steps,
      distance,
      caloriesBurned,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      bodyTemperature,
      environmentType,
      motionType,
      locationName,
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

      // Insert health data
      return await sql`
        INSERT INTO health_data (
          user_id, timestamp, heart_rate, oxygen_saturation, activity_level,
          steps, distance, calories_burned, blood_pressure_systolic,
          blood_pressure_diastolic, body_temperature, environment_type, motion_type, location_name
        )
        VALUES (
          ${userId}, 
          ${timestamp ? new Date(timestamp) : new Date()}, 
          ${heartRate || null}, 
          ${oxygenSaturation || null}, 
          ${activityLevel || null},
          ${steps || null}, 
          ${distance || null}, 
          ${caloriesBurned || null}, 
          ${bloodPressureSystolic || null},
          ${bloodPressureDiastolic || null}, 
          ${bodyTemperature || null}, 
          ${environmentType || null}, 
          ${motionType || null}, 
          ${locationName || null}
        )
        RETURNING *
      `
    })

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in health-data API:", error)
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
      SELECT * FROM health_data 
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
