// app/api/menstrual-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const {
    userId,
    cycleDate,
    flowLevel,
    symptoms,
    mood,
    notes,
    isPregnant,
    pregnancyDuration,
  } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const rec = await prisma.menstrual_data.create({
      data: {
        user_id:            userId,
        cycle_date:         cycleDate ? new Date(cycleDate) : undefined,
        flow_level:         flowLevel,
        symptoms:           Array.isArray(symptoms) ? symptoms : [],
        mood,
        notes,
        is_pregnant:        isPregnant,
        pregnancy_duration: pregnancyDuration,
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
    const rows = await prisma.menstrual_data.findMany({
      where: { user_id: userId },
      orderBy: { cycle_date: 'desc' },
      take: limit,
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
