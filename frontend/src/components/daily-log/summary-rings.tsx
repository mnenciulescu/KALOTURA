'use client';

interface NutrientBarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  baseColor: string;
  isLimit?: boolean;
}

function NutrientBar({ label, value, target, unit, baseColor, isLimit = false }: NutrientBarProps) {
  const hasTarget = target > 0;
  const pct = hasTarget ? Math.min(value / target, 1) : 0;
  const isOver = hasTarget && value > target;
  const barColor = isLimit && isOver ? 'var(--color-danger)' : baseColor;

  return (
    <div className="flex items-center gap-2">
      <span className="w-[68px] shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="shrink-0 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-[3px] font-mono text-[10px] leading-none">
        <span className="font-bold text-[var(--color-text)]">{Math.round(value)}</span>
        <span className="text-[var(--color-text-dim)]">/</span>
        <span className="text-[var(--color-text-muted)]">{hasTarget ? target : '—'}</span>
        <span className="ml-0.5 text-[var(--color-text-dim)]">{unit}</span>
      </span>
      <div className="relative flex-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

interface SummaryRingsProps {
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  healthyFats: number;
  unhealthyFats: number;
  targetCalories?: number;
  targetProtein?: number;
  targetFiber?: number;
  targetCarbs?: number;
  targetHealthyFats?: number;
  targetUnhealthyFats?: number;
}

export function SummaryRings({
  calories, protein, fiber, carbs, healthyFats, unhealthyFats,
  targetCalories = 0, targetProtein = 0, targetFiber = 0, targetCarbs = 0,
  targetHealthyFats = 0, targetUnhealthyFats = 0,
}: SummaryRingsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <NutrientBar label="Calories"  value={calories}      target={targetCalories}      unit="kcal" baseColor="var(--color-calories)"       isLimit />
      <NutrientBar label="Protein"   value={protein}       target={targetProtein}       unit="g"    baseColor="var(--color-success)" />
      <NutrientBar label="Fiber"     value={fiber}         target={targetFiber}         unit="g"    baseColor="var(--color-success)" />
      <NutrientBar label="Carbs"     value={carbs}         target={targetCarbs}         unit="g"    baseColor="var(--color-carbs)"           isLimit />
      <NutrientBar label="H. Fats"   value={healthyFats}   target={targetHealthyFats}   unit="g"    baseColor="var(--color-success)" />
      <NutrientBar label="U. Fats"   value={unhealthyFats} target={targetUnhealthyFats} unit="g"    baseColor="var(--color-unhealthy-fats)"  isLimit />
    </div>
  );
}
