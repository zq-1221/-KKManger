import { ChatSession, ChatMessage } from '@/types/health';

const STORAGE_KEY = 'chat_sessions';
const MAX_SESSIONS = 10;
const MAX_MESSAGES = 50;

export function getSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

export function getCurrentSession(): ChatSession | null {
  const sessions = getSessions();
  return sessions.length > 0 ? sessions[0] : null;
}

export function saveSession(session: ChatSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  const trimmed = sessions.slice(0, MAX_SESSIONS);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function addMessage(sessionId: string, message: ChatMessage): ChatSession | null {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  sessions[idx].messages.push(message);
  if (sessions[idx].messages.length > MAX_MESSAGES) {
    sessions[idx].messages = sessions[idx].messages.slice(-MAX_MESSAGES);
  }
  sessions[idx].updatedAt = new Date().toISOString();
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
  return sessions[idx];
}

export function createSession(title: string): ChatSession {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  return { id, title, messages: [], createdAt: now, updatedAt: now };
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
}
