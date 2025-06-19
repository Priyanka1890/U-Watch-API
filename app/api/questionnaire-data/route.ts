import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📥 Received request body keys:", Object.keys(body))
    console.log("📊 Request body size:", JSON.stringify(body).length, "bytes")

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

    console.log("🔍 Processing data for user:", userId, "dataType:", dataType)

    // Enhanced validation for comprehensive questionnaire data
    if (dataType === "completeQuestionnaire") {
      console.log("✅ Processing complete questionnaire with data:", {
        userId,
        energyLevelsCount: energyLevelsAtTimes ? Object.keys(energyLevelsAtTimes).length : 0,
        graphPointsCount: energyGraphPoints ? energyGraphPoints.length : 0,
        hasExcessiveFatigue,
        crashDuration,
        sleepQuality,
      })

      // Validate required fields for complete questionnaire
      if (!energyLevelsAtTimes && !energyGraphPoints) {
        console.log("❌ Validation failed: Missing energy data")
        return NextResponse.json({ error: "Energy data is required for complete questionnaire" }, { status: 400 })
      }
    }

    // Validate required fields
    if (!userId) {
      console.log("❌ Validation failed: Missing userId")
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🔄 Starting database transaction...")

    const { data, error } = await executeQuery(async () => {
      // Check if user exists
      console.log("👤 Checking if user exists:", userId)
      const existingUser = await sql`
        SELECT user_id FROM users WHERE user_id = ${userId}
      `

      if (existingUser.length === 0) {
        console.log("❌ User not found:", userId)
        throw new Error(`User not found: ${userId}`)
      }

      console.log("✅ User found, proceeding with data insertion")

      // Handle different data types
      if (dataType === "completeQuestionnaire" || dataType === "dailyQuestionnaire") {
        console.log("💾 Inserting comprehensive questionnaire data...")

        // Safely process JSON fields
        const energyLevelsJson = energyLevelsAtTimes ? JSON.stringify(energyLevelsAtTimes) : null
        const energyGraphJson = energyGraphPoints ? JSON.stringify(energyGraphPoints) : null
        const selectedBodyAreasJson = selectedBodyAreas ? JSON.stringify(selectedBodyAreas) : null
        const selectedSymptomsJson = selectedSymptoms ? JSON.stringify(selectedSymptoms) : null
        const sleepStagesJson = sleepStages ? JSON.stringify(sleepStages) : null

        console.log("📝 Prepared JSON fields:", {
          energyLevelsJson: energyLevelsJson ? "✅" : "❌",
          energyGraphJson: energyGraphJson ? "✅" : "❌",
          selectedBodyAreasJson: selectedBodyAreasJson ? "✅" : "❌",
          selectedSymptomsJson: selectedSymptomsJson ? "✅" : "❌",
          sleepStagesJson: sleepStagesJson ? "✅" : "❌",
        })

        // Insert comprehensive questionnaire data
        const result = await sql`
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
            ${energyLevelsJson}::jsonb,
            ${energyGraphJson}::jsonb,
            ${refreshmentLevel !== undefined && refreshmentLevel !== null ? Number(refreshmentLevel) : null},
            
            -- Fatigue and crash data
            ${hasExcessiveFatigue !== undefined ? Boolean(hasExcessiveFatigue) : false},
            ${crashTimeOfDay || null},
            ${crashDuration || null},
            ${crashDurationNumber !== undefined && crashDurationNumber !== null ? Number(crashDurationNumber) : null},
            ${crashTrigger || null},
            ${crashTriggerDescription || null},
            ${fatigueDate ? new Date(fatigueDate) : null},
            ${fatigueDescription || null},
            
            -- Symptom data
            ${selectedBodyAreasJson}::jsonb,
            ${selectedSymptomsJson}::jsonb,
            ${otherSymptomsDescription || null},
            
            -- Sleep data
            ${sleepQuality || null},
            ${sleepDuration !== undefined && sleepDuration !== null ? Number(sleepDuration) : null},
            ${sleepStagesJson}::jsonb,
            ${sleepAssessment || null},
            ${healthKitAuthorized !== undefined ? Boolean(healthKitAuthorized) : false},
            
            -- Legacy fields for backward compatibility
            ${energyLevel !== undefined && energyLevel !== null ? Number(energyLevel) : null},
            ${stressLevel !== undefined && stressLevel !== null ? Number(stressLevel) : null},
            ${headache !== undefined ? Boolean(headache) : false},
            ${musclePain !== undefined ? Boolean(musclePain) : false},
            ${dizziness !== undefined ? Boolean(dizziness) : false},
            ${nausea !== undefined ? Boolean(nausea) : false},
            ${notes || null}
          )
          RETURNING id, user_id, timestamp, data_type, completion_status
        `

        console.log("✅ Successfully inserted questionnaire data, ID:", result[0]?.id)
        return result
      } else if (dataType === "energyGraph" || dataType === "energyReading") {
        console.log("💾 Inserting energy graph data...")
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
            ${energyDataPoints ? JSON.stringify(energyDataPoints) : "[]"}::jsonb,
            ${averageEnergyLevel !== undefined && averageEnergyLevel !== null ? Number(averageEnergyLevel) : null},
            ${dataPointCount !== undefined && dataPointCount !== null ? Number(dataPointCount) : null},
            ${lastEnergyLevel !== undefined && lastEnergyLevel !== null ? Number(lastEnergyLevel) : null},
            ${lastEnergyTimestamp ? new Date(lastEnergyTimestamp) : null},
            ${notes || null},
            ${completionStatus || "completed"},
            ${questionnaireVersion || "6.0"}
          )
          RETURNING id, user_id, timestamp, data_type
        `
      } else if (dataType === "emergency") {
        console.log("💾 Inserting emergency data...")
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
            ${heartRate !== undefined && heartRate !== null ? Number(heartRate) : null},
            ${isActive !== undefined ? Boolean(isActive) : false},
            ${notes || null},
            ${completionStatus || "completed"},
            ${questionnaireVersion || "6.0"}
          )
          RETURNING id, user_id, timestamp, data_type
        `
      } else {
        console.log("💾 Inserting legacy questionnaire data...")
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
            ${isSubmitted !== undefined ? isSubmitted : false},
            ${energyLevel !== undefined ? energyLevel : null}, 
            ${stressLevel !== undefined ? stressLevel : null}, 
            ${sleepQuality || null},
            ${headache !== undefined ? headache : null}, 
            ${musclePain !== undefined ? musclePain : null}, 
            ${dizziness !== undefined ? dizziness : null}, 
            ${nausea !== undefined ? nausea : null}, 
            ${notes || null},
            ${completionStatus || "pending"},
            ${questionnaireVersion || "1.0"}
          )
          RETURNING *
        `
      }
    })

    if (error) {
      console.error("💥 Database error details:", {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      })
      return NextResponse.json(
        {
          error: "Database operation failed",
          details: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("🎉 Successfully processed questionnaire data")
    return NextResponse.json({
      success: true,
      data: {
        id: data[0]?.id,
        userId: data[0]?.user_id,
        timestamp: data[0]?.timestamp,
        dataType: data[0]?.data_type,
      },
    })
  } catch (error) {
    console.error("💥 Critical error in questionnaire-data API:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    let body
    try {
      body = await request.json()
      console.error("📋 Request body that caused error:", {
        userId: body.userId,
        dataType: body.dataType,
        timestamp: body.timestamp,
        bodySize: JSON.stringify(body).length,
      })
    } catch (parseError) {
      console.error("💥 Additional error parsing request body:", parseError)
      body = {}
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process request",
        details: "Check server logs for more information",
        timestamp: new Date().toISOString(),
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
