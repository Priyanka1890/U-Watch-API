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
    INSERT INTO users (user_id, name, sex, age, height, weight, medications)
    VALUES (
      ${userId}, 
      ${data.name || null}, 
      ${data.sex || null}, 
      ${data.age || null}, 
      ${data.height || null}, 
      ${data.weight || null}, 
      ${data.medications || null}
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      name = EXCLUDED.name,
      sex = EXCLUDED.sex,
      age = EXCLUDED.age,
      height = EXCLUDED.height,
      weight = EXCLUDED.weight,
      medications = EXCLUDED.medications,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `
}

async function processHealthData(userId: string, data: any) {
  return await sql`
    INSERT INTO health_data (
      user_id, timestamp, heart_rate, oxygen_saturation, activity_level,
      steps, distance, calories_burned, blood_pressure_systolic,
      blood_pressure_diastolic, body_temperature, environment_type, motion_type, location_name
    )
    VALUES (
      ${userId}, 
      ${data.timestamp ? new Date(data.timestamp) : new Date()}, 
      ${data.heartRate || null}, 
      ${data.oxygenSaturation || null}, 
      ${data.activityLevel || null},
      ${data.steps || null}, 
      ${data.distance || null}, 
      ${data.caloriesBurned || null}, 
      ${data.bloodPressureSystolic || null},
      ${data.bloodPressureDiastolic || null}, 
      ${data.bodyTemperature || null}, 
      ${data.environmentType || null}, 
      ${data.motionType || null}, 
      ${data.locationName || null}
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
      user_id, cycle_date, flow_level, symptoms, mood, notes
    )
    VALUES (
      ${userId}, 
      ${data.cycleDate ? new Date(data.cycleDate) : new Date()}, 
      ${data.flowLevel || 0}, 
      ${symptomsArray}, 
      ${data.mood || null}, 
      ${data.notes || null}
    )
    RETURNING *
  `
}

async function processQuestionnaireData(userId: string, data: any) {
  return await sql`
    INSERT INTO questionnaire_data (
      user_id, timestamp, energy_level, stress_level, sleep_quality,
      headache, muscle_pain, dizziness, nausea, notes
    )
    VALUES (
      ${userId}, 
      ${data.timestamp ? new Date(data.timestamp) : new Date()}, 
      ${data.energyLevel || null}, 
      ${data.stressLevel || null}, 
      ${data.sleepQuality || null},
      ${data.headache || false}, 
      ${data.musclePain || false}, 
      ${data.dizziness || false}, 
      ${data.nausea || false}, 
      ${data.notes || null}
    )
    RETURNING *
  `
}
