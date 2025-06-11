// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const {
    userId,
    legacyUuid,
    name,
    sex,
    age,
    height,
    weight,
    medications,
  } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const user = await prisma.users.upsert({
      where: { user_id: userId },
      create: {
        user_id:     userId,
        legacy_uuid: legacyUuid,
        name,
        sex,
        age,
        height,
        weight,
        medications,
      },
      update: {
        legacy_uuid: legacyUuid,
        name,
        sex,
        age,
        height,
        weight,
        medications,
      },
    });
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
    });
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
