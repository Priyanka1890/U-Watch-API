// app/api/questionnaire-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const {
    userId,
    timestamp,

    energyLevel,
    stressLevel,
    sleepQuality,
    headache,
    musclePain,
    dizziness,
    nausea,
    notes,

    submissionDate,
    isSubmitted,
    completionStatus,
    questionnaireVersion,

    dataType,
    energyDataPoints,
    averageEnergyLevel,
    dataPointCount,
    lastEnergyLevel,
    lastEnergyTimestamp,

    emergencyType,
    locationCategory,
    heartRate,    // emergency heart rate
    isActive,
  } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const rec = await prisma.questionnaire_data.create({
      data: {
        user_id:              userId,
        timestamp:            timestamp ? new Date(timestamp) : undefined,

        energy_level:         energyLevel,
        stress_level:         stressLevel,
        sleep_quality:        sleepQuality,
        headache,
        muscle_pain:          musclePain,
        dizziness,
        nausea,
        notes,

        submission_date:      submissionDate ? new Date(submissionDate) : undefined,
        is_submitted:         isSubmitted,
        completion_status:    completionStatus,
        questionnaire_version: questionnaireVersion,

        data_type:            dataType,
        energy_data_points:   energyDataPoints,
        average_energy_level: averageEnergyLevel,
        data_point_count:     dataPointCount,
        last_energy_level:    lastEnergyLevel,
        last_energy_timestamp: lastEnergyTimestamp ? new Date(lastEnergyTimestamp) : undefined,

        emergency_type:       emergencyType,
        location_category:    locationCategory,
        heart_rate:           heartRate,
        is_active:            isActive,
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
    const rows = await prisma.questionnaire_data.findMany({
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
