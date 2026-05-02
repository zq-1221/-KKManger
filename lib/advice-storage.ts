import { AIAdvice } from '@/types/health';

const ADVICE_KEY = 'ai_advices';
const MAX_ADVICES = 5;

export function getAdvices(): AIAdvice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADVICE_KEY);
    return raw ? (JSON.parse(raw) as AIAdvice[]) : [];
  } catch {
    return [];
  }
}

export function getLatestAdvice(): AIAdvice | null {
  const advices = getAdvices();
  return advices.length > 0 ? advices[0] : null;
}

export function getAdviceById(id: string): AIAdvice | undefined {
  return getAdvices().find((a) => a.id === id);
}

export function saveAdvice(advice: AIAdvice): void {
  const advices = getAdvices();
  advices.push(advice);
  advices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const trimmed = advices.slice(0, MAX_ADVICES);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADVICE_KEY, JSON.stringify(trimmed));
  }
}

export function deleteAdvice(id: string): void {
  const advices = getAdvices().filter((a) => a.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADVICE_KEY, JSON.stringify(advices));
  }
}
