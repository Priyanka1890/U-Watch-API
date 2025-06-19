import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, queueItems } = body

    if (!userId || !queueItems || !Array.isArray(queueItems) || queueItems.length === 0) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const results = []
    const errors = []

    // Process each queue item
    for (const item of queueItems) {
      const { tableName, data } = item

      if (!tableName || !data) {
        errors.push({ item, error: "Invalid queue item format" })
        continue
      }

      try {
        // Store in offline queue first for backup
        await sql`
          INSERT INTO offline_queue (user_id, table_name, data)
          VALUES (${userId}, ${tableName}, ${JSON.stringify(data)})
        `

        // Process based on table type
        let result
        switch (tableName) {
          case "users":
            result = await processUserData(userId, data)
            break
          case "health_data":
            result = await processHealthData(userId, data)
            break
          case "menstrual_data":
            result = await processMenstrualData(userId, data)
            break
          case "questionnaire_data":
            result = await processQuestionnaireData(userId, data)
            break
          default:
            throw new Error(`Unknown table: ${tableName}`)
        }

        // Mark as processed in offline queue
        await sql`
          UPDATE offline_queue 
          SET processed = true 
          WHERE user_id = ${userId} AND table_name = ${tableName} AND processed = false
          ORDER BY created_at DESC
          LIMIT 1
        `

        results.push({ item, result })
      } catch (error) {
        console.error(`Error processing ${tableName}:`, error)
        errors.push({
          item,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: queueItems.length,
        succeeded: results.length,
        failed: errors.length,
      },
    })
  } catch (error) {
    console.error("Error in sync API:", error)
    return NextResponse.json({ error: "Failed to process sync request" }, { status: 500 })
  }
}

// Helper functions for processing different data types
async function processUserData(userId: string, data: any) {
  return await sql`
    INSERT INTO users (user_id, name, sex, age, height, weight, medications, legacy_uuid)
    VALUES (
      ${userId}, 
      ${data.name || null}, 
      ${data.sex || null}, 
      ${data.age || null}, 
      ${data.height || null}, 
      ${data.weight || null}, 
      ${data.medications || null},
      ${data.legacyUUID || null}
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      name = EXCLUDED.name,
      sex = EXCLUDED.sex,
      age = EXCLUDED.age,
      height = EXCLUDED.height,
      weight = EXCLUDED.weight,
      medications = EXCLUDED.medications,
      legacy_uuid = EXCLUDED.legacy_uuid,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `
}

async function processHealthData(userId: string, data: any) {
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
      ${data.timestamp ? new Date(data.timestamp) : new Date()}, 
      ${data.heartRate || null}, ${data.maxHeartRate || null}, ${data.minHeartRate || null}, 
      ${data.heartRateVariability || null}, ${data.respiratoryRate || null}, 
      ${data.walkingHeartRateAvg || null}, ${data.oxygenSaturation || null},
      ${data.steps || null}, ${data.activityEnergy || null}, ${data.basalEnergy || null}, 
      ${data.distance || null}, ${data.flightsClimbed || null}, ${data.sleepAnalysis || null},
      ${data.exerciseMinutes || null}, ${data.standHours || null}, ${data.workoutCount || null}, 
      ${data.cyclingDistance || null}, ${data.stateOfMind || null}, ${data.timeAsleep || null},
      ${data.remSleep || null}, ${data.coreSleep || null}, ${data.deepSleep || null}, 
      ${data.awakeTime || null}, ${data.activityLevel || null}, ${data.caloriesBurned || null},
      ${data.locationCategory || null}, ${data.environmentType || null}, ${data.motionType || null},
      ${data.weather || null}, ${data.temperature || null}, ${data.humidity || null},
      ${data.bloodPressureSystolic || null}, ${data.bloodPressureDiastolic || null}, 
      ${data.bodyTemperature || null}, ${data.locationName || null}
    )
    RETURNING *
  `
}

async function processMenstrualData(userId: string, data: any) {
  const symptomsArray = Array.isArray(data.symptoms)
    ? data.symptoms
    : typeof data.symptoms === "string"
      ? [data.symptoms]
      : []

  return await sql`
    INSERT INTO menstrual_data (
      user_id, cycle_date, flow_level, symptoms, mood, notes, is_pregnant, pregnancy_duration
    )
    VALUES (
      ${userId}, 
      ${data.cycleDate ? new Date(data.cycleDate) : new Date()}, 
      ${data.flowLevel || 0}, 
      ${symptomsArray}, 
      ${data.mood || null}, 
      ${data.notes || null},
      ${data.isPregnant || false},
      ${data.pregnancyDuration || null}
    )
    RETURNING *
  `
}

async function processQuestionnaireData(userId: string, data: any) {
  // Handle different data types
  if (data.dataType === "energyGraph") {
    return await sql`
      INSERT INTO questionnaire_data (
        user_id, timestamp, data_type, energy_data_points, average_energy_level,
        data_point_count, last_energy_level, last_energy_timestamp, notes
      )
      VALUES (
        ${userId}, 
        ${data.timestamp ? new Date(data.timestamp) : new Date()}, 
        ${data.dataType},
        ${JSON.stringify(data.energyDataPoints || [])},
        ${data.averageEnergyLevel || null},
        ${data.dataPointCount || null},
        ${data.lastEnergyLevel || null},
        ${data.lastEnergyTimestamp ? new Date(data.lastEnergyTimestamp) : null},
        ${data.notes || null}
      )
      RETURNING *
    `
  } else if (data.dataType === "emergency") {
    return await sql`
      INSERT INTO questionnaire_data (
        user_id, timestamp, data_type, emergency_type, location_category,
        heart_rate, is_active, notes
      )
      VALUES (
        ${userId}, 
        ${data.timestamp ? new Date(data.timestamp) : new Date()}, 
        ${data.dataType},
        ${data.emergencyType || null},
        ${data.locationCategory || null},
        ${data.heartRate || null},
        ${data.isActive || false},
        ${data.notes || null}
      )
      RETURNING *
    `
  } else {
    return await sql`
      INSERT INTO questionnaire_data (
        user_id, timestamp, submission_date, is_submitted, energy_level, stress_level, sleep_quality,
        headache, muscle_pain, dizziness, nausea, notes, completion_status, questionnaire_version
      )
      VALUES (
        ${userId}, 
        ${data.timestamp ? new Date(data.timestamp) : new Date()}, 
        ${data.submissionDate ? new Date(data.submissionDate) : null},
        ${data.isSubmitted || false},
        ${data.energyLevel || null}, 
        ${data.stressLevel || null}, 
        ${data.sleepQuality || null},
        ${data.headache || false}, 
        ${data.musclePain || false}, 
        ${data.dizziness || false}, 
        ${data.nausea || false}, 
        ${data.notes || null},
        ${data.completionStatus || "pending"},
        ${data.questionnaireVersion || "1.0"}
      )
      RETURNING *
    `
  }
}