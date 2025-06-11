// app/api/health-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    userId,
    timestamp,

    heartRate,
    maxHeartRate,
    minHeartRate,
    heartRateVariability,
    respiratoryRate,
    walkingHeartRateAvg,

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
    locationCategory,
    locationName,
    weather,
    temperature,
    humidity,

    activityEnergy,
    basalEnergy,
    flightsClimbed,
    sleepAnalysis,
    exerciseMinutes,
    standHours,
    workoutCount,
    cyclingDistance,
    stateOfMind,
    timeAsleep,
    remSleep,
    coreSleep,
    deepSleep,
    awakeTime,
  } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const rec = await prisma.health_data.create({
      data: {
        user_id: userId,
        timestamp: timestamp ? new Date(timestamp) : undefined,

        heart_rate:            heartRate,
        max_heart_rate:        maxHeartRate,
        min_heart_rate:        minHeartRate,
        heart_rate_variability: heartRateVariability,
        respiratory_rate:      respiratoryRate,
        walking_heart_rate_avg: walkingHeartRateAvg,

        oxygen_saturation: oxygenSaturation,
        activity_level:    activityLevel,
        steps,
        distance,
        calories_burned:   caloriesBurned,

        blood_pressure_systolic:  bloodPressureSystolic,
        blood_pressure_diastolic: bloodPressureDiastolic,

        body_temperature: bodyTemperature,
        environment_type: environmentType,
        motion_type:      motionType,
        location_category: locationCategory,
        location_name:    locationName,
        weather,
        temperature,
        humidity,

        activity_energy: activityEnergy,
        basal_energy:    basalEnergy,
        flights_climbed: flightsClimbed,
        sleep_analysis:  sleepAnalysis,
        exercise_minutes: exerciseMinutes,
        stand_hours:     standHours,
        workout_count:   workoutCount,
        cycling_distance: cyclingDistance,
        state_of_mind:   stateOfMind,
        time_asleep:     timeAsleep,
        rem_sleep:       remSleep,
        core_sleep:      coreSleep,
        deep_sleep:      deepSleep,
        awake_time:      awakeTime,
      },
    });
    return NextResponse.json({ success: true, data: rec });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const limit  = Number(req.nextUrl.searchParams.get('limit') || '100');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const rows = await prisma.health_data.findMany({
      where: { user_id: userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
