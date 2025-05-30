import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      timestamp,
      // Heart & Fitness metrics
      heartRate,
      maxHeartRate,
      minHeartRate,
      heartRateVariability,
      respiratoryRate,
      walkingHeartRateAvg,
      oxygenSaturation,
      
      // Activity & Energy metrics
      steps,
      activityEnergy,
      basalEnergy,
      distance,
      flightsClimbed,
      sleepAnalysis,
      
      // Additional metrics
      exerciseMinutes,
      standHours,
      workoutCount,
      cyclingDistance,
      stateOfMind,
      timeAsleep,
      
      // Detailed sleep metrics
      remSleep,
      coreSleep,
      deepSleep,
      awakeTime,
      
      // Legacy fields for backward compatibility
      activityLevel,
      caloriesBurned,
      
      // Location & Environment metrics (now using categories)
      locationCategory,
      environmentType,
      motionType,
      
      // Weather metrics
      weather,
      temperature,
      humidity,
      
      // Legacy fields
      bloodPressureSystolic,
      bloodPressureDiastolic,
      bodyTemperature,
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

      // Insert health data with all new fields
      return await sql`
        INSERT INTO health_data (
          user_id, timestamp, 
          heart_rate, max_heart_rate, min_heart_rate, heart_rate_variability,
          respiratory_rate, walking_heart_rate_avg, oxygen_saturation,
          steps, activity_energy, basal_energy, distance, flights_climbed, sleep_analysis,
          exercise_minutes, stand_hours, workout_count, cycling_distance, state_of_mind, time_asleep,
          rem_sleep, core_sleep, deep_sleep, awake_time,
          activity_level, calories_burned,
          location_category, environment_type, motion_type,
          weather, temperature, humidity,
          blood_pressure_systolic, blood_pressure_diastolic, body_temperature, location_name
        )
        VALUES (
          ${userId}, 
          ${timestamp ? new Date(timestamp) : new Date()}, 
          ${heartRate || null}, ${maxHeartRate || null}, ${minHeartRate || null}, ${heartRateVariability || null},
          ${respiratoryRate || null}, ${walkingHeartRateAvg || null}, ${oxygenSaturation || null},
          ${steps || null}, ${activityEnergy || null}, ${basalEnergy || null}, ${distance || null}, 
          ${flightsClimbed || null}, ${sleepAnalysis || null},
          ${exerciseMinutes || null}, ${standHours || null}, ${workoutCount || null}, 
          ${cyclingDistance || null}, ${stateOfMind || null}, ${timeAsleep || null},
          ${remSleep || null}, ${coreSleep || null}, ${deepSleep || null}, ${awakeTime || null},
          ${activityLevel || null}, ${caloriesBurned || null},
          ${locationCategory || null}, ${environmentType || null}, ${motionType || null},
          ${weather || null}, ${temperature || null}, ${humidity || null},
          ${bloodPressureSystolic || null}, ${bloodPressureDiastolic || null}, 
          ${bodyTemperature || null}, ${locationName || null}
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