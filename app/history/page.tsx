'use client';

import { useState, useEffect } from 'react';
import { HealthRecord } from '@/types/health';
import { getRecords, deleteRecord, updateRecord } from '@/lib/storage';
import RecordForm from '@/components/RecordForm';

export default function HistoryPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(getRecords());
  }, []);

  function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    deleteRecord(deleteConfirmId);
    setRecords(getRecords());
    setDeleteConfirmId(null);
  }

  function handleUpdate(record: HealthRecord) {
    updateRecord(record.id, record);
    setRecords(getRecords());
    setEditingId(null);
  }

  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">历史记录</h2>
        <p className="text-sm text-gray-400 mt-1">共 {records.length} 条记录</p>
      </div>

      {sorted.length === 0 && (
        <div className="text-center text-gray-400 py-16 text-sm">
          暂无记录，先去录入数据吧 📝
        </div>
      )}

      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-6">
              此操作不可撤销，确定要删除这条记录吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((r) => (
          <div key={r.id}>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">
                  {new Date(r.date).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                    className="text-xs text-sky-500 hover:text-sky-600 font-medium px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors"
                  >
                    {editingId === r.id ? '收起' : '编辑'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(r.id)}
                    className="text-xs text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-sm">
                {r.weight && <Badge label="体重" value={`${r.weight} kg`} />}
                {r.bmi && <Badge label="BMI" value={String(r.bmi)} />}
                {r.systolic && r.diastolic && (
                  <Badge label="血压" value={`${r.systolic}/${r.diastolic}`} />
                )}
                {r.heartRate && <Badge label="心率" value={`${r.heartRate} bpm`} />}
                {r.steps && <Badge label="步数" value={r.steps.toLocaleString()} />}
                {r.sleepHours && <Badge label="睡眠" value={`${r.sleepHours} h`} />}
                {r.waterIntake && <Badge label="饮水" value={`${r.waterIntake} ml`} />}
              </div>
            </div>

            {editingId === r.id && (
              <div className="bg-white rounded-2xl shadow-md p-6 mt-3 border border-emerald-100">
                <p className="text-sm font-medium text-gray-600 mb-4">编辑记录</p>
                <RecordForm
                  initialData={r}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{value}</p>
    </div>
  );
}
