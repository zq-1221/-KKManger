import { HealthRecord } from '@/types/health';

export function getRecent7DaysRecords(records: HealthRecord[]) {
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

export function buildHealthContext(records: HealthRecord[]) {
  if (records.length === 0) return { hasData: false };

  const weights = records.filter((r) => r.weight != null).map((r) => r.weight!);
  const bmis = records.filter((r) => r.bmi != null).map((r) => r.bmi!);
  const bpRecords = records
    .filter((r) => r.systolic != null && r.diastolic != null)
    .map((r) => ({ systolic: r.systolic!, diastolic: r.diastolic! }));
  const sleepHours = records.filter((r) => r.sleepHours != null).map((r) => r.sleepHours!);
  const steps = records.filter((r) => r.steps != null).map((r) => r.steps!);
  const waters = records.filter((r) => r.waterIntake != null).map((r) => r.waterIntake!);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    hasData: true,
    latestWeight: weights.length > 0 ? weights[weights.length - 1] : null,
    latestBMI: bmis.length > 0 ? bmis[bmis.length - 1] : null,
    recentBP: bpRecords.slice(-7),
    avgSleep: sleepHours.length > 0 ? Math.round(avg(sleepHours) * 10) / 10 : null,
    avgSteps: steps.length > 0 ? Math.round(avg(steps)) : null,
    avgWater: waters.length > 0 ? Math.round(avg(waters)) : null,
  };
}
