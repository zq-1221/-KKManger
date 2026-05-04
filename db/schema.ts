import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  created_at: text('created_at').notNull(),
});

export const healthRecords = sqliteTable('health_records', {
  id: text('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  date: text('date').notNull(),
  weight: real('weight'),
  height: real('height'),
  bmi: real('bmi'),
  systolic: integer('systolic'),
  diastolic: integer('diastolic'),
  heart_rate: integer('heart_rate'),
  steps: integer('steps'),
  sleep_hours: real('sleep_hours'),
  water_intake: integer('water_intake'),
});

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  session_id: text('session_id').notNull().references(() => chatSessions.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  is_weekly_report: integer('is_weekly_report').default(0),
  created_at: text('created_at').notNull(),
});

export const aiAdvices = sqliteTable('ai_advices', {
  id: text('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  summary_json: text('summary_json').notNull(),
  diet: text('diet').notNull(),
  exercise: text('exercise').notNull(),
  sleep: text('sleep').notNull(),
  raw_response: text('raw_response').notNull(),
  created_at: text('created_at').notNull(),
});
