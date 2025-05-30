import { type NextRequest, NextResponse } from "next/server"
import { sql, executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      cycleDate, 
      flowLevel, 
      symptoms, 
      mood, 
      notes,
      isPregnant,
      pregnancyDuration
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

      // Convert symptoms to array if it's not already
      const symptomsArray = Array.isArray(symptoms) ? symptoms : typeof symptoms === "string" ? [symptoms] : []

      // Insert menstrual data with pregnancy fields
      return await sql`
        INSERT INTO menstrual_data (
          user_id, cycle_date, flow_level, symptoms, mood, notes, is_pregnant, pregnancy_duration
        )
        VALUES (
          ${userId}, 
          ${cycleDate ? new Date(cycleDate) : new Date()}, 
          ${flowLevel || 0}, 
          ${symptomsArray}, 
          ${mood || null}, 
          ${notes || null},
          ${isPregnant || false},
          ${pregnancyDuration || null}
        )
        RETURNING *
      `
    })

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in menstrual-data API:", error)
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
      SELECT * FROM menstrual_data 
      WHERE user_id = ${userId}
      ORDER BY cycle_date DESC
      LIMIT ${limit}
    `
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json(data)
}