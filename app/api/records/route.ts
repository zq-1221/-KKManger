import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  return new Database(path.join(process.cwd(), 'data', 'kkmanger.db'));
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const db = getDb();
  const rows = db.prepare('SELECT * FROM health_records WHERE user_id = ? ORDER BY date DESC').all(user.userId) as Record<string, unknown>[];
  db.close();

  const records = rows.map(mapRow);
  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const body = await request.json();
  const db = getDb();

  const info = db.prepare(`
    INSERT INTO health_records (id, user_id, date, weight, height, bmi, systolic, diastolic, heart_rate, steps, sleep_hours, water_intake)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.id, user.userId, body.date,
    body.weight ?? null, body.height ?? null, body.bmi ?? null,
    body.systolic ?? null, body.diastolic ?? null, body.heartRate ?? null,
    body.steps ?? null, body.sleepHours ?? null, body.waterIntake ?? null
  );

  const row = db.prepare('SELECT * FROM health_records WHERE id = ?').get(body.id) as Record<string, unknown>;
  db.close();
  return NextResponse.json(mapRow(row), { status: 201 });
}

function mapRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    date: r.date,
    weight: r.weight,
    height: r.height,
    bmi: r.bmi,
    systolic: r.systolic,
    diastolic: r.diastolic,
    heartRate: r.heart_rate,
    steps: r.steps,
    sleepHours: r.sleep_hours,
    waterIntake: r.water_intake,
  };
}
