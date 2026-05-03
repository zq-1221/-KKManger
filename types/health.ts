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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isWeeklyReport?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
