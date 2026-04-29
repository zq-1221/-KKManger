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
