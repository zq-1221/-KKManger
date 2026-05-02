'use client';

import { useState, useEffect } from 'react';
import { HealthRecord } from '@/types/health';
import { calcBMI } from '@/lib/bmi';
import { generateId } from '@/lib/ai';

interface RecordFormProps {
  initialData?: HealthRecord;
  onSubmit: (record: HealthRecord) => void;
  onCancel?: () => void;
}

export default function RecordForm({ initialData, onSubmit, onCancel }: RecordFormProps) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [steps, setSteps] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [waterIntake, setWaterIntake] = useState('');

  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      setWeight(initialData.weight?.toString() ?? '');
      setHeight(initialData.height?.toString() ?? '');
      setSystolic(initialData.systolic?.toString() ?? '');
      setDiastolic(initialData.diastolic?.toString() ?? '');
      setHeartRate(initialData.heartRate?.toString() ?? '');
      setSteps(initialData.steps?.toString() ?? '');
      setSleepHours(initialData.sleepHours?.toString() ?? '');
      setWaterIntake(initialData.waterIntake?.toString() ?? '');
    }
  }, [initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const w = parseFloat(weight);
    const h = parseFloat(height);
    const bmi = w && h ? calcBMI(w, h) : undefined;

    const record: HealthRecord = {
      id: initialData?.id ?? generateId(),
      date: initialData?.date ?? new Date().toISOString(),
      weight: weight ? w : undefined,
      height: height ? h : undefined,
      bmi,
      systolic: systolic ? parseInt(systolic) : undefined,
      diastolic: diastolic ? parseInt(diastolic) : undefined,
      heartRate: heartRate ? parseInt(heartRate) : undefined,
      steps: steps ? parseInt(steps) : undefined,
      sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
      waterIntake: waterIntake ? parseInt(waterIntake) : undefined,
    };

    onSubmit(record);
  }

  const bmiPreview = (() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (w && h) return calcBMI(w, h);
    return null;
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="体重 (kg)" value={weight} onChange={setWeight} type="number" step="0.1" placeholder="例: 65" />
        <Field label="身高 (cm)" value={height} onChange={setHeight} type="number" placeholder="例: 170" />
        {bmiPreview !== null && (
          <div className="sm:col-span-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium">
            BMI: {bmiPreview}
          </div>
        )}
        <Field label="收缩压/高压 (mmHg)" value={systolic} onChange={setSystolic} type="number" placeholder="例: 120" />
        <Field label="舒张压/低压 (mmHg)" value={diastolic} onChange={setDiastolic} type="number" placeholder="例: 80" />
        {(systolic || diastolic) && (
          <p className="sm:col-span-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            建议同时填写收缩压和舒张压，单项数据无法生成趋势图
          </p>
        )}
        <Field label="心率 (bpm)" value={heartRate} onChange={setHeartRate} type="number" placeholder="例: 72" />
        <Field label="步数" value={steps} onChange={setSteps} type="number" placeholder="例: 8000" />
        <Field label="睡眠 (小时)" value={sleepHours} onChange={setSleepHours} type="number" step="0.1" placeholder="例: 7.5" />
        <Field label="饮水量 (ml)" value={waterIntake} onChange={setWaterIntake} type="number" placeholder="例: 2000" />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {isEdit ? '保存修改' : '提交记录'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow"
      />
    </label>
  );
}
