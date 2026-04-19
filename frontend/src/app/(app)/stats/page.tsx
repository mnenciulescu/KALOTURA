'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { NutritionChart } from '@/components/stats/nutrition-chart';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { getEntries } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { addDays, subDays, getRangeLabel, isToday } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Metric = 'calories' | 'protein' | 'fiber' | 'carbs';
type Range = 7 | 30;

const METRICS: Array<{ key: Metric; label: string }> = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein',  label: 'Protein' },
  { key: 'fiber',    label: 'Fiber' },
  { key: 'carbs',    label: 'Carbs' },
];

const metricTargetKey: Record<Metric, 'targetCalories' | 'targetProtein' | 'targetFiber' | 'targetCarbs'> = {
  calories: 'targetCalories',
  protein:  'targetProtein',
  fiber:    'targetFiber',
  carbs:    'targetCarbs',
};

const metricValueKey: Record<Metric, 'totalCalories' | 'totalProtein' | 'totalFiber' | 'totalCarbs'> = {
  calories: 'totalCalories',
  protein:  'totalProtein',
  fiber:    'totalFiber',
  carbs:    'totalCarbs',
};

export default function StatsPage() {
  const { profile } = useAppStore();
  const [metric, setMetric] = useState<Metric>('calories');
  const [range, setRange] = useState<Range>(7);
  const [windowEnd, setWindowEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const windowStart = useMemo(() => subDays(windowEnd, range - 1), [windowEnd, range]);
  const canGoForward = windowEnd < new Date().toISOString().slice(0, 10);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries', windowStart, windowEnd],
    queryFn: () => getEntries(windowStart, windowEnd),
    staleTime: 60_000,
  });

  const target = profile?.[metricTargetKey[metric]] ?? 0;
  const vKey = metricValueKey[metric];

  const { avg, onTarget, overTarget } = useMemo(() => {
    const withData = entries.filter((e) => e[vKey] > 0);
    if (!withData.length) return { avg: 0, onTarget: 0, overTarget: 0 };
    const sum = withData.reduce((a, e) => a + (e[vKey] as number), 0);
    return {
      avg: Math.round(sum / withData.length),
      onTarget: withData.filter((e) => (e[vKey] as number) <= target).length,
      overTarget: withData.filter((e) => (e[vKey] as number) > target).length,
    };
  }, [entries, vKey, target]);

  function goBack() {
    setWindowEnd(subDays(windowStart, 1));
  }

  function goForward() {
    const newEnd = addDays(windowEnd, range);
    const today = new Date().toISOString().slice(0, 10);
    setWindowEnd(newEnd > today ? today : newEnd);
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <h1 className="text-base font-bold text-[var(--color-text)]">Statistics</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Metric tabs */}
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-1">
          {METRICS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={cn(
                'flex-1 py-2 text-xs font-semibold rounded-[var(--radius-sm)] transition-colors duration-150',
                metric === key
                  ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Range toggle */}
        <div className="flex gap-2">
          {([7, 30] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium rounded-[var(--radius-sm)] border transition-colors duration-150',
                range === r
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 text-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]',
              )}
            >
              {r} Days
            </button>
          ))}
        </div>

        {/* Chart */}
        <Card>
          {isLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : (
            <NutritionChart
              entries={entries}
              metric={metric}
              target={target}
              from={windowStart}
              to={windowEnd}
            />
          )}
        </Card>

        {/* Timeline navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ChevronLeft size={16} />
            Prev
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">{getRangeLabel(windowStart, windowEnd)}</span>
          <button
            disabled={!canGoForward}
            onClick={goForward}
            className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-30"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Summary row */}
        {!isLoading && (
          <Card>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm font-bold text-[var(--color-text)]">
                  {avg}{metric === 'calories' ? '' : 'g'}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Daily avg</div>
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--color-primary)]">{onTarget}</div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">On target</div>
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--color-warning)]">{overTarget}</div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Over target</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
