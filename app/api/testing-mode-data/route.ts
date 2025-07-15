import { NextRequest, NextResponse } from "next/server";
import { sql, executeQuery } from "@/lib/db";

// Handle POST request to save testing mode data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 Received request body keys:", Object.keys(body));
    
    const {
      userId,
      simulatedDay,
      testingCrashHistory,
    } = body;

    console.log("🔍 Processing data for user:", userId, "simulatedDay:", simulatedDay);

    // Validate required fields
    if (!userId || simulatedDay === undefined || testingCrashHistory === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert the testing mode data into the database
    const { data, error } = await executeQuery(async () => {
      console.log("💾 Inserting testing mode data...");
      await sql`
        INSERT INTO testing_mode_data (user_id, simulated_day, crash_history)
        VALUES (${userId}, ${simulatedDay}, ${JSON.stringify(testingCrashHistory)})
      `;
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message || "Failed to save data" }, { status: 500 });
    }

    console.log("✅ Testing mode data saved successfully to the database");
    return NextResponse.json({ success: true, message: "Data saved" });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

// Handle GET request to retrieve testing mode data
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const { data, error } = await executeQuery(async () => {
      console.log("🔍 Fetching testing mode data for user:", userId);
      const result = await sql`
        SELECT * FROM testing_mode_data WHERE user_id = ${userId} ORDER BY timestamp DESC LIMIT 1
      `;
      return result;
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message || "Failed to fetch data" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No testing mode data found" }, { status: 404 });
    }

    console.log("✅ Retrieved testing mode data");
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
