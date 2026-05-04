import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  return new Database(path.join(process.cwd(), 'data', 'kkmanger.db'));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  const existing = db.prepare('SELECT * FROM health_records WHERE id = ? AND user_id = ?').get(id, user.userId) as Record<string, unknown> | undefined;

  if (!existing) {
    db.close();
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }

  db.prepare(`
    UPDATE health_records SET date = ?, weight = ?, height = ?, bmi = ?, systolic = ?, diastolic = ?, heart_rate = ?, steps = ?, sleep_hours = ?, water_intake = ?
    WHERE id = ? AND user_id = ?
  `).run(
    body.date ?? existing.date,
    body.weight !== undefined ? body.weight : existing.weight,
    body.height !== undefined ? body.height : existing.height,
    body.bmi !== undefined ? body.bmi : existing.bmi,
    body.systolic !== undefined ? body.systolic : existing.systolic,
    body.diastolic !== undefined ? body.diastolic : existing.diastolic,
    body.heartRate !== undefined ? body.heartRate : existing.heart_rate,
    body.steps !== undefined ? body.steps : existing.steps,
    body.sleepHours !== undefined ? body.sleepHours : existing.sleep_hours,
    body.waterIntake !== undefined ? body.waterIntake : existing.water_intake,
    id, user.userId
  );

  const updated = db.prepare('SELECT * FROM health_records WHERE id = ?').get(id) as Record<string, unknown>;
  db.close();

  return NextResponse.json({
    id: updated.id,
    date: updated.date,
    weight: updated.weight,
    height: updated.height,
    bmi: updated.bmi,
    systolic: updated.systolic,
    diastolic: updated.diastolic,
    heartRate: updated.heart_rate,
    steps: updated.steps,
    sleepHours: updated.sleep_hours,
    waterIntake: updated.water_intake,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM health_records WHERE id = ? AND user_id = ?').get(id, user.userId) as Record<string, unknown> | undefined;

  if (!existing) {
    db.close();
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }

  db.prepare('DELETE FROM health_records WHERE id = ? AND user_id = ?').run(id, user.userId);
  db.close();

  return NextResponse.json({ success: true });
}
