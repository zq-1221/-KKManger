import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import Database from 'better-sqlite3';
import path from 'path';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { records } = await request.json();
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: '没有可迁移的数据' }, { status: 400 });
  }

  const db = new Database(path.join(process.cwd(), 'data', 'kkmanger.db'));
  const stmt = db.prepare(`
    INSERT INTO health_records (id, user_id, date, weight, height, bmi, systolic, diastolic, heart_rate, steps, sleep_hours, water_intake)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  const insert = db.transaction(() => {
    for (const r of records as Record<string, unknown>[]) {
      stmt.run(
        r.id as string, user.userId, r.date as string,
        (r.weight as number | null) ?? null, (r.height as number | null) ?? null, (r.bmi as number | null) ?? null,
        (r.systolic as number | null) ?? null, (r.diastolic as number | null) ?? null, (r.heartRate as number | null) ?? null,
        (r.steps as number | null) ?? null, (r.sleepHours as number | null) ?? null, (r.waterIntake as number | null) ?? null
      );
      count++;
    }
  });

  insert();
  db.close();

  return NextResponse.json({ migrated: count });
}
