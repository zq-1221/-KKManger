import { AIAdvice } from '@/types/health';

const MAX_ADVICES = 5;

function storageKey(userId: number) {
  return `ai_advices_${userId}`;
}

export function getAdvices(userId: number): AIAdvice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as AIAdvice[]) : [];
  } catch {
    return [];
  }
}

export function getLatestAdvice(userId: number): AIAdvice | null {
  const advices = getAdvices(userId);
  return advices.length > 0 ? advices[0] : null;
}

export function getAdviceById(userId: number, id: string): AIAdvice | undefined {
  return getAdvices(userId).find((a) => a.id === id);
}

export function saveAdvice(userId: number, advice: AIAdvice): void {
  const advices = getAdvices(userId);
  advices.push(advice);
  advices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const trimmed = advices.slice(0, MAX_ADVICES);
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
  }
}

export function deleteAdvice(userId: number, id: string): void {
  const advices = getAdvices(userId).filter((a) => a.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey(userId), JSON.stringify(advices));
  }
}

export function clearAdvices(userId: number): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(storageKey(userId));
  }
}
