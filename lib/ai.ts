import { getRecords } from '@/lib/storage';
import { getAdvices } from '@/lib/advice-storage';

export function shouldGenerateAdvice(): { ready: boolean; newDays: number; gap: number } {
  const records = getRecords();
  const advices = getAdvices();
  const lastAdviceEnd = advices.length > 0 ? advices[0].endDate : null;

  const newRecords = lastAdviceEnd
    ? records.filter((r) => r.date > lastAdviceEnd)
    : records;

  const daysSet = new Set(newRecords.map((r) => r.date.split('T')[0]));
  const newDays = daysSet.size;

  return {
    ready: newDays >= 7,
    newDays,
    gap: Math.max(0, 7 - newDays),
  };
}

export function getRecent7DaysRecords() {
  const records = getRecords();
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const daysSet = new Set<string>();
  const result: typeof records = [];
  for (const r of sorted) {
    const day = r.date.split('T')[0];
    if (daysSet.has(day)) continue;
    if (daysSet.size >= 7) break;
    daysSet.add(day);
    result.push(r);
  }
  return result;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
