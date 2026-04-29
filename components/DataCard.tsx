import { ReactNode } from 'react';

interface DataCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange';
}

const colorMap: Record<DataCardProps['color'], { bg: string; text: string }> = {
  green:  { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  blue:   { bg: 'bg-sky-50',     text: 'text-sky-700' },
  purple: { bg: 'bg-violet-50',  text: 'text-violet-700' },
  orange: { bg: 'bg-amber-50',   text: 'text-amber-700' },
};

export default function DataCard({ title, value, unit, icon, color }: DataCardProps) {
  const scheme = colorMap[color];
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${scheme.bg} flex items-center justify-center text-xl`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-2xl font-bold ${scheme.text}`}>
          {value ?? '--'}
          {unit && <span className="text-sm font-normal ml-1 text-gray-400">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
