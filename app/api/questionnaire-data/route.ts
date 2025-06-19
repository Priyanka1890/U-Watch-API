import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      timestamp,
      dataType,
      // Legacy fields for backward compatibility
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
      // Energy graph data
      energyDataPoints,
      averageEnergyLevel,
      dataPointCount,
      lastEnergyLevel,
      lastEnergyTimestamp,
      // Emergency data
      emergencyType,
      locationCategory,
      heartRate,
      isActive,
      // Enhanced questionnaire data from UserLogView
      energyLevelsAtTimes,
      energyGraphPoints,
      refreshmentLevel,
      hasExcessiveFatigue,
      crashTimeOfDay,
      selectedBodyAreas,
      selectedSymptoms,
      otherSymptomsDescription,
      crashDuration,
      crashDurationNumber,
      crashTrigger,
      crashTriggerDescription,
      fatigueDate,
      fatigueDescription,
      sleepDuration,
      sleepStages,
      sleepAssessment,
      healthKitAuthorized,
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
      if (dataType === "completeQuestionnaire" || dataType === "dailyQuestionnaire") {
        // Insert comprehensive questionnaire data
        return await sql`
          INSERT INTO questionnaire_data (
            user_id, 
            timestamp, 
            data_type,
            submission_date,
            is_submitted,
            completion_status,
            questionnaire_version,
            
            -- Energy tracking data
            energy_levels_at_times,
            energy_graph_points,
            refreshment_level,
            
            -- Fatigue and crash data
            has_excessive_fatigue,
            crash_time_of_day,
            crash_duration,
            crash_duration_number,
            crash_trigger,
            crash_trigger_description,
            fatigue_date,
            fatigue_description,
            
            -- Symptom data
            selected_body_areas,
            selected_symptoms,
            other_symptoms_description,
            
            -- Sleep data
            sleep_quality,
            sleep_duration,
            sleep_stages,
            sleep_assessment,
            healthkit_authorized,
            
            -- Legacy fields for backward compatibility
            energy_level,
            stress_level,
            headache,
            muscle_pain,
            dizziness,
            nausea,
            notes
          )
          VALUES (
            ${userId}, 
            ${timestamp ? new Date(timestamp) : new Date()}, 
            ${dataType},
            ${submissionDate ? new Date(submissionDate) : new Date()},
            ${isSubmitted !== undefined ? isSubmitted : true},
            ${completionStatus || "completed"},
            ${questionnaireVersion || "6.0"},
            
            -- Energy tracking data
            ${energyLevelsAtTimes ? JSON.stringify(energyLevelsAtTimes) : null},
            ${energyGraphPoints ? JSON.stringify(energyGraphPoints) : null},
            ${refreshmentLevel || null},
            
            -- Fatigue and crash data
            ${hasExcessiveFatigue || false},
            ${crashTimeOfDay || null},
            ${crashDuration || null},
            ${crashDurationNumber || null},
            ${crashTrigger || null},
            ${crashTriggerDescription || null},
            ${fatigueDate ? new Date(fatigueDate) : null},
            ${fatigueDescription || null},
            
            -- Symptom data
            ${selectedBodyAreas ? JSON.stringify(selectedBodyAreas) : null},
            ${selectedSymptoms ? JSON.stringify(selectedSymptoms) : null},
            ${otherSymptomsDescription || null},
            
            -- Sleep data
            ${sleepQuality || null},
            ${sleepDuration || null},
            ${sleepStages ? JSON.stringify(sleepStages) : null},
            ${sleepAssessment || null},
            ${healthKitAuthorized || false},
            
            -- Legacy fields for backward compatibility
            ${energyLevel || null},
            ${stressLevel || null},
            ${headache || false},
            ${musclePain || false},
            ${dizziness || false},
            ${nausea || false},
            ${notes || null}
          )
          RETURNING *
        `
      } else if (dataType === "energyGraph" || dataType === "energyReading") {
        // Insert energy graph data
        return await sql`
          INSERT INTO questionnaire_data (
            user_id, 
            timestamp, 
            data_type, 
            energy_data_points, 
            average_energy_level,
            data_point_count, 
            last_energy_level, 
            last_energy_timestamp, 
            notes,
            completion_status,
            questionnaire_version
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
            ${notes || null},
            ${completionStatus || "completed"},
            ${questionnaireVersion || "6.0"}
          )
          RETURNING *
        `
      } else if (dataType === "emergency") {
        // Insert emergency data
        return await sql`
          INSERT INTO questionnaire_data (
            user_id, 
            timestamp, 
            data_type, 
            emergency_type, 
            location_category,
            heart_rate, 
            is_active, 
            notes,
            completion_status,
            questionnaire_version
          )
          VALUES (
            ${userId}, 
            ${timestamp ? new Date(timestamp) : new Date()}, 
            ${dataType},
            ${emergencyType || null},
            ${locationCategory || null},
            ${heartRate || null},
            ${isActive || false},
            ${notes || null},
            ${completionStatus || "completed"},
            ${questionnaireVersion || "6.0"}
          )
          RETURNING *
        `
      } else {
        // Insert legacy questionnaire data for backward compatibility
        return await sql`
          INSERT INTO questionnaire_data (
            user_id, 
            timestamp, 
            data_type,
            submission_date, 
            is_submitted, 
            energy_level, 
            stress_level, 
            sleep_quality,
            headache, 
            muscle_pain, 
            dizziness, 
            nausea, 
            notes, 
            completion_status, 
            questionnaire_version
          )
          VALUES (
            ${userId}, 
            ${timestamp ? new Date(timestamp) : new Date()}, 
            ${dataType || "dailyQuestionnaire"},
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
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message || "Database operation failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in questionnaire-data API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  const dataType = request.nextUrl.searchParams.get("dataType")
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "100")
  const startDate = request.nextUrl.searchParams.get("startDate")
  const endDate = request.nextUrl.searchParams.get("endDate")

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  const { data, error } = await executeQuery(async () => {
    let query = sql`
      SELECT * FROM questionnaire_data 
      WHERE user_id = ${userId}
    `

    // Add data type filter if specified
    if (dataType) {
      query = sql`
        SELECT * FROM questionnaire_data 
        WHERE user_id = ${userId} AND data_type = ${dataType}
      `
    }

    // Add date range filter if specified
    if (startDate && endDate) {
      if (dataType) {
        query = sql`
          SELECT * FROM questionnaire_data 
          WHERE user_id = ${userId} 
          AND data_type = ${dataType}
          AND timestamp >= ${new Date(startDate)}
          AND timestamp <= ${new Date(endDate)}
        `
      } else {
        query = sql`
          SELECT * FROM questionnaire_data 
          WHERE user_id = ${userId}
          AND timestamp >= ${new Date(startDate)}
          AND timestamp <= ${new Date(endDate)}
        `
      }
    }

    // Add ordering and limit
    const finalQuery = sql`
      ${query}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `

    return finalQuery
  })

  if (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch data" }, { status: 500 })
  }

  return NextResponse.json(data)
}

// Add analytics endpoint for questionnaire insights
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, analysisType } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { data, error } = await executeQuery(async () => {
      switch (analysisType) {
        case "energyTrends":
          return await sql`
            SELECT 
              DATE(timestamp) as date,
              AVG(refreshment_level) as avg_refreshment,
              COUNT(*) as submission_count,
              AVG(sleep_duration) as avg_sleep_duration
            FROM questionnaire_data 
            WHERE user_id = ${userId} 
            AND data_type IN ('completeQuestionnaire', 'dailyQuestionnaire')
            AND timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
          `

        case "symptomAnalysis":
          return await sql`
            SELECT 
              selected_symptoms,
              selected_body_areas,
              crash_duration,
              crash_trigger,
              COUNT(*) as frequency
            FROM questionnaire_data 
            WHERE user_id = ${userId} 
            AND data_type IN ('completeQuestionnaire', 'dailyQuestionnaire')
            AND selected_symptoms IS NOT NULL
            AND timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY selected_symptoms, selected_body_areas, crash_duration, crash_trigger
            ORDER BY frequency DESC
          `

        case "sleepCorrelation":
          return await sql`
            SELECT 
              sleep_quality,
              sleep_duration,
              refreshment_level,
              has_excessive_fatigue,
              COUNT(*) as count
            FROM questionnaire_data 
            WHERE user_id = ${userId} 
            AND data_type IN ('completeQuestionnaire', 'dailyQuestionnaire')
            AND sleep_quality IS NOT NULL
            AND timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY sleep_quality, sleep_duration, refreshment_level, has_excessive_fatigue
            ORDER BY count DESC
          `

        default:
          throw new Error("Invalid analysis type")
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data, analysisType })
  } catch (error) {
    console.error("Error in analytics endpoint:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process analytics request",
      },
      { status: 500 },
    )
  }
}
