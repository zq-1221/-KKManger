'use client';

import { useRouter } from 'next/navigation';
import { HealthRecord } from '@/types/health';
import { createRecord } from '@/lib/api-client';
import RecordForm from '@/components/RecordForm';

export default function RecordPage() {
  const router = useRouter();

  async function handleSubmit(record: HealthRecord) {
    await createRecord(record);
    router.push('/');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">录入健康数据</h2>
        <p className="text-sm text-gray-400 mt-1">记录今天的身体状况</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6">
        <RecordForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
