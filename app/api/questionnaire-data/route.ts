import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      timestamp,
      submissionDate,
      isSubmitted,
      energyLevel,
      stressLevel,
      sleepQuality,
      headache,
      musclePain,
      dizziness,
      nausea,
      notes,
      completionStatus,
      questionnaireVersion,
      // Handle energy graph data
      dataType,
      energyDataPoints,
      averageEnergyLevel,
      dataPointCount,
      lastEnergyLevel,
      lastEnergyTimestamp,
      // Handle emergency data
      emergencyType,
      locationCategory,
      heartRate,
      isActive
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

      // Handle different data types
      if (dataType === "energyGraph") {
        // Insert energy graph data
        return await sql`
          INSERT INTO questionnaire_data (
            user_id, timestamp, data_type, energy_data_points, average_energy_level,
            data_point_count, last_energy_level, last_energy_timestamp, notes
          )
          VALUES (
            ${userId}, 
            ${timestamp ? new Date(timestamp) : new Date()}, 
            ${dataType},
            ${JSON.stringify(energyDataPoints || [])},
            ${averageEnergyLevel || null},
            ${dataPointCount || null},
            ${lastEnergyLevel || null},
            ${lastEnergyTimestamp ? new Date(lastEnergyTimestamp) : null},
            ${notes || null}
          )
          RETURNING *
        `
      } else if (dataType === "emergency") {
        // Insert emergency data
        return await sql`
          INSERT INTO questionnaire_data (
            user_id, timestamp, data_type, emergency_type, location_category,
            heart_rate, is_active, notes
          )
          VALUES (
            ${userId}, 
            ${timestamp ? new Date(timestamp) : new Date()}, 
            ${dataType},
            ${emergencyType || null},
            ${locationCategory || null},
            ${heartRate || null},
            ${isActive || false},
            ${notes || null}
          )
          RETURNING *
        `
      } else {
        // Insert regular questionnaire data
        return await sql`
          INSERT INTO questionnaire_data (
            user_id, timestamp, submission_date, is_submitted, energy_level, stress_level, sleep_quality,
            headache, muscle_pain, dizziness, nausea, notes, completion_status, questionnaire_version
          )
          VALUES (
            ${userId}, 
            ${timestamp ? new Date(timestamp) : new Date()}, 
            ${submissionDate ? new Date(submissionDate) : null},
            ${isSubmitted || false},
            ${energyLevel || null}, 
            ${stressLevel || null}, 
            ${sleepQuality || null},
            ${headache || false}, 
            ${musclePain || false}, 
            ${dizziness || false}, 
            ${nausea || false}, 
            ${notes || null},
            ${completionStatus || "pending"},
            ${questionnaireVersion || "1.0"}
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
    console.error("Error in questionnaire-data API:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  const dataType = request.nextUrl.searchParams.get("dataType")
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "100")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  const { data, error } = await executeQuery(async () => {
    if (dataType) {
      return await sql`
        SELECT * FROM questionnaire_data 
        WHERE user_id = ${userId} AND data_type = ${dataType}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `
    } else {
      return await sql`
        SELECT * FROM questionnaire_data 
        WHERE user_id = ${userId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `
    }
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json(data)
}