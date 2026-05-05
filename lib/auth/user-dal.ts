import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  return new Database(path.join(process.cwd(), 'data', 'kkmanger.db'));
}

export function getUserById(userId: number) {
  const db = getDb();
  const row = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId) as { id: number; email: string; name: string } | undefined;
  db.close();
  return row ?? null;
}

export function getUserByEmail(email: string) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as { id: number; email: string; password_hash: string; name: string; created_at: string } | undefined;
  db.close();
  return row ?? null;
}

export function createUser(email: string, passwordHash: string, name: string) {
  const db = getDb();
  const info = db.prepare('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)').run(email, passwordHash, name, new Date().toISOString());
  db.close();
  if (info.changes === 0) throw new Error('创建用户失败');
  return { id: info.lastInsertRowid as number, email, name };
}

export function updateUserName(userId: number, name: string) {
  const db = getDb();
  const info = db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
  db.close();
  return info.changes > 0;
}

export function getUserPasswordHash(userId: number): string | null {
  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined;
  db.close();
  return row?.password_hash ?? null;
}

export function updateUserPassword(userId: number, passwordHash: string) {
  const db = getDb();
  const info = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
  db.close();
  return info.changes > 0;
}
