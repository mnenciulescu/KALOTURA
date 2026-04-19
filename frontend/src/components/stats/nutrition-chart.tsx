'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import type { DailyEntry } from '@/lib/api';

type MetricKey = 'calories' | 'protein' | 'fiber' | 'carbs';

const metricConfig: Record<MetricKey, { field: keyof DailyEntry; color: string; unit: string }> = {
  calories: { field: 'totalCalories', color: 'var(--color-calories)', unit: 'kcal' },
  protein:  { field: 'totalProtein',  color: 'var(--color-protein)',  unit: 'g' },
  fiber:    { field: 'totalFiber',    color: 'var(--color-fiber)',    unit: 'g' },
  carbs:    { field: 'totalCarbs',    color: 'var(--color-carbs)',    unit: 'g' },
};

interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
}

interface NutritionChartProps {
  entries: DailyEntry[];
  metric: MetricKey;
  target: number;
  from: string;
  to: string;
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NutritionChart({ entries, metric, target, from, to }: NutritionChartProps) {
  const cfg = metricConfig[metric];

  // Build a full date range with zeros for missing days
  const data: ChartDataPoint[] = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  const entryMap = new Map(entries.map((e) => [e.date, e]));

  while (cur <= end) {
    const iso = cur.toISOString().slice(0, 10);
    const entry = entryMap.get(iso);
    data.push({
      date: iso,
      label: shortDate(iso),
      value: entry ? (entry[cfg.field] as number) : 0,
    });
    cur.setDate(cur.getDate() + 1);
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: 12,
            color: 'var(--color-text)',
          }}
          formatter={(val: number) => [`${val} ${cfg.unit}`, metric.charAt(0).toUpperCase() + metric.slice(1)]}
          labelStyle={{ color: 'var(--color-text-muted)', marginBottom: 4 }}
          cursor={{ fill: 'var(--color-border)', opacity: 0.5 }}
        />
        {target > 0 && (
          <ReferenceLine
            y={target}
            stroke={cfg.color}
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: 'Target', fill: cfg.color, fontSize: 9, position: 'right' }}
          />
        )}
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.value > target * 1.2 ? 'var(--color-danger)' :
                    d.value > target        ? 'var(--color-warning)' :
                    cfg.color}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
