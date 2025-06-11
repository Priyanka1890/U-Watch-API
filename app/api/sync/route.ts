// app/api/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { userId, tableName, data } = await req.json();

  if (!userId || !tableName || !data) {
    return NextResponse.json(
      { error: 'userId, tableName, and data are all required' },
      { status: 400 }
    );
  }

  try {
    const rec = await prisma.offline_queue.create({
      data: {
        user_id:    userId,
        table_name: tableName,
        data,
      },
    });
    return NextResponse.json({ success: true, data: rec });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
