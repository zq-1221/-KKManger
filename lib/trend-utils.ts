import { HealthRecord } from '@/types/health';

export function filterByDays(records: HealthRecord[], days: number): HealthRecord[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return records
    .filter((r) => new Date(r.date).getTime() >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export type TrendDirection = 'up' | 'down' | 'stable';

export interface ChartStats {
  avg: number;
  min: number;
  max: number;
  trend: TrendDirection;
}

export function computeStats(
  records: HealthRecord[],
  getValue: (r: HealthRecord) => number | null | undefined,
): ChartStats | null {
  const values: number[] = [];
  for (const r of records) {
    const v = getValue(r);
    if (v != null) values.push(v);
  }
  if (values.length === 0) return null;

  let sum = 0;
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  let trend: TrendDirection = 'stable';
  if (values.length >= 4) {
    const mid = Math.floor(values.length / 2);
    const firstAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondAvg = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
    if (firstAvg !== 0) {
      const pctChange = (secondAvg - firstAvg) / Math.abs(firstAvg);
      if (pctChange > 0.05) trend = 'up';
      else if (pctChange < -0.05) trend = 'down';
    }
  }

  return { avg: Math.round((sum / values.length) * 10) / 10, min, max, trend };
}
