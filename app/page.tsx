'use client';

import { useState, useEffect } from 'react';
import { HealthRecord } from '@/types/health';
import { fetchRecords } from '@/lib/api-client';
import { getBMICategory } from '@/lib/bmi';
import DataCard from '@/components/DataCard';
import ChartCard from '@/components/charts/ChartCard';
import StepsChart from '@/components/charts/StepsChart';
import SleepChart from '@/components/charts/SleepChart';
import BloodPressureChart from '@/components/charts/BloodPressureChart';
import WeightChart from '@/components/charts/WeightChart';
import HeartRateChart from '@/components/charts/HeartRateChart';

export default function DashboardPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    fetchRecords().then(async (serverRecords) => {
      // Auto-migrate localStorage data on first login
      if (serverRecords.length === 0 && !migrated) {
        try {
          const localRaw = localStorage.getItem('health_records');
          if (localRaw) {
            const localRecords = JSON.parse(localRaw);
            if (Array.isArray(localRecords) && localRecords.length > 0) {
              await fetch('/api/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records: localRecords }),
              });
              localStorage.removeItem('health_records');
              setMigrated(true);
              const migratedRecords = await fetchRecords();
              setRecords(migratedRecords);
              return;
            }
          }
        } catch { /* migration failed, continue with empty records */ }
      }
      setRecords(serverRecords);
    }).catch(() => {});
  }, [migrated]);

  const latest = records.length > 0 ? records[records.length - 1] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">数据概览</h2>
        <p className="text-sm text-gray-400 mt-1">最近一次记录</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DataCard
          title="体重"
          value={latest?.weight ?? '--'}
          unit="kg"
          icon="⚖️"
          color="green"
        />
        <DataCard
          title="BMI"
          value={latest?.bmi ?? '--'}
          unit={latest?.bmi ? getBMICategory(latest.bmi) : undefined}
          icon="📏"
          color="blue"
        />
        <DataCard
          title="步数"
          value={latest?.steps?.toLocaleString() ?? '--'}
          icon="🚶"
          color="purple"
        />
        <DataCard
          title="睡眠"
          value={latest?.sleepHours ?? '--'}
          unit="h"
          icon="😴"
          color="orange"
        />
      </div>

      <h3 className="text-lg font-bold text-gray-800">趋势图</h3>

      <div className="space-y-4">
        <ChartCard title="步数趋势" color="#6366f1" unit="步" records={records} getValue={(r) => r.steps}>
          {(filtered) => <StepsChart records={filtered} />}
        </ChartCard>
        <ChartCard title="睡眠趋势" color="#f59e0b" unit="h" records={records} getValue={(r) => r.sleepHours}>
          {(filtered) => <SleepChart records={filtered} />}
        </ChartCard>
        <ChartCard title="血压趋势" color="#ef4444" unit="mmHg" records={records} getValue={(r) => r.systolic ?? r.diastolic ?? null}>
          {(filtered) => <BloodPressureChart records={filtered} />}
        </ChartCard>
        <ChartCard title="体重趋势" color="#10b981" unit="kg" records={records} getValue={(r) => r.weight}>
          {(filtered) => <WeightChart records={filtered} />}
        </ChartCard>
        <ChartCard title="心率趋势" color="#8b5cf6" unit="bpm" records={records} getValue={(r) => r.heartRate}>
          {(filtered) => <HeartRateChart records={filtered} />}
        </ChartCard>
      </div>
    </div>
  );
}
