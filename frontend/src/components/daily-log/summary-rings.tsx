'use client';

interface MetricCardProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

function MetricCard({ label, value, target, unit, color }: MetricCardProps) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-[var(--radius-md)] px-2 py-2"
      style={{
        background: `color-mix(in srgb, ${color} 7%, var(--color-surface))`,
        border: `1px solid color-mix(in srgb, ${color} 20%, var(--color-border))`,
      }}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="text-sm font-black leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-sm font-semibold text-[var(--color-text-muted)]">
        / {target > 0 ? target : '—'}
      </span>
      <span className="text-[9px] text-[var(--color-text-dim)]">{unit}</span>
    </div>
  );
}

interface SummaryRingsProps {
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  targetCalories?: number;
  targetProtein?: number;
  targetFiber?: number;
  targetCarbs?: number;
}

export function SummaryRings({
  calories, protein, fiber, carbs,
  targetCalories = 0, targetProtein = 0, targetFiber = 0, targetCarbs = 0,
}: SummaryRingsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <MetricCard label="Calories" value={calories} target={targetCalories} unit="kcal" color="var(--color-calories)" />
      <MetricCard label="Protein"  value={protein}  target={targetProtein}  unit="g"    color="var(--color-protein)" />
      <MetricCard label="Fiber"    value={fiber}    target={targetFiber}    unit="g"    color="var(--color-fiber)" />
      <MetricCard label="Carbs"    value={carbs}    target={targetCarbs}    unit="g"    color="var(--color-carbs)" />
    </div>
  );
}
