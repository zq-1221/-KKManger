import { HealthRecord } from '@/types/health';

const STORAGE_KEY = 'health_records';

function getRecords(): HealthRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HealthRecord[]) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: HealthRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function addRecord(record: HealthRecord): void {
  const records = getRecords();
  records.push(record);
  saveRecords(records);
}

function updateRecord(id: string, updates: Partial<HealthRecord>): void {
  const records = getRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return;
  records[index] = { ...records[index], ...updates };
  saveRecords(records);
}

function deleteRecord(id: string): void {
  const records = getRecords().filter((r) => r.id !== id);
  saveRecords(records);
}

function getRecordById(id: string): HealthRecord | undefined {
  return getRecords().find((r) => r.id === id);
}

export { getRecords, saveRecords, addRecord, updateRecord, deleteRecord, getRecordById };
