export interface HealthRecord {
  id: string;
  date: string;
  weight?: number;
  height?: number;
  bmi?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  steps?: number;
  sleepHours?: number;
  waterIntake?: number;
}

export interface AIAdvice {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  summary: {
    avgWeight: number | null;
    avgSteps: number;
    avgSleep: number;
    avgWater: number;
    weightTrend: 'up' | 'down' | 'stable';
  };
  diet: string;
  exercise: string;
  sleep: string;
  rawResponse: string;
}
