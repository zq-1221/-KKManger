import type { HealthRecord } from '@/types/health';

export async function fetchRecords(): Promise<HealthRecord[]> {
  const res = await fetch('/api/records');
  if (!res.ok) throw new Error('Failed to fetch records');
  return res.json();
}

export async function createRecord(record: HealthRecord): Promise<HealthRecord> {
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Failed to create record');
  return res.json();
}

export async function updateRecord(id: string, record: Partial<HealthRecord>): Promise<HealthRecord> {
  const res = await fetch(`/api/records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Failed to update record');
  return res.json();
}

export async function deleteRecordById(id: string): Promise<void> {
  const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete record');
}
